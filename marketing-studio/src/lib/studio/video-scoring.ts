/**
 * Video Auto-Pick Scoring Engine
 *
 * Pure scoring functions. No side effects, no API calls, no state.
 * Takes inputs → returns ranked providers with explainable scores.
 */

import type { VideoProviderMeta } from '@/lib/shared/video-providers'
import { getActiveProviders, estimateCost, estimateTestRenderCost } from '@/lib/shared/video-providers'

// ─── Input Types ────────────────────────────────────────────────────────────────

export type BudgetBand = '$0-$5' | '$5-$25' | '$25-$100' | 'unlimited'
export type QualityTier = 'fast' | 'balanced' | 'premium'

export interface ScoringInput {
  goal: string
  channels: string[]
  budgetBand: BudgetBand
  qualityTier: QualityTier
  durationSeconds: number
}

// ─── Output Types ───────────────────────────────────────────────────────────────

export interface ScoredProvider {
  provider: VideoProviderMeta
  totalScore: number
  qualityContribution: number
  latencyContribution: number
  fitContribution: number
  estimatedCost: number
  testRenderCost: number
  withinBudget: boolean
  reason: string
  disqualified: boolean
  disqualifyReason?: string
}

export interface RecommendationResult {
  recommended: ScoredProvider | null
  ranking: ScoredProvider[]
  fallbackUsed: boolean
}

// ─── Budget Caps ────────────────────────────────────────────────────────────────

const BUDGET_CAPS: Record<BudgetBand, number> = {
  '$0-$5': 5,
  '$5-$25': 25,
  '$25-$100': 100,
  'unlimited': Infinity,
}

// ─── Tier Weights ───────────────────────────────────────────────────────────────

const TIER_WEIGHTS: Record<QualityTier, { quality: number; latency: number; fit: number }> = {
  fast:     { quality: 0.20, latency: 0.55, fit: 0.25 },
  balanced: { quality: 0.40, latency: 0.35, fit: 0.25 },
  premium:  { quality: 0.55, latency: 0.20, fit: 0.25 },
}

// ─── Core Scoring Function ──────────────────────────────────────────────────────

export function scoreProviders(input: ScoringInput): RecommendationResult {
  const { goal, channels, budgetBand, qualityTier, durationSeconds } = input
  const providers = getActiveProviders()
  const weights = TIER_WEIGHTS[qualityTier]
  const budgetCap = BUDGET_CAPS[budgetBand]

  const scored: ScoredProvider[] = providers.map(provider => {
    // 1. Calculate fit score (0-100)
    const channelMatches = channels.filter(ch => provider.bestForChannels.includes(ch)).length
    const channelFit = channels.length > 0 ? (channelMatches / channels.length) * 100 : 50
    const goalFit = provider.bestForGoals.includes(goal) ? 100 : 30
    const fitScore = (channelFit * 0.6) + (goalFit * 0.4)

    // 2. Weighted composite
    const qualityContribution = provider.qualityScore * weights.quality
    const latencyContribution = provider.latencyScore * weights.latency
    const fitContribution = fitScore * weights.fit
    const totalScore = Math.round(qualityContribution + latencyContribution + fitContribution)

    // 3. Cost estimation
    const cost = estimateCost(provider.id, durationSeconds)
    const testCost = estimateTestRenderCost(provider.id)
    const withinBudget = cost <= budgetCap

    // 4. Build reason string
    const reason = buildReasonString(provider, qualityTier, channels, goal, cost, withinBudget, budgetBand)

    return {
      provider,
      totalScore,
      qualityContribution: Math.round(qualityContribution),
      latencyContribution: Math.round(latencyContribution),
      fitContribution: Math.round(fitContribution),
      estimatedCost: cost,
      testRenderCost: testCost,
      withinBudget,
      reason,
      disqualified: !withinBudget && budgetBand !== 'unlimited',
      disqualifyReason: !withinBudget && budgetBand !== 'unlimited'
        ? `Estimated cost $${cost.toFixed(2)} exceeds your ${budgetBand} budget`
        : undefined,
    }
  })

  // Sort: non-disqualified first (by score desc), then disqualified (by score desc)
  scored.sort((a, b) => {
    if (a.disqualified !== b.disqualified) return a.disqualified ? 1 : -1
    return b.totalScore - a.totalScore
  })

  const recommended = scored.find(s => !s.disqualified) || null
  const fallbackUsed = recommended === null && scored.length > 0

  return {
    recommended: recommended || (scored[0] || null),
    ranking: scored,
    fallbackUsed,
  }
}

// ─── Reason Builder ─────────────────────────────────────────────────────────────

function buildReasonString(
  provider: VideoProviderMeta,
  tier: QualityTier,
  channels: string[],
  goal: string,
  cost: number,
  withinBudget: boolean,
  budgetBand: BudgetBand
): string {
  const parts: string[] = []

  if (tier === 'premium' && provider.qualityScore >= 85) {
    parts.push(`Premium ${provider.category} quality (${provider.qualityScore}/100)`)
  } else if (tier === 'fast' && provider.latencyScore >= 55) {
    parts.push(`Fastest generation speed (${provider.latencyScore}/100)`)
  } else {
    parts.push(`${provider.qualityScore}/100 quality, ${provider.latencyScore}/100 speed`)
  }

  const matchingChannels = channels.filter(ch => provider.bestForChannels.includes(ch))
  if (matchingChannels.length > 0) {
    parts.push(`optimized for ${matchingChannels.join(' + ')}`)
  }

  if (provider.bestForGoals.includes(goal)) {
    parts.push(`strong for ${goal} content`)
  }

  if (withinBudget && budgetBand !== 'unlimited') {
    parts.push(`within your ${budgetBand} budget at $${cost.toFixed(2)}`)
  } else if (budgetBand === 'unlimited') {
    parts.push(`$${cost.toFixed(2)} estimated`)
  }

  return parts.join(' · ')
}
