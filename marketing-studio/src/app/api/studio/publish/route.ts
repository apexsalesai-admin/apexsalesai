/**
 * Publish API Endpoint
 *
 * Executes publishing of content to multiple platforms directly.
 * Looks up tokens from PublishingChannel, calls platform APIs inline,
 * and records results in StudioPublishJob / StudioPublishResult.
 *
 * P25-B-FIX4: Replaced Inngest fire-and-forget with direct execution
 * to eliminate dependency on Inngest Cloud sync.
 *
 * POST /api/studio/publish
 * Body: { workspaceId?, contentId, channels }
 * Returns: { success, jobId, data: { results } }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, withRetry } from '@/lib/db'
import { getPublishRequirements } from '@/lib/readiness'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { publishToLinkedIn } from '@/lib/studio/publishing/publishers/linkedin'
import { publishToX } from '@/lib/studio/publishing/publishers/x'
import { StudioIntegrationType } from '@prisma/client'

// ── Platform mapping ────────────────────────────────────────────────
// Maps any channel identifier (uppercase enum, lowercase platform name,
// or common aliases) to the PublishingChannel.platform value and the
// Prisma StudioIntegrationType enum used for StudioPublishResult.
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

// Request validation schema — workspaceId is optional (resolved server-side if absent)
const PublishRequestSchema = z.object({
  workspaceId: z.string().min(1).optional(),
  contentId: z.string().min(1, 'contentId is required'),
  channels: z.array(z.string()).min(1, 'At least one channel is required'),
})

// ── Helpers ─────────────────────────────────────────────────────────

/** Assemble the full post text from ScheduledContent fields */
function buildPublishText(content: {
  title: string
  body: string
  hashtags: string[]
  callToAction: string | null
}): string {
  let text = content.title
  if (content.body) text += `\n\n${content.body}`
  if (content.hashtags?.length) {
    text += '\n\n' + content.hashtags.map(h => (h.startsWith('#') ? h : `#${h}`)).join(' ')
  }
  if (content.callToAction) text += `\n\n${content.callToAction}`
  return text
}

