/**
 * LinkedIn Direct Publish API
 *
 * POST /api/publish/linkedin
 *
 * Publishes a text post to LinkedIn using real API calls.
 * Requires:
 * - Authentication (NextAuth session)
 * - System readiness (platform connected)
 * - confirm=true in body (safe-mode gate)
 * - A CONNECTED LinkedIn integration with a valid encrypted token
 *
 * Persists results to StudioPublishResult + StudioAuditLog.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { safeDecrypt } from '@/lib/encryption'
import {
  publishLinkedInTextPost,
  validateLinkedInText,
} from '@/lib/publishing/linkedinPublisher'

const LOG_PREFIX = '[API:Publish:LinkedIn]'

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // ── Auth Gate ──────────────────────────────────────────────────────
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: NO_CACHE_HEADERS }
      )
    }

    // ── Parse Body ─────────────────────────────────────────────────────
    const body = await request.json()
    const { text, confirm, workspaceId, visibility } = body as {
      text?: string
      confirm?: boolean
      workspaceId?: string
      visibility?: 'PUBLIC' | 'CONNECTIONS'
    }

    // ── Safe-Mode Gate ─────────────────────────────────────────────────
    if (confirm !== true) {
      return NextResponse.json(
        {
          success: false,
          error: 'Safe-mode: you must pass confirm=true to publish',
          hint: 'This prevents accidental publishes. Set confirm: true in the request body.',
        },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    // ── Validate Text ──────────────────────────────────────────────────
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'text field is required (string)' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const validation = validateLinkedInText(text)
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
          characterCount: validation.characterCount,
        },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    console.log(LOG_PREFIX, 'Publish request received', {
      textLength: text.length,
      userEmail: session.user.email,
      workspaceId: workspaceId || '(global)',
    })

    // ── Find CONNECTED LinkedIn Integration ────────────────────────────
    const integration = await prisma.studioIntegration.findFirst({
      where: {
        type: 'LINKEDIN',
        status: 'CONNECTED',
        ...(workspaceId ? { workspaceId } : {}),
      },
      select: {
        id: true,
        workspaceId: true,
        accessTokenEncrypted: true,
        tokenExpiresAt: true,
        externalName: true,
      },
    })

    if (!integration) {
      return NextResponse.json(
        {
          success: false,
          error: 'No connected LinkedIn integration found',
          hint: 'Connect LinkedIn on the Integrations page first.',
        },
        { status: 404, headers: NO_CACHE_HEADERS }
      )
    }

    // ── Decrypt Token ──────────────────────────────────────────────────
    const accessToken = safeDecrypt(integration.accessTokenEncrypted)
    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to decrypt LinkedIn access token',
          hint: 'The encryption key may have changed. Re-connect LinkedIn.',
        },
        { status: 500, headers: NO_CACHE_HEADERS }
      )
    }

    // ── Check Token Expiry (best-effort) ───────────────────────────────
    if (integration.tokenExpiresAt && integration.tokenExpiresAt < new Date()) {
      return NextResponse.json(
        {
          success: false,
          error: 'LinkedIn token has expired',
          expiresAt: integration.tokenExpiresAt.toISOString(),
          hint: 'Re-connect LinkedIn to get a fresh token.',
        },
        { status: 401, headers: NO_CACHE_HEADERS }
      )
    }

    // ── Publish ────────────────────────────────────────────────────────
    const result = await publishLinkedInTextPost(accessToken, {
      text,
      visibility: visibility || 'PUBLIC',
    })

    // ── Persist: Audit Log ─────────────────────────────────────────────
    try {
      await prisma.studioAuditLog.create({
        data: {
          workspaceId: integration.workspaceId,
          action: result.success ? 'CONTENT_PUBLISHED' : 'PUBLISH_JOB_FAILED',
          userId: session.user.email,
          userEmail: session.user.email,
          resourceType: 'LINKEDIN_POST',
          resourceId: result.externalPostId || 'unknown',
          details: {
            channel: 'LINKEDIN',
            textLength: text.length,
            success: result.success,
            errorType: result.errorType,
            errorMessage: result.errorMessage,
            permalink: result.permalink,
            durationMs: result.durationMs,
            httpStatus: result.httpStatus,
          },
        },
      })
    } catch (auditErr) {
      // Audit log failure is non-fatal
      console.error(LOG_PREFIX, 'Audit log write failed:', auditErr)
    }

    // ── Persist: Publish Result (create a lightweight job + result) ────
    if (result.success) {
      try {
        const job = await prisma.studioPublishJob.create({
          data: {
            workspaceId: integration.workspaceId,
            contentId: 'direct-publish', // No ScheduledContent for direct test publishes
            status: 'COMPLETED',
            targetChannels: ['LINKEDIN'],
            startedAt: new Date(startTime),
            completedAt: new Date(),
          },
        })

        await prisma.studioPublishResult.create({
          data: {
            publishJobId: job.id,
            channel: 'LINKEDIN',
            integrationId: integration.id,
            status: 'SUCCESS',
            externalPostId: result.externalPostId,
            permalink: result.permalink,
            platformResponse: JSON.parse(JSON.stringify(result.platformResponse)),
            publishedAt: new Date(),
          },
        })
      } catch (persistErr) {
        // Non-fatal — the LinkedIn post is already live
        console.error(LOG_PREFIX, 'Result persistence failed:', persistErr)
      }
    }

    // ── Response ───────────────────────────────────────────────────────
    const elapsed = Date.now() - startTime

    console.log(LOG_PREFIX, 'Complete', {
      success: result.success,
      postId: result.externalPostId,
      durationMs: elapsed,
    })

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          postId: result.externalPostId,
          permalink: result.permalink,
          durationMs: elapsed,
          timestamp: new Date().toISOString(),
        },
        { headers: NO_CACHE_HEADERS }
      )
    }

    // Error response with classification
    return NextResponse.json(
      {
        success: false,
        errorType: result.errorType,
        error: result.errorMessage,
        httpStatus: result.httpStatus,
        durationMs: elapsed,
        timestamp: new Date().toISOString(),
      },
      {
        status: result.httpStatus && result.httpStatus < 500 ? result.httpStatus : 502,
        headers: NO_CACHE_HEADERS,
      }
    )
  } catch (error) {
    console.error(LOG_PREFIX, 'Unhandled error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
