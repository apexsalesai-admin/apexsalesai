/**
 * Render Status API
 *
 * GET /api/studio/render/[jobId]/status — Poll render job status
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { jobId } = await params

    const job = await prisma.studioVideoJob.findUnique({
      where: { id: jobId },
      include: {
        outputAssets: {
          select: {
            id: true,
            publicUrl: true,
            thumbnailUrl: true,
            status: true,
          },
        },
      },
    })

    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
    }

    const readyAsset = job.outputAssets.find(a => a.status === 'READY')

    return NextResponse.json({
      success: true,
      data: {
        status: job.status,
        progress: job.progress,
        progressMessage: job.progressMessage,
        outputUrl: readyAsset?.publicUrl || null,
        thumbnailUrl: readyAsset?.thumbnailUrl || null,
        errorMessage: job.errorMessage,
      },
    })
  } catch (error) {
    console.error('[API:render/status] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch render status' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
