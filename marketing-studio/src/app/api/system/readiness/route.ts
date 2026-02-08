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
import {
  getSystemReadiness,
  getOnboardingSteps,
  getPublishRequirements,
} from '@/lib/readiness'

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
        { status: 401 }
      )
    }

    // Get workspace ID from query params
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || undefined
    const includeOnboarding = searchParams.get('onboarding') === 'true'
    const includePublish = searchParams.get('publish') === 'true'

    // Get readiness status
    const readiness = await getSystemReadiness(workspaceId)

    // Build response
    const response: Record<string, unknown> = {
      success: true,
      readiness,
    }

    // Include onboarding steps if requested
    if (includeOnboarding) {
      response.onboarding = await getOnboardingSteps(workspaceId)
    }

    // Include publish requirements if requested
    if (includePublish) {
      response.publishRequirements = await getPublishRequirements(workspaceId)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[API:Readiness] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
