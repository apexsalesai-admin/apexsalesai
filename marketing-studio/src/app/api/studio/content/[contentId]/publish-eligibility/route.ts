/**
 * Publish Eligibility API
 *
 * GET /api/studio/content/[contentId]/publish-eligibility
 *
 * Returns whether a content item is eligible to be published,
 * based on having a Final version with a COMPLETED render.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { contentId } = await params

    // Check if this is a VIDEO content type
    const content = await prisma.scheduledContent.findUnique({
      where: { id: contentId },
      select: { contentType: true },
    })

    if (!content) {
      return NextResponse.json({ success: false, error: 'Content not found' }, { status: 404 })
    }

    // Non-video content is always eligible (no render required)
    if (content.contentType !== 'VIDEO') {
      return NextResponse.json({
        success: true,
        data: { eligible: true, reason: 'Non-video content does not require rendering' },
      })
    }

    // Find the final version
    const finalVersion = await prisma.studioContentVersion.findFirst({
      where: { contentId, isFinal: true },
      include: {
        videoJob: {
          select: {
            id: true,
            status: true,
            progress: true,
            outputAssets: {
              where: { status: 'READY' },
              select: { publicUrl: true },
              take: 1,
            },
          },
        },
      },
    })

    if (!finalVersion) {
      return NextResponse.json({
        success: true,
        data: { eligible: false, reason: 'No final version set' },
      })
    }

    if (!finalVersion.videoJob) {
      return NextResponse.json({
        success: true,
        data: { eligible: false, reason: 'Final version has not been rendered', finalVersionId: finalVersion.id },
      })
    }

    const jobStatus = finalVersion.videoJob.status

    if (jobStatus === 'COMPLETED') {
      const videoUrl = finalVersion.videoJob.outputAssets[0]?.publicUrl || null
      return NextResponse.json({
        success: true,
        data: { eligible: true, finalVersionId: finalVersion.id, videoUrl },
      })
    }

    if (jobStatus === 'PROCESSING' || jobStatus === 'QUEUED') {
      return NextResponse.json({
        success: true,
        data: {
          eligible: false,
          reason: 'Video still rendering',
          progress: finalVersion.videoJob.progress,
          finalVersionId: finalVersion.id,
        },
      })
    }

    if (jobStatus === 'FAILED') {
      return NextResponse.json({
        success: true,
        data: { eligible: false, reason: 'Video render failed', finalVersionId: finalVersion.id },
      })
    }

    return NextResponse.json({
      success: true,
      data: { eligible: false, reason: 'Unknown render state' },
    })
  } catch (error) {
    console.error('[API:publish-eligibility] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check publish eligibility' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
