/**
 * Provider-specific Integration API
 *
 * DELETE /api/studio/integrations/[provider] — Disconnect (delete key)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOrCreateWorkspace } from '@/lib/workspace'

const PROVIDER_TO_TYPE: Record<string, string> = {
  runway: 'RUNWAY',
  sora: 'OPENAI',
  heygen: 'HEYGEN',
}

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
    const intType = PROVIDER_TO_TYPE[provider]
    if (!intType) {
      return NextResponse.json({ success: false, error: `Unknown provider: ${provider}` }, { status: 400 })
    }

    const workspace = await getOrCreateWorkspace(session.user.id)

    // Find existing integration
    const integration = await prisma.studioIntegration.findUnique({
      where: { workspaceId_type: { workspaceId: workspace.id, type: intType as never } },
    })

    if (!integration) {
      return NextResponse.json({ success: false, error: 'Integration not found' }, { status: 404 })
    }

    // Disconnect: clear encrypted key and mark as disconnected
    await prisma.studioIntegration.update({
      where: { id: integration.id },
      data: {
        status: 'DISCONNECTED',
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
        revokedBy: session.user.id,
        revokedAt: new Date(),
        revokeReason: 'User disconnected via settings',
      },
    })

    console.log('[INTEGRATIONS:DISCONNECT]', { provider, workspaceId: workspace.id, userId: session.user.id })

    return NextResponse.json({ success: true, message: `${provider} disconnected` })
  } catch (error) {
    console.error('[API:integrations:provider] DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Failed to disconnect provider' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
