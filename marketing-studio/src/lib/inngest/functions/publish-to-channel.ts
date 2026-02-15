/**
 * Durable Publish-to-Channel Function (P25-A)
 *
 * Publishes content to a specific PublishingChannel using encrypted tokens.
 * Uses step functions for durability — retries on transient failures.
 *
 * Event: studio/publish.to-channel
 */

import { inngest } from '../client'
import { prisma } from '@/lib/db'
import { publishToLinkedIn } from '@/lib/studio/publishing/publishers/linkedin'

export const publishToChannel = inngest.createFunction(
  {
    id: 'publish-to-channel',
    name: 'Publish to Channel',
    retries: 3,
    concurrency: { limit: 5 },
  },
  { event: 'studio/publish.to-channel' },
  async ({ event, step }) => {
    const { publicationId, channelId, userId, contentId, variantId, text } = event.data as {
      publicationId: string
      channelId: string
      userId: string
      contentId: string
      variantId?: string
      text: string
    }

    // Step 1: Load channel and validate
    const channel = await step.run('load-channel', async () => {
      const ch = await prisma.publishingChannel.findFirst({
        where: { id: channelId, userId, isActive: true },
      })

      if (!ch) throw new Error(`Channel ${channelId} not found or inactive`)
      if (!ch.accessToken) throw new Error(`Channel ${channelId} has no access token`)

      return {
        id: ch.id,
        platform: ch.platform,
        accessToken: ch.accessToken,
        metadata: ch.metadata as Record<string, string> | null,
      }
    })

    // Step 2: Mark publication as publishing
    await step.run('mark-publishing', async () => {
      await prisma.publication.update({
        where: { id: publicationId },
        data: { status: 'publishing' },
      })
    })

    // Step 3: Execute platform-specific publish
    const result = await step.run('execute-publish', async () => {
      if (channel.platform === 'linkedin') {
        const personUrn = channel.metadata?.personUrn
        if (!personUrn) throw new Error('Missing LinkedIn person URN')

        return publishToLinkedIn({
          accessToken: channel.accessToken,
          personUrn,
          text,
        })
      }

      return {
        success: false,
        error: `Platform ${channel.platform} not yet supported`,
        errorType: 'UNKNOWN' as const,
      }
    })

    // Step 4: Update publication and channel records
    await step.run('update-records', async () => {
      await prisma.publication.update({
        where: { id: publicationId },
        data: {
          status: result.success ? 'published' : 'failed',
          publishedAt: result.success ? new Date() : null,
          postUrl: result.postUrl || null,
          postId: result.postId || null,
          error: result.error || null,
          retryCount: { increment: 1 },
        },
      })

      if (result.success) {
        await prisma.publishingChannel.update({
          where: { id: channelId },
          data: { lastPublishedAt: new Date(), lastError: null },
        })
      } else {
        await prisma.publishingChannel.update({
          where: { id: channelId },
          data: { lastError: result.error || 'Publish failed' },
        })
      }
    })

    return {
      success: result.success,
      publicationId,
      channelId,
      platform: channel.platform,
      postUrl: result.postUrl,
      error: result.error,
    }
  }
)
