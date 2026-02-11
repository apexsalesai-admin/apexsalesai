/**
 * Version Render API
 *
 * POST /api/studio/versions/[versionId]/render — Start a render for a version
 *
 * Creates a StudioVideoJob, links it to the version, and dispatches
 * an Inngest event (or synchronous fallback in dev mode).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { inngest } from '@/lib/inngest/client'
import { getProvider } from '@/lib/render'
import { resolveProviderKey } from '@/lib/integrations/resolveProviderKey'

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

    // Look up version with existing job
    const version = await prisma.studioContentVersion.findUnique({
      where: { id: versionId },
      include: { videoJob: { select: { id: true, status: true, createdAt: true } } },
    })
    if (!version) {
      return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 })
    }

    // Get workspace
    const workspace = await getOrCreateWorkspace(session.user.id)
    const config = version.config as Record<string, unknown> || {}

    // Early key validation — fail fast before creating a job
    const keyResult = await resolveProviderKey(workspace.id, 'runway')

    console.log('[RENDER:REQUEST]', {
      workspaceId: workspace.id,
      versionId,
      contentId: version.contentId,
      provider: 'runway',
      keySource: keyResult.source,
      pipeline: 'inngest',
    })

    if (!keyResult.apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Runway API key not configured for this workspace. Go to Settings > Integrations or set RUNWAY_API_KEY in .env.local',
      }, { status: 400 })
    }

    // Check for stuck job: QUEUED or PROCESSING for > 5 minutes
    const STUCK_THRESHOLD_MS = 5 * 60 * 1000
    let videoJob: { id: string }

    if (
      version.videoJob &&
      (version.videoJob.status === 'QUEUED' || version.videoJob.status === 'PROCESSING') &&
      Date.now() - new Date(version.videoJob.createdAt).getTime() > STUCK_THRESHOLD_MS
    ) {
      // Reset the stuck job
      console.log('[JOB:RESET]', { jobId: version.videoJob.id, oldStatus: version.videoJob.status, ageMs: Date.now() - new Date(version.videoJob.createdAt).getTime() })
      await prisma.studioVideoJob.update({
        where: { id: version.videoJob.id },
        data: {
          status: 'FAILED',
          errorMessage: 'Job reset — was stuck for over 5 minutes',
          completedAt: new Date(),
        },
      })

      // Create fresh job
      videoJob = await prisma.studioVideoJob.create({
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

      // Link new job to version
      await prisma.studioContentVersion.update({
        where: { id: versionId },
        data: { videoJobId: videoJob.id },
      })
    } else if (
      version.videoJob &&
      (version.videoJob.status === 'QUEUED' || version.videoJob.status === 'PROCESSING')
    ) {
      // Job is still active and not stuck — don't create a new one
      return NextResponse.json({
        success: true,
        data: { jobId: version.videoJob.id, status: version.videoJob.status, message: 'Render already in progress' },
      })
    } else {
      // No active job — create a new one
      videoJob = await prisma.studioVideoJob.create({
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

      // Link job to version
      await prisma.studioContentVersion.update({
        where: { id: versionId },
        data: { videoJobId: videoJob.id },
      })
    }

    // Dev-mode synchronous fallback
    const isDev = process.env.NODE_ENV === 'development'
    const hasRunwayKey = !!process.env.RUNWAY_API_KEY

    if (isDev && !hasRunwayKey) {
      // Mock: simulate a completed render with a sample video URL
      await prisma.studioVideoJob.update({
        where: { id: videoJob.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          provider: 'runway',
          providerJobId: `mock-${videoJob.id}`,
          progressMessage: 'Dev mode — mock render complete',
          startedAt: new Date(),
          completedAt: new Date(),
        },
      })

      await prisma.studioAsset.create({
        data: {
          workspaceId: workspace.id,
          type: 'VIDEO',
          status: 'READY',
          filename: `mock-render-${videoJob.id}.mp4`,
          mimeType: 'video/mp4',
          sizeBytes: 0,
          storageProvider: 'mock',
          storageKey: 'dev-mock',
          publicUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          thumbnailUrl: null,
          provider: 'RUNWAY',
          providerJobId: `mock-${videoJob.id}`,
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
      console.log('[INNGEST:DISPATCH]', { jobId: videoJob.id, versionId, event: 'studio/video.generate' })
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
      // If Inngest is unreachable in dev, fall back to direct Runway call
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
          // If Runway also fails, return the job in QUEUED state
          console.warn('[Render] Direct Runway call also failed, returning QUEUED state')
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
    console.error('[API:render] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to start render' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
