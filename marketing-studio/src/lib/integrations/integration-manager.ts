/**
 * Universal Integration Manager (P21)
 *
 * Single entry point for all integration operations:
 * resolveKey, connect, test, disconnect, getAll, get.
 *
 * Key resolution priority:
 *   1. User's DB key (workspace-scoped, encrypted)
 *   2. Platform env key (admin-configured)
 *   3. null
 */

import { prisma } from '@/lib/db'
import { safeEncrypt, safeDecrypt } from '@/lib/encryption'
import { INTEGRATION_REGISTRY, type IntegrationStatus } from './registry'

// ─── Test Handlers ──────────────────────────────────────────

const TEST_HANDLERS: Record<string, (apiKey: string) => Promise<boolean>> = {
  anthropic: async (key) => {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 5,
        messages: [{ role: 'user', content: 'Say hi' }],
      }),
    })
    return r.ok
  },
  openai: async (key) => {
    const r = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    })
    return r.ok
  },
  gemini: async (key) => {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
    return r.ok
  },
  brave: async (key) => {
    const r = await fetch('https://api.search.brave.com/res/v1/web/search?q=test&count=1', {
      headers: { 'X-Subscription-Token': key },
    })
    return r.ok
  },
  runway: async (key) => {
    const r = await fetch('https://api.dev.runwayml.com/v1/organization', {
      headers: {
        Authorization: `Bearer ${key}`,
        'X-Runway-Version': '2024-11-06',
      },
    })
    return r.ok
  },
  heygen: async (key) => {
    const r = await fetch('https://api.heygen.com/v2/user/remaining_quota', {
      headers: { 'X-Api-Key': key },
    })
    return r.ok
  },
  elevenlabs: async (key) => {
    const r = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': key },
    })
    return r.ok
  },
  sora: async (key) => {
    // Sora uses OpenAI API key — test with models endpoint
    const r = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    })
    return r.ok
  },
  youtube: async (key) => {
    // YouTube uses OAuth tokens
    const r = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: { Authorization: `Bearer ${key}` },
    })
    return r.ok
  },
}

// ─── Manager ────────────────────────────────────────────────

export class IntegrationManager {
  /**
   * Resolve API key for any provider.
   * Priority: 1. User's DB key  2. Platform env key  3. null
   */
  static async resolveKey(
    provider: string,
    workspaceId: string,
  ): Promise<{ key: string; source: 'user' | 'platform' } | null> {
    const def = INTEGRATION_REGISTRY.find(d => d.provider === provider)
    if (!def) return null

    // 1. Check user's stored key in database
    if (def.dbType) {
      try {
        const integration = await prisma.studioIntegration.findUnique({
          where: { workspaceId_type: { workspaceId, type: def.dbType as never } },
          select: { accessTokenEncrypted: true, status: true },
        })

        if (integration?.status === 'CONNECTED' && integration.accessTokenEncrypted) {
          const apiKey = safeDecrypt(integration.accessTokenEncrypted)
          if (apiKey) {
            return { key: apiKey, source: 'user' }
          }
        }
      } catch {
        // DB error — fall through to env
      }
    }

    // 2. Fall back to platform env var
    const envKey = process.env[def.envVar]
    if (envKey) {
      return { key: envKey, source: 'platform' }
    }

    // Also check alternate env var names
    if (provider === 'runway') {
      const alt = process.env['RUNWAY_API_KEY']
      if (alt) return { key: alt, source: 'platform' }
    }

    return null
  }

  /**
   * Connect a provider with a user-supplied key.
   */
  static async connect(
    provider: string,
    workspaceId: string,
    apiKey: string,
    userId: string,
  ): Promise<{ success: boolean; error?: string }> {
    const def = INTEGRATION_REGISTRY.find(d => d.provider === provider)
    if (!def) return { success: false, error: `Unknown provider: ${provider}` }
    if (!def.dbType) return { success: false, error: `${provider} does not support BYOK storage` }

    const encrypted = safeEncrypt(apiKey)
    if (!encrypted) return { success: false, error: 'Encryption failed' }

    // Test the connection first
    const testResult = await this.testWithKey(provider, apiKey)

    await prisma.studioIntegration.upsert({
      where: { workspaceId_type: { workspaceId, type: def.dbType as never } },
      create: {
        workspaceId,
        type: def.dbType as never,
        status: testResult ? 'CONNECTED' : 'ERROR',
        accessTokenEncrypted: encrypted,
        connectedBy: userId,
        lastTestedAt: new Date(),
        lastTestResult: testResult ? 'success' : 'invalid_key',
      },
      update: {
        status: testResult ? 'CONNECTED' : 'ERROR',
        accessTokenEncrypted: encrypted,
        connectedBy: userId,
        revokedAt: null,
        revokedBy: null,
        revokeReason: null,
        errorCount: 0,
        lastTestedAt: new Date(),
        lastTestResult: testResult ? 'success' : 'invalid_key',
      },
    })

    console.log(`[INTEGRATION:CONNECT] provider=${provider} workspace=${workspaceId} result=${testResult ? 'success' : 'failed'}`)

    return { success: testResult }
  }

