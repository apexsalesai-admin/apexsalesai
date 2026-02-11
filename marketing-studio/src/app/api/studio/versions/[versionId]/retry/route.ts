/**
 * Version Retry API
 *
 * POST /api/studio/versions/[versionId]/retry
 * Resets a FAILED video job and re-submits it for rendering.
 * If no job exists, creates a new one (same as /render).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { inngest } from '@/lib/inngest/client'
import { getProvider } from '@/lib/render'
import { log, logError } from '@/lib/dev-mode'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { versionId } = await params

    const version = await prisma.studioContentVersion.findUnique({
      where: { id: versionId },
      include: { videoJob: true },
    })
    if (!version) {
      return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 })
    }

    // Only allow retry if job is FAILED or doesn't exist
    if (version.videoJob && version.videoJob.status !== 'FAILED') {
      return NextResponse.json(
        { success: false, error: `Cannot retry — job is ${version.videoJob.status}` },
        { status: 400 }
      )
    }

    const workspace = await getOrCreateWorkspace(session.user.id)
    const config = version.config as Record<string, unknown> || {}

    log('VIDEO', `Retrying render for version ${versionId}`)

    // Create a fresh video job
    const videoJob = await prisma.studioVideoJob.create({
      data: {
        workspaceId: workspace.id,
        type: 'TEXT_TO_VIDEO',
        status: 'QUEUED',
        contentId: version.contentId,
        inputScript: version.script,
        inputPrompt: version.visualPrompt || version.script,
        config: version.config || {},
      },
    })

    // Link new job to version (replaces old failed job link)
    await prisma.studioContentVersion.update({
      where: { id: versionId },
      data: { videoJobId: videoJob.id },
    })

    // Dev-mode fallback (same as render route)
    const isDev = process.env.NODE_ENV === 'development'
    const hasRunwayKey = !!process.env.RUNWAY_API_KEY

    if (isDev && !hasRunwayKey) {
      await prisma.studioVideoJob.update({
        where: { id: videoJob.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          provider: 'runway',
          providerJobId: `mock-retry-${videoJob.id}`,
          progressMessage: 'Dev mode — mock retry complete',
          startedAt: new Date(),
          completedAt: new Date(),
        },
      })

      await prisma.studioAsset.create({
        data: {
          workspaceId: workspace.id,
          type: 'VIDEO',
          status: 'READY',
          filename: `mock-retry-${videoJob.id}.mp4`,
          mimeType: 'video/mp4',
          sizeBytes: 0,
          storageProvider: 'mock',
          storageKey: 'dev-mock',
          publicUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          thumbnailUrl: null,
          provider: 'RUNWAY',
          providerJobId: `mock-retry-${videoJob.id}`,
          videoJobId: videoJob.id,
          contentId: version.contentId,
        },
      })

      return NextResponse.json({
        success: true,
        data: { jobId: videoJob.id, status: 'COMPLETED', devMode: true },
      })
    }

    // Production: dispatch via Inngest
    try {
      console.log('[INNGEST:DISPATCH]', { jobId: videoJob.id, versionId, event: 'studio/video.generate', source: 'retry' })
      await inngest.send({
        name: 'studio/video.generate',
        data: {
          jobId: videoJob.id,
          versionId,
          workspaceId: workspace.id,
        },
      })
      console.log('[INNGEST:DISPATCH:OK]', { jobId: videoJob.id })
    } catch (inngestErr) {
      if (isDev) {
        console.warn('[INNGEST:DISPATCH:FAIL]', { jobId: videoJob.id, error: inngestErr instanceof Error ? inngestErr.message : 'unknown' })
        try {
          const provider = getProvider('runway')
          const submitResult = await provider.submit({
            prompt: version.visualPrompt || version.script,
            duration: (config.duration === 4 ? 4 : config.duration === 6 ? 6 : 8) as 4 | 6 | 8,
            aspectRatio: (config.aspectRatio as '16:9' | '9:16' | '1:1') || '16:9',
          })

          await prisma.studioVideoJob.update({
            where: { id: videoJob.id },
            data: {
              status: 'PROCESSING',
              provider: 'runway',
              providerJobId: submitResult.providerJobId,
              startedAt: new Date(),
            },
          })

          return NextResponse.json({
            success: true,
            data: { jobId: videoJob.id, status: 'PROCESSING', directSubmit: true },
          })
        } catch {
          log('VIDEO', 'Direct Runway call also failed, returning QUEUED state')
        }
      } else {
        throw inngestErr
      }
    }

    return NextResponse.json({
      success: true,
      data: { jobId: videoJob.id, status: 'QUEUED' },
    })
  } catch (error) {
    logError('VIDEO', 'Retry error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retry render' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
