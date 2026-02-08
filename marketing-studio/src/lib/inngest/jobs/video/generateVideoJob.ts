/**
 * Generate Video Job
 *
 * Handles async video generation requests.
 * Uses existing StudioVideoJob Prisma model.
 */

import { inngest } from '../../client'
import { prisma } from '@/lib/db'
import type { JobResult, VideoJobOutput } from '../../types'

export const generateVideoJob = inngest.createFunction(
  {
    id: 'generate-video',
    name: 'Generate Video Content',
    retries: 2,
    concurrency: {
      limit: 5, // Limit concurrent video jobs (resource intensive)
    },
  },
  { event: 'studio/video.generate' },
  async ({ event, step }): Promise<JobResult<VideoJobOutput>> => {
    const startTime = Date.now()
    const { script, style, duration, outputFormat, workspaceId } = event.data as {
      script: string
      style?: string
      duration?: number
      outputFormat?: string
      workspaceId?: string
    }

    console.log('[Inngest:Video] Job started', {
      scriptLength: script.length,
      style,
      duration,
      eventId: event.id,
    })

    // Step 1: Create video job record (only if workspaceId is provided)
    const videoJob = await step.run('create-video-job', async () => {
      if (!workspaceId) {
        // Return a pseudo job ID for jobs without workspace context
        return { jobId: `temp-${event.id}`, hasRecord: false }
      }

      const job = await prisma.studioVideoJob.create({
        data: {
          workspaceId,
          type: 'SCRIPT_TO_VIDEO',
          status: 'QUEUED',
          inputScript: script,
          config: {
            style: style || 'professional',
            duration: duration || 30,
            outputFormat: outputFormat || 'mp4',
          },
        },
      })

      return { jobId: job.id, hasRecord: true }
    })

    // Step 2: Determine provider (placeholder for future integration)
    const provider = await step.run('select-provider', async () => {
      // In future phase, this will check video-tools.ts for available providers
      console.log('[Inngest:Video] Selecting provider for style:', style || 'professional')

      return {
        provider: 'runway', // Placeholder
        estimatedDuration: (duration || 30) * 2, // Rough estimate
      }
    })

    // Step 3: Update job to processing (only if we have a real record)
    if (videoJob.hasRecord && workspaceId) {
      await step.run('update-job-processing', async () => {
        await prisma.studioVideoJob.update({
          where: { id: videoJob.jobId },
          data: {
            status: 'PROCESSING',
            provider: provider.provider,
            providerMeta: {
              estimatedDuration: provider.estimatedDuration,
              triggeredBy: 'inngest',
              eventId: event.id,
            },
          },
        })
      })
    }

    const durationMs = Date.now() - startTime

    console.log('[Inngest:Video] Job queued for processing', {
      jobId: videoJob.jobId,
      provider: provider.provider,
      durationMs,
    })

    // Note: Actual video generation will be implemented in future phase
    // This job returns immediately with queued status
    return {
      success: true,
      data: {
        jobId: videoJob.jobId,
        status: 'queued',
        provider: provider.provider,
        estimatedDuration: provider.estimatedDuration,
      },
      durationMs,
      timestamp: new Date().toISOString(),
    }
  }
)
