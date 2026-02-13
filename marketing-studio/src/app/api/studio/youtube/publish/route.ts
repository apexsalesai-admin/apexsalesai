/**
 * YouTube Publish API (P21)
 *
 * POST /api/studio/youtube/publish — Upload a video to YouTube
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { uploadToYouTube } from '@/lib/integrations/youtube-upload'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, tags, privacyStatus, videoUrl } = body as {
      title: string
      description: string
      tags?: string[]
      privacyStatus?: 'public' | 'unlisted' | 'private'
      videoUrl: string
    }

    if (!title || !videoUrl) {
      return NextResponse.json(
        { success: false, error: 'title and videoUrl are required' },
        { status: 400 }
      )
    }

    const workspace = await getOrCreateWorkspace(session.user.id)

    const result = await uploadToYouTube({
      workspaceId: workspace.id,
      title,
      description: description || '',
      tags,
      privacyStatus,
      videoUrl,
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        videoId: result.videoId,
        permalink: result.permalink,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Publish failed'
    console.error('[API:youtube:publish] Error:', message)

    if (message.includes('not connected')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 })
    }

    return NextResponse.json({ success: false, error: 'Publish failed' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
