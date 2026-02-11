/**
 * Generate Video Job — Real Async Rendering
 *
 * Handles video rendering via the render provider abstraction.
 * Steps: create job → submit to provider → poll for completion → finalize
 */

import { inngest } from '../../client'
import { prisma } from '@/lib/db'
import { getProvider } from '@/lib/render'
import { resolveProviderKey } from '@/lib/integrations/resolveProviderKey'
import type { JobResult, VideoJobOutput } from '../../types'

const MAX_POLL_DURATION_MS = 10 * 60 * 1000 // 10 minutes
const FAST_POLL_INTERVAL = '15s'
const SLOW_POLL_INTERVAL = '30s'
const FAST_POLL_CUTOFF_MS = 2 * 60 * 1000 // 2 minutes

export const generateVideoJob = inngest.createFunction(
  {
    id: 'generate-video',
    name: 'Generate Video Content',
    retries: 2,
    concurrency: {
      limit: 5,
    },
    onFailure: async ({ event, error }) => {
      // When all retries are exhausted, mark the DB job as FAILED
      // The failure event wraps the original: event.data.event.data has the original payload
      const originalEvent = (event?.data as Record<string, unknown>)?.event as Record<string, unknown> | undefined
      const originalData = (originalEvent?.data ?? {}) as { jobId?: string }
      const jobId = originalData.jobId
      if (!jobId) return
      const errMsg = error instanceof Error ? error.message : String(error)
      console.error('[INNGEST:FAILURE]', { jobId, error: errMsg.slice(0, 200) })
      try {
        await prisma.studioVideoJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            errorMessage: errMsg.slice(0, 500),
            completedAt: new Date(),
          },
        })
      } catch (dbErr) {
        console.error('[INNGEST:FAILURE:DB]', { jobId, dbErr })
      }
    },
  },
  { event: 'studio/video.generate' },
  async ({ event, step }): Promise<JobResult<VideoJobOutput>> => {
    const startTime = Date.now()
    const { jobId, versionId, workspaceId } = event.data as {
      jobId: string
      versionId: string
      workspaceId: string
    }

    console.log('[INNGEST:RECEIVED]', { jobId, versionId, workspaceId })

    // Step 1: Load job and update to QUEUED
    const job = await step.run('load-job', async () => {
      const videoJob = await prisma.studioVideoJob.findUnique({
        where: { id: jobId },
      })
      if (!videoJob) throw new Error(`Video job ${jobId} not found`)
      return {
        id: videoJob.id,
        inputPrompt: videoJob.inputPrompt || '',
        config: videoJob.config as Record<string, unknown> || {},
      }
    })

    // Step 2: Submit to render provider
    const submission = await step.run('submit-to-provider', async () => {
      // Resolve API key from integrations or env
      const keyResult = await resolveProviderKey(workspaceId, 'runway')
      if (!keyResult.apiKey) {
        throw new Error(
          'Runway API key not configured. Add your key in Settings > Integrations or set RUNWAY_API_KEY in .env.local'
        )
      }

      const provider = getProvider('runway')
      const config = job.config
      const duration = (config.duration === 4 ? 4 : config.duration === 6 ? 6 : 8) as 4 | 6 | 8
      const aspectRatio = (config.aspectRatio as '16:9' | '9:16' | '1:1') || '16:9'
      const model = config.model as string | undefined

      console.log('[RUNWAY:SUBMIT]', { jobId, model: model || 'default', ratio: aspectRatio, duration, keySource: keyResult.source })

      const result = await provider.submit({
        prompt: job.inputPrompt,
        duration,
        aspectRatio,
        model,
        apiKey: keyResult.apiKey,
      })

      console.log('[RUNWAY:SUBMIT:OK]', { jobId, providerJobId: result.providerJobId })

      // Update job with provider info
      await prisma.studioVideoJob.update({
        where: { id: jobId },
        data: {
          status: 'PROCESSING',
          provider: 'runway',
          providerJobId: result.providerJobId,
          providerStatus: result.status,
          startedAt: new Date(),
        },
      })

      return result
    })

    // Step 3: Poll for completion with exponential backoff
    let finalStatus: 'completed' | 'failed' = 'failed'
    let outputUrl: string | undefined
    let thumbnailUrl: string | undefined
    let errorMessage: string | undefined

    const pollStartTime = Date.now()
    let pollCount = 0

    while (Date.now() - pollStartTime < MAX_POLL_DURATION_MS) {
      pollCount++
      const elapsed = Date.now() - pollStartTime
      const sleepDuration = elapsed < FAST_POLL_CUTOFF_MS ? FAST_POLL_INTERVAL : SLOW_POLL_INTERVAL

      await step.sleep(`poll-wait-${pollCount}`, sleepDuration)

      const pollResult = await step.run(`poll-provider-${pollCount}`, async () => {
        const provider = getProvider('runway')
        const result = await provider.poll(submission.providerJobId)

        console.log('[RUNWAY:POLL]', { jobId, pollCount, status: result.status, progress: result.progress ?? 0 })

        // Update progress in DB
        await prisma.studioVideoJob.update({
          where: { id: jobId },
          data: {
            progress: result.progress ?? 0,
            providerStatus: result.status,
            progressMessage: result.status === 'processing'
              ? `Rendering... ${result.progress ?? 0}%`
              : result.status === 'queued'
                ? 'Waiting in queue...'
                : undefined,
          },
        })

        return result
      })

      if (pollResult.status === 'completed') {
        finalStatus = 'completed'
        outputUrl = pollResult.outputUrl
        thumbnailUrl = pollResult.thumbnailUrl
        break
      }

      if (pollResult.status === 'failed') {
        finalStatus = 'failed'
        errorMessage = pollResult.errorMessage
        break
      }
    }

    // If we exited the loop without a terminal status, it timed out
    if (finalStatus !== 'completed' && !errorMessage) {
      errorMessage = 'Video rendering timed out after 10 minutes'
    }

    // Step 4: Finalize
    await step.run('finalize', async () => {
      if (finalStatus === 'completed' && outputUrl) {
        // Look up contentId from the job record
        const jobRecord = await prisma.studioVideoJob.findUnique({
          where: { id: jobId },
          select: { contentId: true },
        })

        // Create asset record
        await prisma.studioAsset.create({
          data: {
            workspaceId,
            type: 'VIDEO',
            status: 'READY',
            filename: `render-${jobId}.mp4`,
            mimeType: 'video/mp4',
            sizeBytes: 0,
            storageProvider: 'external',
            storageKey: outputUrl,
            publicUrl: outputUrl,
            thumbnailUrl: thumbnailUrl ?? null,
            provider: 'RUNWAY',
            providerJobId: submission.providerJobId,
            videoJobId: jobId,
            contentId: jobRecord?.contentId ?? null,
          },
        })

        // Update job to COMPLETED
        await prisma.studioVideoJob.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            progress: 100,
            progressMessage: 'Render complete',
            completedAt: new Date(),
          },
        })
      } else {
        // Update job to FAILED
        await prisma.studioVideoJob.update({
          where: { id: jobId },
          data: {
            status: 'FAILED',
            errorMessage: errorMessage || 'Unknown error',
            completedAt: new Date(),
          },
        })
      }
    })

    const durationMs = Date.now() - startTime
    if (finalStatus === 'completed' && outputUrl) {
      console.log('[RUNWAY:COMPLETE]', { jobId, videoUrl: outputUrl.slice(0, 80) })
    } else {
      console.log('[RUNWAY:FAILED]', { jobId, errorMessage: errorMessage?.slice(0, 120) })
    }
    console.log('[INNGEST:JOB:DONE]', { jobId, finalStatus, durationMs })

    return {
      success: finalStatus === 'completed',
      data: {
        jobId,
        status: finalStatus === 'completed' ? 'completed' : 'failed',
        provider: 'runway',
        outputUrl,
      },
      durationMs,
      timestamp: new Date().toISOString(),
    }
  }
)
