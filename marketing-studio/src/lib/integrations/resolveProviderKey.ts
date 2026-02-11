/**
 * Centralized Provider Key Resolution
 *
 * Priority:
 *   1) StudioIntegration (workspace-scoped, encrypted)
 *   2) env var fallback (development only — disabled in production)
 *
 * In production, workspace integrations are mandatory for multi-tenant isolation.
 */

import { prisma } from '@/lib/db'
import { safeDecrypt } from '@/lib/encryption'

export type ProviderName = 'runway' | 'elevenlabs' | 'heygen' | 'openai' | 'anthropic'

const PROVIDER_TO_INTEGRATION_TYPE: Record<ProviderName, string> = {
  runway: 'RUNWAY',
  elevenlabs: 'ELEVENLABS',
  heygen: 'HEYGEN',
  openai: 'OPENAI',
  anthropic: 'ANTHROPIC',
}

const PROVIDER_TO_ENV_VAR: Record<ProviderName, string> = {
  runway: 'RUNWAY_API_KEY',
  elevenlabs: 'ELEVENLABS_API_KEY',
  heygen: 'HEYGEN_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
}

export interface KeyResolution {
  apiKey: string | null
  source: 'integrations' | 'env' | 'none'
}

/**
 * Resolve provider API key for a workspace.
 *
 * 1. Check StudioIntegration table (workspace-scoped, encrypted)
 * 2. In development: fall back to env var
 *    In production: no fallback — integrations table is the only source
 */
export async function resolveProviderKey(
  workspaceId: string,
  provider: ProviderName,
): Promise<KeyResolution> {
  const integrationType = PROVIDER_TO_INTEGRATION_TYPE[provider]
  const isDev = process.env.NODE_ENV === 'development'

  // 1. Try workspace integration (always checked first)
  try {
    const integration = await prisma.studioIntegration.findUnique({
      where: { workspaceId_type: { workspaceId, type: integrationType as never } },
      select: { accessTokenEncrypted: true, status: true },
    })

    if (integration?.status === 'CONNECTED' && integration.accessTokenEncrypted) {
      const apiKey = safeDecrypt(integration.accessTokenEncrypted)
      if (apiKey) {
        console.log('[KEYS]', { workspaceId, provider, source: 'integrations' })
        return { apiKey, source: 'integrations' }
      }
    }
  } catch (err) {
    console.warn('[KEYS:DB_ERROR]', { workspaceId, provider, error: err instanceof Error ? err.message : 'unknown' })
  }

  // 2. Env var fallback — development only
  if (isDev) {
    const envVar = PROVIDER_TO_ENV_VAR[provider]
    const envKey = process.env[envVar]
    if (envKey) {
      console.log('[KEYS]', { workspaceId, provider, source: 'env' })
      return { apiKey: envKey, source: 'env' }
    }
  }

  console.warn('[KEYS]', { workspaceId, provider, source: 'none' })
  return { apiKey: null, source: 'none' }
}
