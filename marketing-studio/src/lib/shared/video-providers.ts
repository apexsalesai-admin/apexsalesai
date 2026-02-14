/**
 * Video Provider Registry
 *
 * Single source of truth for ALL video provider metadata.
 * Every component reads from here. Never hardcode provider data anywhere else.
 * Adding a new provider = adding one entry to PROVIDER_REGISTRY.
 */

export type ProviderCategory = 'cinematic' | 'avatar' | 'stock' | 'motion' | 'realtime'

export interface VideoProviderMeta {
  id: string
  name: string
  category: ProviderCategory
  costPerSecond: number
  minDurationSeconds: number
  maxDurationSeconds: number
  qualityScore: number          // 0-100
  latencyScore: number          // 0-100, higher = faster
  resolutions: string[]
  bestForChannels: string[]
  bestForGoals: string[]
  supportsTestRender: boolean
  testRenderCostMultiplier: number
  apiKeyEnvVar: string
  status: 'active' | 'coming_soon' | 'deprecated'
  icon: string
  tagline: string
  learnMoreUrl: string
}

export const PROVIDER_REGISTRY: VideoProviderMeta[] = [
  {
    id: 'runway-gen4',
    name: 'Runway Gen-4.5',
    category: 'cinematic',
    costPerSecond: 0.34,
    minDurationSeconds: 4,
    maxDurationSeconds: 16,
    qualityScore: 92,
    latencyScore: 45,
    resolutions: ['720p', '1080p'],
    bestForChannels: ['YOUTUBE', 'LINKEDIN', 'INSTAGRAM'],
    bestForGoals: ['authority', 'awareness'],
    supportsTestRender: true,
    testRenderCostMultiplier: 1.0,
    apiKeyEnvVar: 'RUNWAY_API_KEY',
    status: 'active',
    icon: '🎬',
    tagline: 'Cinematic AI video, Hollywood quality',
    learnMoreUrl: 'https://runwayml.com',
  },
  {
    id: 'sora-2',
    name: 'Sora 2',
    category: 'cinematic',
    costPerSecond: 0.10,
    minDurationSeconds: 4,
    maxDurationSeconds: 20,
    qualityScore: 85,
    latencyScore: 60,
    resolutions: ['720p', '1080p', '4K'],
    bestForChannels: ['YOUTUBE', 'TIKTOK', 'INSTAGRAM'],
    bestForGoals: ['awareness', 'conversion', 'education'],
    supportsTestRender: true,
    testRenderCostMultiplier: 1.0,
    apiKeyEnvVar: 'OPENAI_API_KEY',
    status: 'active',
    icon: '🌀',
    tagline: 'OpenAI video generation, fast and versatile',
    learnMoreUrl: 'https://openai.com/sora',
  },
]

// ─── Helper functions ──────────────────────────────────────────────────────────

export function getProvider(id: string): VideoProviderMeta | undefined {
  return PROVIDER_REGISTRY.find(p => p.id === id)
}

export function getActiveProviders(): VideoProviderMeta[] {
  return PROVIDER_REGISTRY.filter(p => p.status === 'active')
}

export function getProvidersByCategory(category: ProviderCategory): VideoProviderMeta[] {
  return PROVIDER_REGISTRY.filter(p => p.status === 'active' && p.category === category)
}

export function estimateCost(providerId: string, durationSeconds: number): number {
  const provider = getProvider(providerId)
  if (!provider) return 0
  const clampedDuration = Math.max(provider.minDurationSeconds, Math.min(provider.maxDurationSeconds, durationSeconds))
  return Math.round(provider.costPerSecond * clampedDuration * 100) / 100
}

export function estimateTestRenderCost(providerId: string): number {
  const provider = getProvider(providerId)
  if (!provider || !provider.supportsTestRender) return 0
  const testDuration = Math.min(10, provider.maxDurationSeconds)
  return Math.round(provider.costPerSecond * testDuration * provider.testRenderCostMultiplier * 100) / 100
}
