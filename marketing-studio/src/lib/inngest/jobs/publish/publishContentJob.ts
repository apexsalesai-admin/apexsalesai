/**
 * Publish Content Job
 *
 * Handles async publishing of ScheduledContent to multiple platforms.
 * Uses existing StudioPublishJob and StudioPublishResult Prisma models.
 *
 * Workflow:
 * 1. Load content from database
 * 2. Create publish job record
 * 3. Create per-channel publish result records
 * 4. Execute publishing connector for each channel
 * 5. Update result status per channel
 * 6. Update overall job status
 */

import { inngest } from '../../client'
import { prisma } from '@/lib/db'
import { publishToPlatform } from '../../connectors'
import { safeDecrypt } from '@/lib/encryption'
import type { JobResult, PublishJobOutput } from '../../types'
import { StudioIntegrationType } from '@prisma/client'

// Map channel strings to StudioIntegrationType enum values
function mapChannelToIntegrationType(channel: string): StudioIntegrationType | null {
  const mapping: Record<string, StudioIntegrationType> = {
    'LINKEDIN': 'LINKEDIN',
    'YOUTUBE': 'YOUTUBE',
    'TIKTOK': 'TIKTOK',
    'X_TWITTER': 'X_TWITTER',
    'TWITTER': 'X_TWITTER',
    'FACEBOOK': 'FACEBOOK',
    'INSTAGRAM': 'INSTAGRAM',
    'THREADS': 'THREADS',
    'PINTEREST': 'PINTEREST',
    'REDDIT': 'FACEBOOK', // Using FACEBOOK as proxy
  }
  return mapping[channel.toUpperCase()] || null
}

