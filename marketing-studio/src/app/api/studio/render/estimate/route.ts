/**
 * Render Cost Estimate API
 *
 * POST /api/studio/render/estimate — Returns cost estimate + budget context.
 *
 * Body: { provider: string, durationSeconds: number, aspectRatio?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { getVideoProviderOrThrow } from '@/lib/providers/video/registry'
import { checkRenderBudget } from '@/lib/providers/video/budget'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const providerName = body.provider || 'template'
    const durationSeconds = body.durationSeconds || 8
    const aspectRatio = body.aspectRatio || '16:9'
    const modelId = body.model as string | undefined

    const provider = getVideoProviderOrThrow(providerName)

    // Use model-specific costPerSecond if a model is selected
    let costPerSecond = provider.config.costPerSecond
    if (modelId && provider.config.models?.length) {
      const model = provider.config.models.find(m => m.id === modelId)
      if (model) costPerSecond = model.costPerSecond
    }
    const estimatedUsd = Math.round(costPerSecond * durationSeconds * 100) / 100
    const estimate = { credits: 0, usd: estimatedUsd }

    const workspace = await getOrCreateWorkspace(session.user.id)
    const budget = await checkRenderBudget(workspace.id, estimate.usd)

    return NextResponse.json({
      success: true,
      data: {
        provider: providerName,
        durationSeconds,
        aspectRatio,
        estimatedCredits: estimate.credits,
        estimatedUsd: estimate.usd,
        monthlySpent: budget.monthlySpent,
        monthlyLimit: budget.monthlyLimit,
        dailyAttempts: budget.dailyAttempts,
        dailyLimit: budget.dailyLimit,
        withinBudget: budget.allowed,
        warning: !budget.allowed ? budget.reason : undefined,
      },
    })
  } catch (error) {
    console.error('[API:render/estimate] POST error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to estimate cost' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
