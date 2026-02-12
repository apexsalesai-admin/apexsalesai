/**
 * Render Provider Abstraction Types
 *
 * Defines a common interface for video rendering providers (Runway, etc.).
 */

export interface RenderRequest {
  prompt: string
  duration: number
  aspectRatio: '16:9' | '9:16' | '1:1'
  model?: string
  apiKey?: string  // Pre-resolved key (from integrations or env)
}

export interface RenderSubmitResult {
  providerJobId: string
  status: 'queued' | 'processing'
}

export interface RenderPollResult {
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress?: number
  outputUrl?: string
  thumbnailUrl?: string
  errorMessage?: string
}

export interface RenderProvider {
  name: string
  submit(req: RenderRequest): Promise<RenderSubmitResult>
  poll(providerJobId: string, apiKey?: string): Promise<RenderPollResult>
}
