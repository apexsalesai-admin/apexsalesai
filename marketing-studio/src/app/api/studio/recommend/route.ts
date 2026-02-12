/**
 * Mia Recommendation API
 *
 * POST /api/studio/recommend — Returns provider recommendation for content
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { getRecommendation } from '@/lib/studio/mia-recommender'
import { checkRenderBudget } from '@/lib/providers/video/budget'

/** Map integration type to provider name */
const TYPE_TO_PROVIDER: Record<string, string> = {
  RUNWAY: 'runway',
  OPENAI: 'sora',
  HEYGEN: 'heygen',
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contentId, targetPlatform } = body as { contentId?: string; targetPlatform?: string }

    const workspace = await getOrCreateWorkspace(session.user.id)

    // Load content data if contentId provided
    let contentType = 'video'
    let tone = 'professional'
    let scriptLength = 0

    if (contentId) {
      const content = await prisma.scheduledContent.findUnique({
        where: { id: contentId },
        select: { contentType: true, aiTone: true, body: true },
      })
      if (content) {
        contentType = content.contentType || 'video'
        tone = content.aiTone || 'professional'
        scriptLength = content.body?.length || 0
      }
    }

    // Load connected providers
    const integrations = await prisma.studioIntegration.findMany({
      where: { workspaceId: workspace.id, status: 'CONNECTED' },
      select: { type: true },
    })
    const connectedProviders = integrations
      .map(i => TYPE_TO_PROVIDER[String(i.type)])
      .filter(Boolean)

    // Also check env vars for dev mode
    if (process.env.NODE_ENV === 'development') {
      if (process.env.RUNWAY_API_KEY && !connectedProviders.includes('runway')) {
        connectedProviders.push('runway')
      }
      if (process.env.OPENAI_API_KEY && !connectedProviders.includes('sora')) {
        connectedProviders.push('sora')
      }
      if (process.env.HEYGEN_API_KEY && !connectedProviders.includes('heygen')) {
        connectedProviders.push('heygen')
      }
    }

    // Get budget remaining
    const budget = await checkRenderBudget(workspace.id, 0)
    const remaining = budget.monthlyLimit - budget.monthlySpent

    const recommendation = getRecommendation({
      contentType,
      targetPlatform: targetPlatform || 'general',
      tone,
      scriptLength,
      connectedProviders,
      monthlyBudgetRemaining: remaining,
    })

    return NextResponse.json({ success: true, data: recommendation })
  } catch (error) {
    console.error('[API:recommend] POST error:', error)
    return NextResponse.json({ success: false, error: 'Recommendation failed' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
