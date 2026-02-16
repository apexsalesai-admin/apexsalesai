import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * POST /api/studio/publish/reset
 * Resets a stuck "PUBLISHING" content back to DRAFT.
 * Body: { contentId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { contentId } = await request.json()
    if (!contentId) {
      return NextResponse.json({ success: false, error: 'contentId is required' }, { status: 400 })
    }

    const content = await prisma.scheduledContent.findUnique({
      where: { id: contentId },
      select: { id: true, status: true, createdById: true },
    })

    if (!content) {
      return NextResponse.json({ success: false, error: 'Content not found' }, { status: 404 })
    }

    if (content.createdById !== session.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 })
    }

    if (content.status !== 'PUBLISHING') {
      return NextResponse.json({
        success: false,
        error: `Content is not stuck — current status is ${content.status}`,
      }, { status: 400 })
    }

    const updated = await prisma.scheduledContent.update({
      where: { id: contentId },
      data: { status: 'DRAFT' },
    })

    console.log('[API:publish/reset] Reset content to DRAFT', { contentId })

    return NextResponse.json({ success: true, data: updated })
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
