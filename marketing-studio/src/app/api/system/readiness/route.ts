/**
 * System Readiness API
 *
 * Returns comprehensive system health and configuration status.
 * Used by dashboard, onboarding, and publish gates.
 *
 * GET /api/system/readiness
 * GET /api/system/readiness?workspaceId=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import {
  getSystemReadiness,
  getOnboardingSteps,
  getPublishRequirements,
} from '@/lib/readiness'

// Prevent any caching — readiness must always be fresh
const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401, headers: NO_CACHE_HEADERS }
      )
    }

    // Get workspace ID from query params
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || undefined
    const includeOnboarding = searchParams.get('onboarding') === 'true'
    const includePublish = searchParams.get('publish') === 'true'

    // Get readiness status — pass workspaceId to scope workspace-specific checks
    const readiness = await getSystemReadiness({ workspaceId })

    // Fetch DB integrations for status badges
    let dbIntegrations: Array<{
      id: string
      type: string
      status: string
      externalName: string | null
      lastTestResult: string | null
    }> = []
    try {
      const integrations = await prisma.studioIntegration.findMany({
        where: workspaceId ? { workspaceId } : {},
        select: {
          id: true,
          type: true,
          status: true,
          externalName: true,
          lastTestResult: true,
        },
        orderBy: { createdAt: 'desc' },
      })
      dbIntegrations = integrations
    } catch {
      // Fail gracefully — integrations list is non-critical
    }

    // Build response — timestamp at envelope level per spec
    const response: Record<string, unknown> = {
      success: true,
      readiness: { ...readiness, dbIntegrations },
      timestamp: new Date().toISOString(),
    }

    // Include onboarding steps if requested
    if (includeOnboarding) {
      response.onboarding = await getOnboardingSteps({ workspaceId })
    }

    // Include publish requirements if requested
    if (includePublish) {
      response.publishRequirements = await getPublishRequirements({ workspaceId })
    }

    return NextResponse.json(response, { headers: NO_CACHE_HEADERS })
  } catch (error) {
    console.error('[API:Readiness] Error:', error)

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
