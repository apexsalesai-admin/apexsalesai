/**
 * Integration Health Test API
 *
 * Returns token health status for all platform integrations.
 *
 * GET /api/integrations/test
 * GET /api/integrations/test?workspaceId=xxx
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkIntegrationHealth } from '@/lib/integrations/tokenHealth'

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: NO_CACHE_HEADERS }
      )
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId') || undefined

    const integrations = await checkIntegrationHealth(workspaceId)

    return NextResponse.json(
      {
        success: true,
        integrations,
        timestamp: new Date().toISOString(),
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error) {
    console.error('[API:Integrations:Test] Error:', error)

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
