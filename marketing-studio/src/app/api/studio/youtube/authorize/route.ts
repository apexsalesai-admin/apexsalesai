/**
 * YouTube OAuth Authorization Redirect (P21)
 *
 * GET /api/studio/youtube/authorize — Redirects to Google OAuth consent screen
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { getYouTubeAuthUrl } from '@/lib/integrations/youtube-oauth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getOrCreateWorkspace(session.user.id)

    // Encode workspace + user info in state parameter for callback
    const state = Buffer.from(
      JSON.stringify({ workspaceId: workspace.id, userId: session.user.id })
    ).toString('base64url')

    const authUrl = getYouTubeAuthUrl(state)

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('[API:youtube:authorize] Error:', error)
    return NextResponse.json({ error: 'Failed to initiate OAuth' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
