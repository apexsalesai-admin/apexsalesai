/**
 * Mia Provider Recommendation Engine
 *
 * Recommends the optimal video provider based on content type,
 * target platform, available providers, and budget.
 */

export interface MiaRecommendation {
  provider: string
  model?: string
  confidence: 'high' | 'medium' | 'low'
  reason: string
  estimatedCost: number
  estimatedDuration: string
  alternatives: Array<{
    provider: string
    reason: string
    estimatedCost: number
  }>
}

export interface RecommendationContext {
  contentType: string        // 'social_post' | 'blog' | 'ad' | 'email' | 'presentation' | 'video'
  targetPlatform: string     // 'youtube' | 'linkedin' | 'tiktok' | 'instagram' | 'email' | 'general'
  tone: string               // 'professional' | 'casual' | 'bold' | 'educational'
  scriptLength: number       // character count
  connectedProviders: string[]
  monthlyBudgetRemaining: number
}

interface ProviderScore {
  provider: string
  model?: string
  score: number
  reason: string
  cost: number
  duration: string
}

/** Scoring matrix: [contentType][platform] → preferred providers */
const PREFERENCE_MATRIX: Record<string, Record<string, string[]>> = {
  video: {
    youtube: ['sora', 'runway', 'heygen'],
    linkedin: ['heygen', 'sora', 'runway'],
    tiktok: ['sora', 'runway'],
    instagram: ['sora', 'runway'],
    email: ['heygen', 'template'],
    general: ['sora', 'runway', 'heygen'],
  },
  social_post: {
    youtube: ['sora', 'runway'],
    linkedin: ['heygen', 'sora'],
    tiktok: ['sora', 'runway'],
    instagram: ['sora', 'runway'],
    email: ['template', 'heygen'],
    general: ['sora', 'runway'],
  },
  ad: {
    youtube: ['runway', 'sora'],
    linkedin: ['sora', 'heygen'],
    tiktok: ['sora', 'runway'],
    instagram: ['sora', 'runway'],
    email: ['heygen', 'template'],
    general: ['runway', 'sora'],
  },
  blog: {
    youtube: ['sora', 'runway'],
    linkedin: ['heygen', 'template'],
    tiktok: ['sora'],
    instagram: ['sora'],
    email: ['template'],
    general: ['template', 'sora'],
  },
  email: {
    youtube: ['template'],
    linkedin: ['heygen', 'template'],
    tiktok: ['template'],
    instagram: ['template'],
    email: ['heygen', 'template'],
    general: ['heygen', 'template'],
  },
  presentation: {
    youtube: ['sora', 'runway'],
    linkedin: ['heygen', 'sora'],
    tiktok: ['sora'],
    instagram: ['sora'],
    email: ['heygen', 'template'],
    general: ['heygen', 'sora'],
  },
}

const PROVIDER_REASONS: Record<string, Record<string, string>> = {
  sora: {
    youtube: 'Cinematic quality with synchronized audio — ideal for YouTube (4-12s)',
    linkedin: 'Professional cinematic video that stands out in the LinkedIn feed',
    tiktok: 'Fast, engaging clips optimized for social (4-12s)',
    instagram: 'Stunning visual quality for Instagram Reels',
    email: 'Eye-catching video thumbnail to boost open rates',
    general: 'Cinematic AI video with synchronized audio by OpenAI (4-12s)',
  },
  runway: {
    youtube: 'Hollywood-grade visual fidelity, perfect for long-form YouTube content',
    linkedin: 'Cinematic B-roll that elevates your professional brand',
    tiktok: 'High-fidelity short-form clips that stop the scroll',
    instagram: 'Visually stunning content for feed and stories',
    email: 'Premium video content for email campaigns',
    general: 'Unmatched visual quality from Runway Gen-4.5',
  },
  heygen: {
    youtube: 'AI presenter for explainer and tutorial content',
    linkedin: 'Personalized avatar video increases reply rates 3x',
    tiktok: 'Talking-head format that builds authenticity',
    instagram: 'Personal connection with AI avatar presenter',
    email: 'Personalized avatar outreach increases response rates',
    general: 'AI avatar talking-head video for personal touch',
  },
  template: {
    youtube: 'Quick storyboard preview before investing in production',
    linkedin: 'Instant script visualization for review',
    tiktok: 'Fast storyboard for content planning',
    instagram: 'Quick visual preview of your content',
    email: 'Instant storyboard — perfect for review before production',
    general: 'Instant storyboard preview — no cost, no API key needed',
  },
}

const COST_ESTIMATES: Record<string, number> = {
  sora: 0.80,          // ~$0.80 for 8s clip (sora-2)
  runway: 2.72,        // ~$2.72 for 8s clip
  heygen: 0.50,        // ~$0.50 for 30s
  template: 0,
}

const DURATION_ESTIMATES: Record<string, string> = {
  sora: '~90 seconds',
  runway: '~60 seconds',
  heygen: '~120 seconds',
  template: 'instant',
}

export function getRecommendation(ctx: RecommendationContext): MiaRecommendation {
  const { contentType, targetPlatform, connectedProviders, monthlyBudgetRemaining } = ctx

  // Get preference order for this content type + platform
  const prefs = PREFERENCE_MATRIX[contentType]?.[targetPlatform]
    || PREFERENCE_MATRIX[contentType]?.general
    || PREFERENCE_MATRIX.video?.general
    || ['sora', 'runway', 'heygen', 'template']

  // Score each provider
  const scores: ProviderScore[] = prefs.map((provider, index) => {
    const cost = COST_ESTIMATES[provider] ?? 0
    const isConnected = connectedProviders.includes(provider) || provider === 'template'
    const withinBudget = cost <= monthlyBudgetRemaining

    let score = (prefs.length - index) * 10 // Base score from preference order
    if (isConnected) score += 50
    if (withinBudget) score += 30
    if (cost === 0) score += 10 // Slight bonus for free

    // Penalty if not connected
    if (!isConnected) score -= 40

    // Penalty if over budget
    if (!withinBudget) score -= 60

    const reason = PROVIDER_REASONS[provider]?.[targetPlatform]
      || PROVIDER_REASONS[provider]?.general
      || `${provider} video generation`

    return {
      provider,
      model: provider === 'sora' ? 'sora-2' : undefined,
      score,
      reason,
      cost,
      duration: DURATION_ESTIMATES[provider] || '~60 seconds',
    }
  })

  // Always include template as a fallback
  if (!scores.some(s => s.provider === 'template')) {
    scores.push({
      provider: 'template',
      score: 5,
      reason: 'Instant storyboard preview — no cost, no API key needed',
      cost: 0,
      duration: 'instant',
    })
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score)

  const best = scores[0]
  const alternatives = scores.slice(1, 4).map(s => ({
    provider: s.provider,
    reason: connectedProviders.includes(s.provider) || s.provider === 'template'
      ? s.reason
      : `Connect ${s.provider} for: ${s.reason}`,
    estimatedCost: s.cost,
  }))

  // Determine confidence
  const bestConnected = connectedProviders.includes(best.provider) || best.provider === 'template'
  const confidence: 'high' | 'medium' | 'low' = bestConnected && best.score >= 80
    ? 'high'
    : bestConnected
      ? 'medium'
      : 'low'

  // Adjust reason if provider not connected
  let reason = best.reason
  if (!bestConnected) {
    reason = `Connect ${best.provider} for best results: ${best.reason}`
  }

  return {
    provider: best.provider,
    model: best.model,
    confidence,
    reason,
    estimatedCost: best.cost,
    estimatedDuration: best.duration,
    alternatives,
  }
}
