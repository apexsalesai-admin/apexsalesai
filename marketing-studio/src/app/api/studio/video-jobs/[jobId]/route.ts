/**
 * Video Job API — Unified RenderResult endpoint
 *
 * GET /api/studio/video-jobs/[jobId] — Returns RenderResult for any valid jobId
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { RenderResult, RenderStatus, StoryboardFrame } from '@/lib/video/types/render-result'

/** Map DB StudioVideoJobStatus → RenderStatus */
function mapStatus(dbStatus: string): RenderStatus {
  switch (dbStatus) {
    case 'QUEUED':      return 'queued'
    case 'PROCESSING':  return 'processing'
    case 'COMPLETED':   return 'completed'
    case 'FAILED':      return 'failed'
    default:            return 'processing'
  }
}

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
          where: { status: 'READY' },
          select: {
            id: true,
            publicUrl: true,
            thumbnailUrl: true,
            durationSeconds: true,
          },
          take: 1,
        },
        renderLogs: {
          select: {
            id: true,
            provider: true,
            durationSeconds: true,
            aspectRatio: true,
            estimatedCostUsd: true,
            actualCostUsd: true,
            status: true,
            submittedAt: true,
            completedAt: true,
          },
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!job) {
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 })
    }

    const status = mapStatus(job.status)
    const readyAsset = job.outputAssets[0] ?? null

    // Extract storyboard frames from providerMeta (stored by template provider in Phase 2)
    const meta = (job.providerMeta ?? {}) as Record<string, unknown>
    const frames = (meta.frames as StoryboardFrame[] | undefined) ?? null

    // Build the unified RenderResult
    const result: RenderResult = {
      jobId: job.id,
      provider: job.provider || 'unknown',
      status,
      previewUrl: readyAsset?.publicUrl ?? null,
      outputUrl: readyAsset?.publicUrl ?? null,
      thumbnailUrl: readyAsset?.thumbnailUrl ?? null,
      frames,
      progress: job.progress,
      estimatedSeconds: null,
      error: job.errorMessage ?? null,
      errorCode: job.errorCode ?? null,
      nextAction: null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      durationSeconds: readyAsset?.durationSeconds ?? null,
    }

    // Edge case: completed but no visible output at all
    if (
      status === 'completed' &&
      !result.previewUrl &&
      !result.outputUrl &&
      !result.frames?.length
    ) {
      result.error = 'Render completed but no output was stored. This is a bug.'
      result.errorCode = 'NO_OUTPUT'
    }

    // Edge case: failed but no error message
    if (status === 'failed' && !result.error) {
      result.error = 'Render failed. Check provider status.'
      result.errorCode = 'UNKNOWN_FAILURE'
    }

    // Guidance for awaiting_provider (could be set by caller in future)
    if (status === 'failed' && result.errorCode === 'MISSING_API_KEY') {
      result.status = 'awaiting_provider'
      result.nextAction = {
        label: `Connect ${job.provider || 'Provider'} API Key`,
        href: '/studio/integrations',
        action: 'connect_provider',
      }
    }

    // Debug metadata (only sent, consumed by ?debug=1 in the UI)
    const renderLog = job.renderLogs[0] ?? null
    const debug = {
      jobId: job.id,
      provider: job.provider,
      providerJobId: job.providerJobId,
      providerStatus: job.providerStatus,
      dbStatus: job.status,
      progress: job.progress,
      errorCode: job.errorCode,
      errorMessage: job.errorMessage,
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      estimatedCost: job.estimatedCost,
      actualCost: job.actualCost,
      retryCount: job.retryCount,
      renderLog: renderLog ? {
        id: renderLog.id,
        provider: renderLog.provider,
        durationSeconds: renderLog.durationSeconds,
        aspectRatio: renderLog.aspectRatio,
        estimatedCostUsd: renderLog.estimatedCostUsd,
        actualCostUsd: renderLog.actualCostUsd,
        status: renderLog.status,
        submittedAt: renderLog.submittedAt.toISOString(),
        completedAt: renderLog.completedAt?.toISOString() ?? null,
      } : null,
    }

    return NextResponse.json({ success: true, data: result, debug })
  } catch (error) {
    console.error('[API:video-jobs] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch job status' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
