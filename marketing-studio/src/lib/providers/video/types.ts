/**
 * Video Provider Abstraction Types
 *
 * Defines a flexible interface for multiple video rendering providers.
 * Supersedes the Runway-specific types in src/lib/render/types.ts.
 */

export type VideoProviderName = 'runway' | 'heygen' | 'template' | 'sora'

export type VideoProviderCategory = 'cinematic' | 'avatar' | 'marketing'

export interface VideoProviderConfig {
  name: VideoProviderName
  displayName: string
  category: VideoProviderCategory
  supportedDurations: number[]   // seconds
  supportedAspectRatios: string[]
  maxPromptLength: number
  costPerSecond: number          // estimated USD (0 for template)
  requiresApiKey: boolean
  envKeyName: string             // e.g. 'RUNWAY_API_KEY'
}

export interface VideoSubmitRequest {
  prompt: string
  durationSeconds: number
  aspectRatio: string
  apiKey?: string
  model?: string
}

export interface VideoSubmitResult {
  providerJobId: string
  status: 'queued' | 'processing' | 'completed'
  /** Provider-specific metadata returned on submit (e.g. storyboard frames from template) */
  metadata?: Record<string, unknown>
}

export interface VideoPollResult {
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress?: number
  outputUrl?: string
  thumbnailUrl?: string
  errorMessage?: string
  /** If true, outputUrl requires authenticated download (e.g. Sora /content endpoint) */
  requiresDownload?: boolean
}

export interface CostEstimate {
  credits: number
  usd: number
}

export interface VideoProvider {
  readonly config: VideoProviderConfig
  estimateCost(durationSeconds: number): CostEstimate
  submit(req: VideoSubmitRequest): Promise<VideoSubmitResult>
  poll(providerJobId: string, apiKey?: string): Promise<VideoPollResult>
}
