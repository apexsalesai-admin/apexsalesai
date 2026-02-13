/**
 * Provider Key Test API (P21)
 *
 * POST /api/studio/integrations/[provider]/test — Test connection
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { IntegrationManager } from '@/lib/integrations/integration-manager'

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
    const workspace = await getOrCreateWorkspace(session.user.id)

    const result = await IntegrationManager.test(provider, workspace.id)

    return NextResponse.json({
      success: result.success,
      testResult: result.success ? 'success' : 'failed',
      testMessage: result.error || (result.success ? 'Connection successful' : 'Connection failed'),
      latency: result.latency,
    })
  } catch (error) {
    console.error('[API:integrations:test] POST error:', error)
    return NextResponse.json({ success: false, error: 'Test failed' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