export const publishContentJob = inngest.createFunction(
  {
    id: 'publish-content',
    name: 'Publish Content to Platforms',
    retries: 3,
    concurrency: {
      limit: 10,
    },
  },
  { event: 'studio/publish.content' },
  async ({ event, step }): Promise<JobResult<PublishJobOutput>> => {
    const startTime = Date.now()
    const { contentId, channels, workspaceId } = event.data as {
      contentId: string
      channels: string[]
      workspaceId: string
    }

    // Structured logging
    const logContext = {
      jobId: '',
      workspaceId,
      contentId,
      channels,
      eventId: event.id,
    }

    console.log('[Inngest:Publish] Job started', logContext)

    // Step 1: Load content from database
    const content = await step.run('load-content', async () => {
      const record = await prisma.scheduledContent.findUnique({
        where: { id: contentId },
      })

      if (!record) {
        console.error('[Inngest:Publish] Content not found', { contentId })
        throw new Error(`Content not found: ${contentId}`)
      }

      console.log('[Inngest:Publish] Content loaded', {
        contentId,
        title: record.title,
        status: record.status,
      })

      return {
        id: record.id,
        title: record.title,
        body: record.body,
        hashtags: record.hashtags as string[],
        callToAction: record.callToAction,
        channels: record.channels as string[],
        status: record.status,
      }
    })

    // Step 2: Create publish job record
    const publishJob = await step.run('create-publish-job', async () => {
      const job = await prisma.studioPublishJob.create({
        data: {
          workspaceId,
          contentId,
          status: 'PENDING',
          targetChannels: channels,
          scheduledFor: new Date(),
        },
      })

      console.log('[Inngest:Publish] Job record created', {
        jobId: job.id,
        status: job.status,
      })

      return { jobId: job.id }
    })

    logContext.jobId = publishJob.jobId

    // Step 3: Create publish result records for each channel
    const resultRecords = await step.run('create-result-records', async () => {
      const records = await Promise.all(
        channels.map(async (channel) => {
          const integrationType = mapChannelToIntegrationType(channel)

          if (!integrationType) {
            console.warn('[Inngest:Publish] Unknown channel type', { channel })
            return null
          }

          const result = await prisma.studioPublishResult.create({
            data: {
              publishJobId: publishJob.jobId,
              channel: integrationType,
              status: 'PENDING',
              platformResponse: {},
            },
          })

          return {
            id: result.id,
            channel,
            integrationType,
          }
        })
      )

      const validRecords = records.filter(Boolean) as {
        id: string
        channel: string
        integrationType: StudioIntegrationType
      }[]

      console.log('[Inngest:Publish] Result records created', {
        count: validRecords.length,
        channels: validRecords.map((r) => r.channel),
      })

      return validRecords
    })

    // Step 4: Update job status to PUBLISHING
    await step.run('update-job-publishing', async () => {
      await prisma.studioPublishJob.update({
        where: { id: publishJob.jobId },
        data: {
          status: 'PUBLISHING',
          startedAt: new Date(),
        },
      })
    })

    // Step 5: Execute publishing for each channel
    const publishResults = await step.run('publish-to-platforms', async () => {
      const results = await Promise.all(
        resultRecords.map(async (record) => {
          // Update result to PUBLISHING
          await prisma.studioPublishResult.update({
            where: { id: record.id },
            data: { status: 'PUBLISHING' },
          })

          // Get access token from integration (if available)
          // Note: Tokens are encrypted in production - decryption would be needed
          const integration = await prisma.studioIntegration.findFirst({
            where: {
              workspaceId,
              type: record.integrationType,
              status: 'CONNECTED',
            },
          })

          // Decrypt the OAuth token for real API publishing
          const accessToken = integration?.accessTokenEncrypted
            ? safeDecrypt(integration.accessTokenEncrypted) ?? undefined
            : undefined

          // Execute connector
          const publishResult = await publishToPlatform(
            record.channel,
            {
              title: content.title,
              body: content.body,
              hashtags: content.hashtags,
              callToAction: content.callToAction || undefined,
            },
            accessToken
          )

          // Update result record
          await prisma.studioPublishResult.update({
            where: { id: record.id },
            data: {
              status: publishResult.success ? 'SUCCESS' : 'FAILED',
              externalPostId: publishResult.externalPostId,
              permalink: publishResult.permalink,
              platformResponse: JSON.parse(JSON.stringify(publishResult.platformResponse)),
            },
          })

          console.log('[Inngest:Publish] Channel result', {
            channel: record.channel,
            success: publishResult.success,
            externalPostId: publishResult.externalPostId,
            error: publishResult.error,
          })

          return {
            channel: record.channel,
            success: publishResult.success,
            postId: publishResult.externalPostId,
            permalink: publishResult.permalink,
            error: publishResult.error,
          }
        })
      )

      return results
    })

    // Step 6: Update final job status
    await step.run('update-job-final', async () => {
      const allSuccess = publishResults.every((r) => r.success)
      const anySuccess = publishResults.some((r) => r.success)

      let finalStatus: 'COMPLETED' | 'PARTIAL' | 'FAILED'
      if (allSuccess) {
        finalStatus = 'COMPLETED'
      } else if (anySuccess) {
        finalStatus = 'PARTIAL'
      } else {
        finalStatus = 'FAILED'
      }

      await prisma.studioPublishJob.update({
        where: { id: publishJob.jobId },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          errorSummary: allSuccess
            ? null
            : publishResults
                .filter((r) => !r.success)
                .map((r) => `${r.channel}: ${r.error}`)
                .join('; '),
        },
      })

      // Also update the ScheduledContent status
      await prisma.scheduledContent.update({
        where: { id: contentId },
        data: {
          status: allSuccess ? 'PUBLISHED' : anySuccess ? 'FAILED' : 'FAILED',
          publishedAt: allSuccess ? new Date() : null,
          publishResults: publishResults,
          errorMessage: allSuccess
            ? null
            : publishResults
                .filter((r) => !r.success)
                .map((r) => `${r.channel}: ${r.error}`)
                .join('; '),
        },
      })

      console.log('[Inngest:Publish] Job completed', {
        jobId: publishJob.jobId,
        status: finalStatus,
        successCount: publishResults.filter((r) => r.success).length,
        failCount: publishResults.filter((r) => !r.success).length,
      })
    })

    const durationMs = Date.now() - startTime

    console.log('[Inngest:Publish] Job finished', {
      ...logContext,
      durationMs,
      status: 'completed',
    })

    return {
      success: true,
      data: {
        contentId,
        results: publishResults,
      },
      durationMs,
      timestamp: new Date().toISOString(),
    }
  }
)
