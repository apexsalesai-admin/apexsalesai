/**
 * Provider-specific Integration API (P21)
 *
 * DELETE /api/studio/integrations/[provider] — Disconnect provider
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { IntegrationManager } from '@/lib/integrations/integration-manager'

export async function DELETE(
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

    await IntegrationManager.disconnect(provider, workspace.id, session.user.id)

    return NextResponse.json({ success: true, message: `${provider} disconnected` })
  } catch (error) {
    console.error('[API:integrations:provider] DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Failed to disconnect provider' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
