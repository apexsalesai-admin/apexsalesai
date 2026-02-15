/**
 * Durable Video Test Render Polling
 *
 * Replaces fragile client-side polling (setInterval in the browser) with
 * a durable server-side workflow. Survives page closes, network drops,
 * and Vercel cold starts.
 *
 * NOTE: This handles TEST renders from the Mia creative session.
 * Full production renders use the separate generateVideoJob in jobs/video/.
 */

import { inngest } from '../client'

export const pollVideoRender = inngest.createFunction(
  {
    id: 'poll-video-render',
    name: 'Poll Video Test Render',
    retries: 3,
    cancelOn: [{
      event: 'studio/video.render.requested',
      match: 'data.userId',
      if: 'event.data.contentId == async.data.contentId && event.data.contentId != null',
    }],
  },
  { event: 'studio/video.render.requested' },
  async ({ event, step }) => {
    const { taskId, providerId, userId, estimatedCost, renderType, contentId } = event.data as {
      taskId: string
      providerId: string
      userId: string
      estimatedCost: number
      renderType: 'test' | 'full'
      prompt: string
      durationSeconds: number
      contentId?: string
    }
    const startTime = Date.now()

    // Step 1: Initial delay — give the provider a head start
    await step.sleep('initial-wait', '5s')

    // Step 2: Poll loop — up to 40 attempts over ~15 minutes
    let videoUrl: string | null = null
    let pollCount = 0
    const maxPolls = 40

    while (pollCount < maxPolls) {
      pollCount++

      const result = await step.run(`poll-${pollCount}`, async () => {
        const baseUrl = process.env.NEXTAUTH_URL
          || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3003')

        const res = await fetch(
          `${baseUrl}/api/studio/video/test-render?taskId=${taskId}&provider=${providerId}`,
          {
            headers: {
              'x-inngest-internal': process.env.INNGEST_SIGNING_KEY || '',
            },
          }
        )
        return res.json() as Promise<{ status: string; videoUrl?: string; error?: string; progress?: number }>
      })

      if (result.status === 'complete') {
        videoUrl = result.videoUrl || null
        break
      }

      if (result.status === 'failed') {
        await step.sendEvent('send-failure', {
          name: 'studio/video.render.failed',
          data: {
            userId,
            taskId,
            providerId,
            error: result.error || 'Provider reported render failure',
            renderType,
            contentId,
          },
        })
        return { status: 'failed', error: result.error }
      }

      // Progressive backoff: 10s → 20s → 30s
      const sleepSeconds = pollCount <= 10 ? 10 : pollCount <= 20 ? 20 : 30
      await step.sleep(`wait-${pollCount}`, `${sleepSeconds}s`)
    }

    // Step 3: Handle result
    const renderTimeMs = Date.now() - startTime

    if (videoUrl) {
      await step.sendEvent('send-completion', {
        name: 'studio/video.render.completed',
        data: {
          userId,
          taskId,
          providerId,
          videoUrl,
          renderType,
          actualCost: estimatedCost,
          renderTimeMs,
          contentId,
        },
      })
      return { status: 'complete', videoUrl, renderTimeMs }
    }

    // Exhausted polls without completion
    await step.sendEvent('send-timeout', {
      name: 'studio/video.render.failed',
      data: {
        userId,
        taskId,
        providerId,
        error: `Render timed out after ${maxPolls} polls (${Math.round(renderTimeMs / 1000)}s)`,
        renderType,
        contentId,
      },
    })
    return { status: 'timeout', pollCount }
  }
)
