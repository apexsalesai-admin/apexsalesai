/**
 * Provider Key Test API
 *
 * POST /api/studio/integrations/[provider]/test — Test key validity
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { resolveProviderKey } from '@/lib/integrations/resolveProviderKey'
import type { ProviderName } from '@/lib/integrations/resolveProviderKey'

/** Test endpoints per provider */
const TEST_CONFIG: Record<string, {
  url: string
  headers: (key: string) => Record<string, string>
}> = {
  runway: {
    url: 'https://api.dev.runwayml.com/v1/tasks',
    headers: (key) => ({
      'Authorization': `Bearer ${key}`,
      'X-Runway-Version': '2024-11-06',
    }),
  },
  sora: {
    url: 'https://api.openai.com/v1/models/gpt-4o-mini',
    headers: (key) => ({
      'Authorization': `Bearer ${key}`,
    }),
  },
  heygen: {
    url: 'https://api.heygen.com/v1/user/remaining_quota',
    headers: (key) => ({
      'X-Api-Key': key,
    }),
  },
}

const PROVIDER_TO_TYPE: Record<string, string> = {
  runway: 'RUNWAY',
  sora: 'OPENAI',
  heygen: 'HEYGEN',
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { provider } = await params
    const testConfig = TEST_CONFIG[provider]
    if (!testConfig) {
      return NextResponse.json({ success: false, error: `No test available for: ${provider}` }, { status: 400 })
    }

    const workspace = await getOrCreateWorkspace(session.user.id)

    // Resolve the key (from DB or env)
    const keyResult = await resolveProviderKey(workspace.id, provider as ProviderName)
    if (!keyResult.apiKey) {
      return NextResponse.json({
        success: false,
        error: `No API key configured for ${provider}`,
        testResult: 'no_key',
      }, { status: 400 })
    }

    console.log('[INTEGRATIONS:TEST]', { provider, workspaceId: workspace.id, keySource: keyResult.source })

    // Make test request
    let testResult: string
    let testMessage: string

    try {
      const response = await fetch(testConfig.url, {
        method: 'GET',
        headers: testConfig.headers(keyResult.apiKey),
      })

      if (response.ok || response.status === 200) {
        testResult = 'success'
        testMessage = 'API key is valid'
      } else if (response.status === 401 || response.status === 403) {
        testResult = 'invalid_key'
        testMessage = 'API key is invalid or expired'
      } else if (response.status === 429) {
        testResult = 'rate_limited'
        testMessage = 'Rate limited — key is valid but provider is throttling'
      } else {
        testResult = 'success'
        testMessage = `Provider responded with status ${response.status} — key accepted`
      }
    } catch (fetchError) {
      testResult = 'network_error'
      testMessage = `Could not reach ${provider} API: ${fetchError instanceof Error ? fetchError.message : 'unknown'}`
    }

    // Update integration with test result
    const intType = PROVIDER_TO_TYPE[provider]
    if (intType) {
      try {
        await prisma.studioIntegration.updateMany({
          where: { workspaceId: workspace.id, type: intType as never },
          data: {
            lastTestedAt: new Date(),
            lastTestResult: testResult,
          },
        })
      } catch {
        // Don't fail the test if DB update fails
      }
    }

    console.log('[INTEGRATIONS:TEST:RESULT]', { provider, testResult, testMessage })

    return NextResponse.json({
      success: testResult === 'success' || testResult === 'rate_limited',
      testResult,
      testMessage,
    })
  } catch (error) {
    console.error('[API:integrations:test] POST error:', error)
    return NextResponse.json({ success: false, error: 'Test failed' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
