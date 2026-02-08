/**
 * Publish API Endpoint
 *
 * Triggers async publishing of content to multiple platforms via Inngest.
 *
 * POST /api/studio/publish
 * Body: { workspaceId, contentId, channels }
 * Returns: { success, jobId, eventId }
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { inngest } from '@/lib/inngest/client'
import { prisma } from '@/lib/db'
import { getPublishRequirements } from '@/lib/readiness'
import { assertWorkspaceAccess } from '@/lib/workspace'

// Request validation schema
const PublishRequestSchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId is required'),
  contentId: z.string().min(1, 'contentId is required'),
  channels: z.array(z.string()).min(1, 'At least one channel is required'),
})

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Auth gate (P9 hardening)
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

    const { workspaceId, contentId, channels } = validation.data

    // P10: Workspace authorization via membership
    const workspace = await assertWorkspaceAccess({
      workspaceId,
      userId: session.user.id,
    })

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: 'Workspace access denied' },
        { status: 403 }
      )
    }

    console.log('[API:Publish] Request received', {
      workspaceId,
      contentId,
      channels,
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

    // Verify content exists
    const content = await prisma.scheduledContent.findUnique({
      where: { id: contentId },
      select: { id: true, title: true, status: true },
    })

    if (!content) {
      console.error('[API:Publish] Content not found', { contentId })

      return NextResponse.json(
        {
          success: false,
          error: 'Content not found',
        },
        { status: 404 }
      )
    }

    // Send event to Inngest (workspace already verified by assertWorkspaceAccess)
    const { ids } = await inngest.send({
      name: 'studio/publish.content',
      data: {
        workspaceId,
        contentId,
        channels,
      },
    })

    const eventId = ids[0]

    console.log('[API:Publish] Event sent to Inngest', {
      eventId,
      workspaceId,
      contentId,
      channels,
      durationMs: Date.now() - startTime,
    })

    // Update content status to indicate publishing is in progress
    await prisma.scheduledContent.update({
      where: { id: contentId },
      data: {
        status: 'PUBLISHING',
      },
    })

    return NextResponse.json({
      success: true,
      eventId,
      message: 'Publishing job queued',
      data: {
        workspaceId,
        contentId,
        channels,
        contentTitle: content.title,
      },
    })
  } catch (error) {
    console.error('[API:Publish] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check publish job status
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
      const job = await prisma.studioPublishJob.findUnique({
        where: { id: jobId },
        include: {
          results: true,
        },
      })

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
    const jobs = await prisma.studioPublishJob.findMany({
      where: { contentId: contentId! },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        results: true,
      },
    })

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
