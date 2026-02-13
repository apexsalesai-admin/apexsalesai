/**
 * Brave Search API Route (P21)
 *
 * POST /api/studio/integrations/brave/search — Execute web search
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { braveSearch } from '@/lib/integrations/brave-search'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { query, count, freshness } = body as {
      query: string
      count?: number
      freshness?: 'day' | 'week' | 'month'
    }

    if (!query?.trim()) {
      return NextResponse.json(
        { success: false, error: 'query is required' },
        { status: 400 }
      )
    }

    const workspace = await getOrCreateWorkspace(session.user.id)
    const result = await braveSearch(query, workspace.id, { count, freshness })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed'
    console.error('[API:brave:search] POST error:', message)

    // Distinguish between config errors and API errors
    if (message.includes('not configured')) {
      return NextResponse.json({ success: false, error: message }, { status: 400 })
    }

    return NextResponse.json({ success: false, error: 'Search failed' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
