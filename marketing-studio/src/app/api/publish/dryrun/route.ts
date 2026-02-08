/**
 * Dry-Run Publish API
 *
 * Validates readiness, integration status, and content format
 * WITHOUT calling any external platform APIs.
 *
 * POST /api/publish/dryrun
 * Body: { platform, content, workspaceId? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPublishRequirements } from '@/lib/readiness'
import { checkIntegrationHealth } from '@/lib/integrations/tokenHealth'
import {
  getConnectorConfig,
  validateContent,
} from '@/lib/integrations/connectors/baseConnector'

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
}

const SUPPORTED_PLATFORMS = ['linkedin', 'youtube', 'reddit'] as const
type Platform = (typeof SUPPORTED_PLATFORMS)[number]

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: NO_CACHE_HEADERS }
      )
    }

    const body = await request.json()
    const { platform, content, workspaceId } = body as {
      platform?: string
      content?: string
      workspaceId?: string
    }

    // Validate inputs
    if (!platform || !content) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: platform, content',
        },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const normalizedPlatform = platform.toLowerCase() as Platform
    if (!SUPPORTED_PLATFORMS.includes(normalizedPlatform)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported platform: ${platform}. Supported: ${SUPPORTED_PLATFORMS.join(', ')}`,
        },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    console.log('[CONNECTOR] Dry run initiated', { platform: normalizedPlatform, contentLength: content.length })

    // 1. Validate system readiness
    const requirements = await getPublishRequirements({ workspaceId })

    // 2. Check integration token health
    const integrations = await checkIntegrationHealth(workspaceId)
    const platformType = normalizedPlatform.toUpperCase()
    const matchingIntegration = integrations.find(
      (i) => i.platform === platformType || i.platform === 'FACEBOOK' && normalizedPlatform === 'reddit'
    )
    const oauthValid = matchingIntegration?.status === 'CONNECTED'

    // 3. Validate content against platform rules
    const connectorConfig = getConnectorConfig(normalizedPlatform)
    const contentValidation = validateContent(normalizedPlatform, content)

    console.log('[CONNECTOR] Token validation passed:', oauthValid)

    // 4. Build simulated result — no external API calls
    const result = {
      success: true,
      dryRun: true,
      platform: normalizedPlatform,
      systemReady: requirements.canPublish,
      missingRequirements: requirements.missing,
      estimatedReach: connectorConfig.estimatedReach,
      validation: {
        characterLimitOk: contentValidation.characterLimitOk,
        formatOk: contentValidation.formatOk,
        oauthValid,
      },
      contentAnalysis: {
        characterCount: content.length,
        characterLimit: connectorConfig.characterLimit,
        remainingCharacters: Math.max(0, connectorConfig.characterLimit - content.length),
      },
      integrationStatus: matchingIntegration
        ? { status: matchingIntegration.status, message: matchingIntegration.message }
        : { status: 'NOT_FOUND', message: 'No integration configured for this platform' },
      timestamp: new Date().toISOString(),
    }

    console.log('[CONNECTOR] Dry run completed', {
      platform: normalizedPlatform,
      systemReady: result.systemReady,
      oauthValid,
      characterLimitOk: contentValidation.characterLimitOk,
    })

    return NextResponse.json(result, { headers: NO_CACHE_HEADERS })
  } catch (error) {
    console.error('[API:Publish:DryRun] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
