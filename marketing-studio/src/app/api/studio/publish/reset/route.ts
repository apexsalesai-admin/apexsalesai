import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, withRetry } from '@/lib/db'

/**
 * POST /api/studio/publish/reset
 * Resets a stuck "PUBLISHING" content back to DRAFT.
 * Body: { contentId: string, force?: boolean }
 *
 * By default, waits 5 minutes before allowing reset (publish may still be in progress).
 * Pass force: true to reset immediately.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { contentId, force } = await request.json()
    if (!contentId) {
      return NextResponse.json({ success: false, error: 'contentId is required' }, { status: 400 })
    }

    const content = await withRetry(() => prisma.scheduledContent.findUnique({
      where: { id: contentId },
      select: { id: true, status: true, createdById: true, updatedAt: true },
    }))

    if (!content) {
      return NextResponse.json({ success: false, error: 'Content not found' }, { status: 404 })
    }

    // P25-B-FIX4: Allow reset if createdById is null (legacy content without owner)
    if (content.createdById && content.createdById !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    if (content.status !== 'PUBLISHING' && content.status !== 'FAILED') {
      return NextResponse.json({
        success: false,
        error: `Content is not stuck — current status is ${content.status}. Only PUBLISHING or FAILED content can be reset.`,
      }, { status: 400 })
    }

    // Check if stuck for > 5 minutes (unless force=true)
    if (!force) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      if (content.updatedAt > fiveMinutesAgo) {
        const waitSeconds = Math.ceil((content.updatedAt.getTime() + 5 * 60 * 1000 - Date.now()) / 1000)
        return NextResponse.json({
          success: false,
          error: `Publish may still be in progress. Wait ${waitSeconds}s or retry with force.`,
          retryAfterSeconds: waitSeconds,
        }, { status: 400 })
      }
    }

    const updated = await withRetry(() => prisma.scheduledContent.update({
      where: { id: contentId },
      data: { status: 'DRAFT' },
    }))

    console.log('[API:publish/reset] Reset content to DRAFT', { contentId, force: !!force })

    return NextResponse.json({
      success: true,
      data: updated,
      previousStatus: 'PUBLISHING',
      newStatus: 'DRAFT',
    })
  } catch (error) {
    console.error('[API:publish/reset] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
