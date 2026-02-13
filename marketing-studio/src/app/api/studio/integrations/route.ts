/**
 * Provider Integrations API (P21: Universal Framework)
 *
 * GET  /api/studio/integrations — List all providers with accurate status
 * POST /api/studio/integrations — Connect a provider (encrypt + test + store)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { IntegrationManager } from '@/lib/integrations/integration-manager'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getOrCreateWorkspace(session.user.id)
    const integrations = await IntegrationManager.getAll(workspace.id)

    return NextResponse.json({ success: true, data: integrations })
  } catch (error) {
    console.error('[API:integrations] GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch integrations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { provider, apiKey } = body as { provider: string; apiKey: string }

    if (!provider || !apiKey) {
      return NextResponse.json({ success: false, error: 'provider and apiKey are required' }, { status: 400 })
    }

    const workspace = await getOrCreateWorkspace(session.user.id)
    const result = await IntegrationManager.connect(provider, workspace.id, apiKey, session.user.id)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || 'Connection failed' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: `${provider} connected successfully` })
  } catch (error) {
    console.error('[API:integrations] POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to connect provider' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
