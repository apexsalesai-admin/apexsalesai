/**
 * Publish Content Job
 *
 * Handles async publishing of ScheduledContent to multiple platforms.
 * Uses existing StudioPublishJob and StudioPublishResult Prisma models.
 *
 * P25-B-FIX4: Reads tokens from PublishingChannel (not StudioIntegration).
 * Uses the production-hardened publishers from publishers/linkedin and publishers/x.
 *
 * Workflow:
 * 1. Load content from database
 * 2. Create publish job record
 * 3. For each channel, look up PublishingChannel, decrypt token, publish
 * 4. Update result status per channel
 * 5. Update overall job + content status
 */

import { inngest } from '../../client'
import { prisma } from '@/lib/db'
import { publishToLinkedIn } from '@/lib/studio/publishing/publishers/linkedin'
import { publishToX } from '@/lib/studio/publishing/publishers/x'
import type { JobResult, PublishJobOutput } from '../../types'
import { StudioIntegrationType } from '@prisma/client'

// Map channel strings to PublishingChannel platform names + Prisma enum
const PLATFORM_MAP: Record<string, { dbPlatform: string; integrationType: StudioIntegrationType }> = {
  'LINKEDIN':  { dbPlatform: 'linkedin', integrationType: 'LINKEDIN' },
  'linkedin':  { dbPlatform: 'linkedin', integrationType: 'LINKEDIN' },
  'X_TWITTER': { dbPlatform: 'x',        integrationType: 'X_TWITTER' },
  'TWITTER':   { dbPlatform: 'x',        integrationType: 'X_TWITTER' },
  'X':         { dbPlatform: 'x',        integrationType: 'X_TWITTER' },
  'x':         { dbPlatform: 'x',        integrationType: 'X_TWITTER' },
  'twitter':   { dbPlatform: 'x',        integrationType: 'X_TWITTER' },
  'YOUTUBE':   { dbPlatform: 'youtube',   integrationType: 'YOUTUBE' },
  'youtube':   { dbPlatform: 'youtube',   integrationType: 'YOUTUBE' },
}

