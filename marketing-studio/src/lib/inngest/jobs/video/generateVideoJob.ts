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
import { getVideoProvider } from '@/lib/providers/video/registry'
import { recordRenderOutcome } from '@/lib/providers/video/budget'
import type { JobResult, VideoJobOutput } from '../../types'
import fs from 'fs/promises'
import path from 'path'

const MAX_POLL_DURATION_MS = 10 * 60 * 1000 // 10 minutes
const FAST_POLL_INTERVAL = '15s'
const SLOW_POLL_INTERVAL = '30s'
const FAST_POLL_CUTOFF_MS = 2 * 60 * 1000 // 2 minutes

export const generateVideoJob = inngest.createFunction(
  {
    id: 'generate-video',
    name: 'Generate Video Content',
    retries: 1,
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
    const {
      jobId, versionId, workspaceId,
      provider: providerName = 'runway',
      durationSeconds: eventDuration = 8,
      aspectRatio: eventAspect = '16:9',
      renderLogId,
    } = event.data as {
      jobId: string
      versionId: string
      workspaceId: string
      provider?: string
      durationSeconds?: number
      aspectRatio?: string
      renderLogId?: string
    }

    console.log('[INNGEST:RECEIVED]', { jobId, versionId, workspaceId, provider: providerName })

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
      const newProvider = getVideoProvider(providerName)

      // Resolve API key only for providers that need one
      let apiKey: string | undefined
      if (!newProvider || newProvider.config.requiresApiKey) {
        const keyResult = await resolveProviderKey(workspaceId, providerName as Parameters<typeof resolveProviderKey>[1])
        if (!keyResult.apiKey) {
          // Mark job with specific error code so UI can show "Connect API Key" guidance
          await prisma.studioVideoJob.update({
            where: { id: jobId },
            data: {
              status: 'FAILED',
              errorCode: 'MISSING_API_KEY',
              errorMessage: `${providerName} API key not configured. Add your key in Settings > Integrations or set the appropriate env var in .env.local`,
              completedAt: new Date(),
            },
          })
          throw new Error(
            `${providerName} API key not configured. Add your key in Settings > Integrations or set the appropriate env var in .env.local`
          )
        }
        apiKey = keyResult.apiKey
      }

      const config = job.config
      const model = config.model as string | undefined

      // Ensure prompt is never empty — fall back to config fields or a generic prompt
      const prompt = job.inputPrompt?.trim()
        || (config.script as string)?.trim()
        || (config.visualPrompt as string)?.trim()
        || (config.title as string)?.trim()
        || 'A professional cinematic video'

      console.log(`[${providerName.toUpperCase()}:SUBMIT]`, { jobId, model: model || 'default', ratio: eventAspect, duration: eventDuration, provider: providerName, promptLength: prompt.length })

      let result: { providerJobId: string; status: string; metadata?: Record<string, unknown> }

      if (newProvider) {
        // Use new provider registry
        const submitResult = await newProvider.submit({
          prompt,
          durationSeconds: eventDuration,
          aspectRatio: eventAspect,
          model,
          apiKey,
        })
        result = { providerJobId: submitResult.providerJobId, status: submitResult.status, metadata: submitResult.metadata }
      } else {
        // Backward compat: use legacy provider
        const legacyProvider = getProvider('runway')
        const submitResult = await legacyProvider.submit({
          prompt,
          duration: eventDuration,
          aspectRatio: eventAspect as '16:9' | '9:16' | '1:1',
          model,
          apiKey,
        })
        result = { providerJobId: submitResult.providerJobId, status: submitResult.status }
      }

      console.log(`[${providerName.toUpperCase()}:SUBMIT:OK]`, { jobId, providerJobId: result.providerJobId })

      // Update job with provider info
      await prisma.studioVideoJob.update({
        where: { id: jobId },
        data: {
          status: 'PROCESSING',
          provider: providerName,
          providerJobId: result.providerJobId,
          providerStatus: result.status,
          startedAt: new Date(),
        },
      })

      return result
    })

    // Short-circuit: if provider completed on submit (e.g. template), skip polling
    if (submission.status === 'completed') {
      await step.run('finalize-immediate', async () => {
        await prisma.studioVideoJob.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            progress: 100,
            progressMessage: 'Storyboard complete',
            providerMeta: (submission.metadata ?? {}) as Record<string, never>,
            completedAt: new Date(),
          },
        })
        if (renderLogId) {
          await recordRenderOutcome(renderLogId, 'completed').catch(e =>
            console.warn('[BUDGET:OUTCOME:ERR]', { renderLogId, error: e instanceof Error ? e.message : 'unknown' })
          )
        }
      })

      const durationMs = Date.now() - startTime
      console.log(`[${providerName.toUpperCase()}:COMPLETE]`, { jobId, instant: true })
      console.log('[INNGEST:JOB:DONE]', { jobId, finalStatus: 'completed', provider: providerName, durationMs })
      return {
        success: true,
        data: { jobId, status: 'completed' as const, provider: providerName },
        durationMs,
        timestamp: new Date().toISOString(),
      }
    }

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
        const newProvider = getVideoProvider(providerName)
        let result: { status: string; progress?: number; outputUrl?: string; thumbnailUrl?: string; errorMessage?: string; requiresDownload?: boolean }

        // Re-resolve API key for providers that need it (Inngest steps are independent)
        let pollApiKey: string | undefined
        if (!newProvider || newProvider.config.requiresApiKey) {
          const keyResult = await resolveProviderKey(workspaceId, providerName as Parameters<typeof resolveProviderKey>[1])
          pollApiKey = keyResult.apiKey || undefined
        }

        if (newProvider) {
          result = await newProvider.poll(submission.providerJobId, pollApiKey)
        } else {
          const legacyProvider = getProvider('runway')
          result = await legacyProvider.poll(submission.providerJobId)
        }

        console.log(`[${providerName.toUpperCase()}:POLL]`, { jobId, pollCount, status: result.status, progress: result.progress ?? 0 })

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

    // Step 3b: Authenticated download (for providers like Sora that stream binary with auth)
    if (finalStatus === 'completed' && outputUrl) {
      const needsDownload = outputUrl.includes('/content') && providerName === 'sora'
      if (needsDownload) {
        outputUrl = await step.run('download-video', async () => {
          // Re-resolve API key for download
          const keyResult = await resolveProviderKey(workspaceId, providerName as Parameters<typeof resolveProviderKey>[1])
          const dlKey = keyResult.apiKey
          if (!dlKey) throw new Error(`[${providerName.toUpperCase()}:DOWNLOAD:FAILED] No API key for download`)

          console.log(`[${providerName.toUpperCase()}:DOWNLOAD]`, { providerJobId: submission.providerJobId })

          const videoResponse = await fetch(outputUrl!, {
            headers: { 'Authorization': `Bearer ${dlKey}` },
          })
          if (!videoResponse.ok) {
            throw new Error(`[${providerName.toUpperCase()}:DOWNLOAD:FAILED] HTTP ${videoResponse.status}`)
          }

          const videoBuffer = Buffer.from(await videoResponse.arrayBuffer())
          const filename = `${providerName}-${jobId}-${Date.now()}.mp4`
          const renderDir = path.join(process.cwd(), 'public', 'studio', 'renders')

          // Ensure directory exists
          await fs.mkdir(renderDir, { recursive: true })
          const filePath = path.join(renderDir, filename)
          await fs.writeFile(filePath, videoBuffer)

          const sizeMb = (videoBuffer.length / (1024 * 1024)).toFixed(1)
          const publicUrl = `/studio/renders/${filename}`
          console.log(`[${providerName.toUpperCase()}:DOWNLOAD:OK]`, { filename, sizeMb })

          return publicUrl
        })
      }
    }

    // Step 4: Finalize
    await step.run('finalize', async () => {
      // Map provider name → StudioAssetProvider enum value
      const assetProviderMap: Record<string, string> = { runway: 'RUNWAY', heygen: 'HEYGEN', template: 'TEMPLATE', sora: 'SORA' }
      const assetProvider = assetProviderMap[providerName] || 'RUNWAY'

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
            provider: assetProvider as never,
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

        // Record outcome in render ledger
        if (renderLogId) {
          await recordRenderOutcome(renderLogId, 'completed').catch(e =>
            console.warn('[BUDGET:OUTCOME:ERR]', { renderLogId, error: e instanceof Error ? e.message : 'unknown' })
          )
        }
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

        // Record failure in render ledger
        if (renderLogId) {
          await recordRenderOutcome(renderLogId, 'failed', undefined, errorMessage).catch(e =>
            console.warn('[BUDGET:OUTCOME:ERR]', { renderLogId, error: e instanceof Error ? e.message : 'unknown' })
          )
        }
      }
    })

    const durationMs = Date.now() - startTime
    if (finalStatus === 'completed' && outputUrl) {
      console.log(`[${providerName.toUpperCase()}:COMPLETE]`, { jobId, videoUrl: outputUrl.slice(0, 80) })
    } else {
      console.log(`[${providerName.toUpperCase()}:FAILED]`, { jobId, errorMessage: errorMessage?.slice(0, 120) })
    }
    console.log('[INNGEST:JOB:DONE]', { jobId, finalStatus, provider: providerName, durationMs })

    return {
      success: finalStatus === 'completed',
      data: {
        jobId,
        status: finalStatus === 'completed' ? 'completed' : 'failed',
        provider: providerName,
        outputUrl,
      },
      durationMs,
      timestamp: new Date().toISOString(),
    }
  }
)
