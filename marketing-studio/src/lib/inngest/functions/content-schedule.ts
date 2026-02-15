/**
 * Scheduled Content Publishing
 *
 * Uses step.sleepUntil() to pause until the scheduled time without
 * holding a serverless function open. Inngest resumes at exactly the
 * right time and publishes to all selected channels.
 */

import { inngest } from '../client'

export const scheduleContentPublish = inngest.createFunction(
  {
    id: 'schedule-content-publish',
    name: 'Scheduled Content Publish',
    retries: 5,
    cancelOn: [{
      event: 'studio/content.schedule.requested',
      match: 'data.contentId',
    }],
  },
  { event: 'studio/content.schedule.requested' },
  async ({ event, step }) => {
    const { userId, contentId, title, body, channels, scheduledAt, hashtags, callToAction, videoUrl } = event.data as {
      userId: string
      contentId: string
      title: string
      body: string
      channels: string[]
      scheduledAt: string
      hashtags?: string[]
      callToAction?: string
      videoUrl?: string
    }

    // Step 1: Sleep until the scheduled time
    const scheduledDate = new Date(scheduledAt)
    const now = new Date()

    if (scheduledDate > now) {
      await step.sleepUntil('wait-for-schedule', scheduledDate)
    }

    // Step 2: Publish to each channel independently
    const results: Array<{ channel: string; success: boolean; postUrl?: string; error?: string }> = []

    for (const channel of channels) {
      const result = await step.run(`publish-to-${channel}`, async () => {
        const baseUrl = process.env.NEXTAUTH_URL
          || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3003')

        try {
          const res = await fetch(`${baseUrl}/api/studio/publish`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-inngest-internal': process.env.INNGEST_SIGNING_KEY || '',
            },
            body: JSON.stringify({
              contentId,
              channel,
              title,
              body,
              hashtags,
              callToAction,
              videoUrl,
            }),
          })
          const data = await res.json()
          return {
            channel,
            success: data.success || false,
            postUrl: data.postUrl as string | undefined,
            error: data.error as string | undefined,
          }
        } catch (err) {
          return {
            channel,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown publish error',
          }
        }
      })
      results.push(result)
    }

    // Step 3: Send completion event
    await step.sendEvent('publish-complete', {
      name: 'studio/content.published',
      data: {
        userId,
        contentId,
        channels,
        publishedAt: new Date().toISOString(),
        results,
      },
    })

    return { status: 'published', results }
  }
)
