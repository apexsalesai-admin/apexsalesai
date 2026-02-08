/**
 * Public Readiness Diagnostics API
 *
 * Returns system health status without authentication.
 * Does not expose sensitive data.
 *
 * GET /api/diagnostics/readiness
 */

import { NextResponse } from 'next/server'
import { getSystemReadiness } from '@/lib/readiness'

export async function GET() {
  try {
    const readiness = await getSystemReadiness()

    // Return sanitized readiness data
    return NextResponse.json({
      success: true,
      readiness: {
        authConfigured: readiness.authConfigured,
        aiConfigured: readiness.aiConfigured,
        databaseConnected: readiness.databaseConnected,
        inngestConnected: readiness.inngestConnected,
        workspaceExists: readiness.workspaceExists,
        brandVoiceConfigured: readiness.brandVoiceConfigured,
        platformConnected: readiness.platformConnected,
        overallReady: readiness.overallReady,
        overallScore: readiness.overallScore,
        checks: readiness.checks.map((c) => ({
          name: c.name,
          status: c.status,
          required: c.required,
        })),
      },
      timestamp: readiness.timestamp,
    })
  } catch (error) {
    console.error('[API:Diagnostics:Readiness] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check system readiness',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