// ── POST — publish now ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let contentId: string | undefined

  try {
    // Auth gate
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = PublishRequestSchema.safeParse(body)

    if (!validation.success) {
      console.error('[API:Publish] Validation failed', {
        errors: validation.error.flatten(),
      })

      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    contentId = validation.data.contentId
    const channels = validation.data.channels
    const userId = session.user.id

    // Resolve workspace: use provided ID or resolve from session user
    const workspace = validation.data.workspaceId
      ? await withRetry(() => prisma.studioWorkspace.findUnique({
          where: { id: validation.data.workspaceId },
          select: { id: true, name: true },
        }))
      : await getOrCreateWorkspace(session.user.id)

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: 'Workspace not found' },
        { status: 404 }
      )
    }

    const workspaceId = workspace.id

    console.log('[API:Publish] Request received', {
      workspaceId,
      contentId,
      channels,
      userId,
    })

    // Check system readiness before publishing (scoped to workspace)
    const publishRequirements = await getPublishRequirements({ workspaceId })

    if (!publishRequirements.canPublish) {
      console.error('[API:Publish] System not ready', {
        missing: publishRequirements.missing,
      })

      return NextResponse.json(
        {
          success: false,
          error: 'System not ready for publishing',
          missing: publishRequirements.missing,
          message:
            'Please complete system setup before publishing. Missing: ' +
            publishRequirements.missing.join(', '),
        },
        { status: 400 }
      )
    }

    // Load content
    const content = await withRetry(() => prisma.scheduledContent.findUnique({
      where: { id: contentId },
    }))

    if (!content) {
      console.error('[API:Publish] Content not found', { contentId })
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      )
    }

    // ── Set status to PUBLISHING ──────────────────────────────────
    await withRetry(() => prisma.scheduledContent.update({
      where: { id: contentId },
      data: { status: 'PUBLISHING' },
    }))

    // ── Create StudioPublishJob record ────────────────────────────
    const publishJob = await prisma.studioPublishJob.create({
      data: {
        workspaceId,
        contentId,
        status: 'PUBLISHING',
        targetChannels: channels,
        startedAt: new Date(),
      },
    })

    console.log('[API:Publish] Job created', { jobId: publishJob.id })

    // ── Execute publishing for each channel ───────────────────────
    const text = buildPublishText({
      title: content.title,
      body: content.body,
      hashtags: content.hashtags as string[],
      callToAction: content.callToAction,
    })

    const results: Array<{
      channel: string
      success: boolean
      postId?: string
      permalink?: string
      error?: string
    }> = []

    // De-duplicate channels (e.g. if LINKEDIN appears twice)
    const uniqueChannels = Array.from(new Set(channels))

    for (const channel of uniqueChannels) {
      const mapped = PLATFORM_MAP[channel]

      if (!mapped) {
        results.push({ channel, success: false, error: `Unsupported platform: ${channel}` })
        await prisma.studioPublishResult.create({
          data: {
            publishJobId: publishJob.id,
            channel: 'LINKEDIN', // fallback to avoid enum error
            status: 'FAILED',
            errorMessage: `Unsupported platform: ${channel}`,
            platformResponse: { error: `Unsupported platform: ${channel}` },
          },
        }).catch(() => {})
        continue
      }

      // Look up the user's connected channel for this platform
      const pubChannel = await prisma.publishingChannel.findFirst({
        where: { userId, platform: mapped.dbPlatform, isActive: true },
        orderBy: { connectedAt: 'desc' },
      })

      if (!pubChannel) {
        const errMsg = `No connected ${channel} channel found. Please connect your account in Integrations.`
        results.push({ channel, success: false, error: errMsg })
        await prisma.studioPublishResult.create({
          data: {
            publishJobId: publishJob.id,
            channel: mapped.integrationType,
            status: 'FAILED',
            errorMessage: errMsg,
            platformResponse: { error: 'no_channel' },
          },
        }).catch(() => {})
        continue
      }

      if (!pubChannel.accessToken) {
        const errMsg = `${channel} channel has no access token. Please reconnect your account.`
        results.push({ channel, success: false, error: errMsg })
        await prisma.studioPublishResult.create({
          data: {
            publishJobId: publishJob.id,
            channel: mapped.integrationType,
            status: 'FAILED',
            errorMessage: errMsg,
            platformResponse: { error: 'no_token' },
          },
        }).catch(() => {})
        continue
      }

      // ── Platform-specific publish ─────────────────────────────
      let publishResult: {
        success: boolean
        postId?: string
        postUrl?: string
        error?: string
      }

      try {
        if (mapped.dbPlatform === 'linkedin') {
          const metadata = pubChannel.metadata as Record<string, string> | null
          const personUrn = metadata?.personUrn

          if (!personUrn) {
            publishResult = {
              success: false,
              error: 'Missing LinkedIn person URN. Please reconnect your LinkedIn account.',
            }
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
          publishResult = {
            success: false,
            error: `Platform ${channel} publishing is not yet implemented`,
          }
        }
      } catch (err) {
        console.error(`[API:Publish] ${channel} error:`, err)
        publishResult = {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown publish error',
        }
      }

      // Record the result
      await prisma.studioPublishResult.create({
        data: {
          publishJobId: publishJob.id,
          channel: mapped.integrationType,
          status: publishResult.success ? 'SUCCESS' : 'FAILED',
          externalPostId: publishResult.postId || null,
          permalink: publishResult.postUrl || null,
          publishedAt: publishResult.success ? new Date() : null,
          errorMessage: publishResult.error || null,
          platformResponse: JSON.parse(JSON.stringify(publishResult)),
        },
      }).catch((e) => console.error('[API:Publish] Failed to save result record:', e))

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

      console.log('[API:Publish] Channel result', {
        channel,
        success: publishResult.success,
        postId: publishResult.postId,
        error: publishResult.error,
      })
    }

    // ── Final status updates ──────────────────────────────────────
    const allSuccess = results.length > 0 && results.every(r => r.success)
    const anySuccess = results.some(r => r.success)

    const finalJobStatus = allSuccess ? 'COMPLETED' : anySuccess ? 'PARTIAL' : 'FAILED'
    const finalContentStatus = allSuccess ? 'PUBLISHED' : 'FAILED'

    await prisma.studioPublishJob.update({
      where: { id: publishJob.id },
      data: {
        status: finalJobStatus,
        completedAt: new Date(),
        errorSummary: allSuccess
          ? null
          : results.filter(r => !r.success).map(r => `${r.channel}: ${r.error}`).join('; '),
      },
    })

    await prisma.scheduledContent.update({
      where: { id: contentId },
      data: {
        status: finalContentStatus,
        publishedAt: allSuccess ? new Date() : null,
        publishResults: results,
        errorMessage: allSuccess
          ? null
          : results.filter(r => !r.success).map(r => `${r.channel}: ${r.error}`).join('; '),
      },
    })

    const durationMs = Date.now() - startTime

    console.log('[API:Publish] Completed', {
      jobId: publishJob.id,
      contentId,
      finalJobStatus,
      durationMs,
      successCount: results.filter(r => r.success).length,
      failCount: results.filter(r => !r.success).length,
    })

    return NextResponse.json({
      success: allSuccess || anySuccess,
      jobId: publishJob.id,
      message: allSuccess
        ? 'Published successfully'
        : anySuccess
          ? 'Partially published — some channels failed'
          : 'Publishing failed',
      data: {
        workspaceId,
        contentId,
        contentTitle: content.title,
        channels,
        results,
        durationMs,
      },
    })
  } catch (error) {
    console.error('[API:Publish] Error:', error)

    // CRITICAL: Reset content status from PUBLISHING to FAILED on unhandled errors
    // This prevents content getting stuck in PUBLISHING state indefinitely
    if (contentId) {
      await prisma.scheduledContent.update({
        where: { id: contentId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Internal server error',
        },
      }).catch((e) => console.error('[API:Publish] Failed to reset content status:', e))
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

// ── GET — check publish job status ──────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get('jobId')
  const contentId = searchParams.get('contentId')

  if (!jobId && !contentId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Either jobId or contentId is required',
      },
      { status: 400 }
    )
  }

  try {
    if (jobId) {
      // Fetch specific job with results
      const job = await withRetry(() => prisma.studioPublishJob.findUnique({
        where: { id: jobId },
        include: {
          results: true,
        },
      }))

      if (!job) {
        return NextResponse.json(
          { success: false, error: 'Job not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          contentId: job.contentId,
          targetChannels: job.targetChannels,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          errorSummary: job.errorSummary,
          results: job.results.map((r) => ({
            channel: r.channel,
            status: r.status,
            externalPostId: r.externalPostId,
            permalink: r.permalink,
          })),
        },
      })
    }

    // Fetch jobs for content
    const jobs = await withRetry(() => prisma.studioPublishJob.findMany({
      where: { contentId: contentId! },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        results: true,
      },
    }))

    return NextResponse.json({
      success: true,
      data: jobs.map((job) => ({
        jobId: job.id,
        status: job.status,
        targetChannels: job.targetChannels,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        resultCount: job.results.length,
      })),
    })
  } catch (error) {
    console.error('[API:Publish:GET] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