export const publishContentJob = inngest.createFunction(
  {
    id: 'publish-content',
    name: 'Publish Content to Platforms',
    retries: 3,
    concurrency: {
      limit: 5,
    },
  },
  { event: 'studio/publish.content' },
  async ({ event, step }): Promise<JobResult<PublishJobOutput>> => {
    const startTime = Date.now()
    const { contentId, channels, workspaceId, userId } = event.data as {
      contentId: string
      channels: string[]
      workspaceId: string
      userId?: string
    }

    console.log('[Inngest:Publish] Job started', {
      workspaceId,
      contentId,
      channels,
      hasUserId: !!userId,
      eventId: event.id,
    })

    // Step 1: Load content from database
    const content = await step.run('load-content', async () => {
      const record = await prisma.scheduledContent.findUnique({
        where: { id: contentId },
      })

      if (!record) {
        throw new Error(`Content not found: ${contentId}`)
      }

      return {
        id: record.id,
        title: record.title,
        body: record.body,
        hashtags: record.hashtags as string[],
        callToAction: record.callToAction,
        createdById: record.createdById,
      }
    })

    // Resolve userId: prefer event data, fall back to content creator
    const resolvedUserId = userId || content.createdById
    if (!resolvedUserId) {
      console.error('[Inngest:Publish] No userId available — cannot look up channels')
    }

    // Step 2: Create publish job record
    const publishJob = await step.run('create-publish-job', async () => {
      const job = await prisma.studioPublishJob.create({
        data: {
          workspaceId,
          contentId,
          status: 'PUBLISHING',
          targetChannels: channels,
          startedAt: new Date(),
        },
      })
      return { jobId: job.id }
    })

    // Build content text
    let text = content.title
    if (content.body) text += `\n\n${content.body}`
    if (content.hashtags?.length) {
      text += '\n\n' + content.hashtags.map((h: string) => (h.startsWith('#') ? h : `#${h}`)).join(' ')
    }
    if (content.callToAction) text += `\n\n${content.callToAction}`

    // Step 3: Publish to each channel
    const publishResults = await step.run('publish-to-platforms', async () => {
      const results: Array<{
        channel: string
        success: boolean
        postId?: string
        permalink?: string
        error?: string
      }> = []

      for (const channel of channels) {
        const mapped = PLATFORM_MAP[channel]

        if (!mapped) {
          results.push({ channel, success: false, error: `Unsupported platform: ${channel}` })
          continue
        }

        // Look up PublishingChannel by userId + platform
        let pubChannel: { id: string; accessToken: string | null; metadata: unknown } | null = null
        if (resolvedUserId) {
          pubChannel = await prisma.publishingChannel.findFirst({
            where: { userId: resolvedUserId, platform: mapped.dbPlatform, isActive: true },
            orderBy: { connectedAt: 'desc' },
            select: { id: true, accessToken: true, metadata: true },
          })
        }

        if (!pubChannel || !pubChannel.accessToken) {
          results.push({
            channel,
            success: false,
            error: `No connected ${channel} channel with valid token. Please connect your account.`,
          })
          await prisma.studioPublishResult.create({
            data: {
              publishJobId: publishJob.jobId,
              channel: mapped.integrationType,
              status: 'FAILED',
              errorMessage: 'No connected channel or missing token',
              platformResponse: { error: 'no_channel_or_token' },
            },
          }).catch(() => {})
          continue
        }

        // Execute platform-specific publish
        let publishResult: { success: boolean; postId?: string; postUrl?: string; error?: string }

        try {
          if (mapped.dbPlatform === 'linkedin') {
            const metadata = pubChannel.metadata as Record<string, string> | null
            const personUrn = metadata?.personUrn
            if (!personUrn) {
              publishResult = { success: false, error: 'Missing LinkedIn person URN' }
            } else {
              const result = await publishToLinkedIn({
                accessToken: pubChannel.accessToken,
                personUrn,
                text,
              })
              publishResult = {
                success: result.success,
                postId: result.postId,
                postUrl: result.postUrl,
                error: result.error,
              }
            }
          } else if (mapped.dbPlatform === 'x') {
            const result = await publishToX({
              accessToken: pubChannel.accessToken,
              text,
            })
            publishResult = {
              success: result.success,
              postId: result.tweetId,
              postUrl: result.postUrl,
              error: result.error,
            }
          } else {
            publishResult = { success: false, error: `${channel} publishing not yet implemented` }
          }
        } catch (err) {
          publishResult = {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          }
        }

        // Record result
        await prisma.studioPublishResult.create({
          data: {
            publishJobId: publishJob.jobId,
            channel: mapped.integrationType,
            status: publishResult.success ? 'SUCCESS' : 'FAILED',
            externalPostId: publishResult.postId || null,
            permalink: publishResult.postUrl || null,
            publishedAt: publishResult.success ? new Date() : null,
            errorMessage: publishResult.error || null,
            platformResponse: JSON.parse(JSON.stringify(publishResult)),
          },
        }).catch(() => {})

        // Update channel status
        if (publishResult.success) {
          await prisma.publishingChannel.update({
            where: { id: pubChannel.id },
            data: { lastPublishedAt: new Date(), lastError: null },
          }).catch(() => {})
        } else {
          await prisma.publishingChannel.update({
            where: { id: pubChannel.id },
            data: { lastError: publishResult.error || 'Publish failed' },
          }).catch(() => {})
        }

        results.push({
          channel,
          success: publishResult.success,
          postId: publishResult.postId,
          permalink: publishResult.postUrl,
          error: publishResult.error,
        })

        console.log('[Inngest:Publish] Channel result', {
          channel,
          success: publishResult.success,
          error: publishResult.error,
        })
      }

      return results
    })

    // Step 4: Update final statuses
    await step.run('update-final-status', async () => {
      const allSuccess = publishResults.length > 0 && publishResults.every(r => r.success)
      const anySuccess = publishResults.some(r => r.success)

      const finalStatus = allSuccess ? 'COMPLETED' : anySuccess ? 'PARTIAL' : 'FAILED'

      await prisma.studioPublishJob.update({
        where: { id: publishJob.jobId },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          errorSummary: allSuccess
            ? null
            : publishResults.filter(r => !r.success).map(r => `${r.channel}: ${r.error}`).join('; '),
        },
      })

      await prisma.scheduledContent.update({
        where: { id: contentId },
        data: {
          status: allSuccess ? 'PUBLISHED' : 'FAILED',
          publishedAt: allSuccess ? new Date() : null,
          publishResults: publishResults,
          errorMessage: allSuccess
            ? null
            : publishResults.filter(r => !r.success).map(r => `${r.channel}: ${r.error}`).join('; '),
        },
      })

      console.log('[Inngest:Publish] Job completed', {
        jobId: publishJob.jobId,
        status: finalStatus,
        successCount: publishResults.filter(r => r.success).length,
        failCount: publishResults.filter(r => !r.success).length,
      })
    })

    return {
      success: true,
      data: {
        contentId,
        results: publishResults,
      },
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }
  }
)