  /**
   * Test a provider connection using stored or env key.
   */
  static async test(
    provider: string,
    workspaceId: string,
  ): Promise<{ success: boolean; latency: number; error?: string }> {
    const resolved = await this.resolveKey(provider, workspaceId)
    if (!resolved) return { success: false, latency: 0, error: 'No API key configured' }

    const start = Date.now()
    const success = await this.testWithKey(provider, resolved.key)
    const latency = Date.now() - start

    console.log(`[INTEGRATION:TEST] provider=${provider} result=${success ? 'success' : 'failed'} latency=${latency}ms source=${resolved.source}`)

    return { success, latency }
  }

  /**
   * Disconnect a provider (remove key from DB).
   */
  static async disconnect(
    provider: string,
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const def = INTEGRATION_REGISTRY.find(d => d.provider === provider)
    if (!def?.dbType) return

    try {
      await prisma.studioIntegration.updateMany({
        where: { workspaceId, type: def.dbType as never },
        data: {
          status: 'DISCONNECTED',
          accessTokenEncrypted: null,
          refreshTokenEncrypted: null,
          revokedBy: userId,
          revokedAt: new Date(),
          revokeReason: 'User disconnected via settings',
        },
      })
    } catch {
      // If no record exists, that's fine
    }

    console.log(`[INTEGRATION:DISCONNECT] provider=${provider} workspace=${workspaceId}`)
  }

  /**
   * Get status for all providers in a workspace.
   */
  static async getAll(workspaceId: string): Promise<IntegrationStatus[]> {
    // Load all DB records for this workspace
    const dbRecords = await prisma.studioIntegration.findMany({
      where: { workspaceId },
      select: {
        type: true,
        status: true,
        accessTokenEncrypted: true,
        lastTestedAt: true,
        lastTestResult: true,
      },
    })

    // Build a map by DB type
    const dbMap = new Map(dbRecords.map(r => [String(r.type), r]))

    return INTEGRATION_REGISTRY.map(def => {
      const dbRecord = def.dbType ? dbMap.get(def.dbType) : null

      let status: IntegrationStatus['status'] = 'disconnected'
      let source: IntegrationStatus['source'] = 'none'
      let keyLastFour: string | null = null

      // 1. Check DB record
      if (dbRecord?.status === 'CONNECTED' && dbRecord.accessTokenEncrypted) {
        status = 'connected'
        source = 'database'
        keyLastFour = `••••${dbRecord.accessTokenEncrypted.slice(-4)}`
      } else if (dbRecord?.status === 'ERROR') {
        status = 'error'
        source = 'database'
      }

      // 2. If not DB-connected, check env var
      if (status === 'disconnected') {
        const envKey = process.env[def.envVar]
        // Also check alternate env names
        const altKey = def.provider === 'runway' ? process.env['RUNWAY_API_KEY'] : undefined
        if (envKey || altKey) {
          status = 'connected_env'
          source = 'env'
        }
      }

      console.log(`[INTEGRATION:STATUS] provider=${def.provider} status=${status} source=${source}`)

      return {
        provider: def.provider,
        displayName: def.displayName,
        category: def.category,
        status,
        source,
        keyLastFour,
        lastTestedAt: dbRecord?.lastTestedAt?.toISOString() ?? null,
        description: def.description,
        envVar: def.envVar,
        getApiKeyUrl: def.getApiKeyUrl,
        capabilities: def.capabilities,
        tier: def.tier,
        oauthProvider: def.oauthProvider,
      }
    })
  }

  /**
   * Test a key against a provider's API.
   */
  private static async testWithKey(provider: string, apiKey: string): Promise<boolean> {
    const handler = TEST_HANDLERS[provider]
    if (!handler) return false

    try {
      return await handler(apiKey)
    } catch {
      return false
    }
  }
}
