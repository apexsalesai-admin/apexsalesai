/**
 * Video Recommendation API
 *
 * POST /api/studio/video/recommend
 * Server-side scoring + cost estimation. Filters to providers with valid API keys.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { scoreProviders } from '@/lib/studio/video-scoring'
import type { ScoringInput } from '@/lib/studio/video-scoring'
import { getActiveProviders } from '@/lib/shared/video-providers'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body: ScoringInput = await request.json()

    if (!body.goal || !body.channels || !body.budgetBand || !body.qualityTier || !body.durationSeconds) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    // Check which providers have API keys configured
    const providers = getActiveProviders()
    const availableProviders = providers.filter(p => {
      const key = process.env[p.apiKeyEnvVar]
      return key && key.length > 0
    })

    // Run scoring
    const result = scoreProviders(body)

    // Filter to only available providers
    const filteredRanking = result.ranking.filter(scored =>
      availableProviders.some(ap => ap.id === scored.provider.id)
    )

    const recommended = filteredRanking.find(s => !s.disqualified) || filteredRanking[0] || null

    return NextResponse.json({
      success: true,
      recommended,
      ranking: filteredRanking,
      fallbackUsed: result.fallbackUsed,
      availableProviderCount: availableProviders.length,
      totalProviderCount: providers.length,
    })
  } catch (error) {
    console.error('[video/recommend] Error:', error)
    return NextResponse.json({ success: false, error: 'Recommendation failed' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
