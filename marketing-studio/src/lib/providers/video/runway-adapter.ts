/**
 * Runway Adapter
 *
 * Wraps the existing RunwayProvider from src/lib/render/providers/runway.ts
 * to implement the new VideoProvider interface. Does not modify Runway logic.
 */

import { RunwayProvider as LegacyRunwayProvider } from '@/lib/render/providers/runway'
import type { VideoProvider, VideoProviderConfig, VideoSubmitRequest, VideoSubmitResult, VideoPollResult, CostEstimate } from './types'

// Runway pricing: ~320 credits per 8s clip, $0.0085/credit
const CREDITS_PER_SECOND = 40
const USD_PER_CREDIT = 0.0085

function clampDuration(seconds: number): 4 | 6 | 8 {
  if (seconds <= 4) return 4
  if (seconds <= 6) return 6
  return 8
}

export class RunwayAdapter implements VideoProvider {
  private legacy = new LegacyRunwayProvider()

  readonly config: VideoProviderConfig = {
    name: 'runway',
    displayName: 'Runway Gen-3 (Cinematic)',
    category: 'cinematic',
    supportedDurations: [4, 6, 8],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxPromptLength: 1000,
    costPerSecond: CREDITS_PER_SECOND * USD_PER_CREDIT,
    requiresApiKey: true,
    envKeyName: 'RUNWAY_API_KEY',
  }

  estimateCost(durationSeconds: number): CostEstimate {
    const clamped = clampDuration(durationSeconds)
    const credits = CREDITS_PER_SECOND * clamped
    const usd = Math.round(credits * USD_PER_CREDIT * 100) / 100
    return { credits, usd }
  }

  async submit(req: VideoSubmitRequest): Promise<VideoSubmitResult> {
    const result = await this.legacy.submit({
      prompt: req.prompt,
      duration: clampDuration(req.durationSeconds),
      aspectRatio: req.aspectRatio as '16:9' | '9:16' | '1:1',
      apiKey: req.apiKey,
      model: req.model,
    })
    return {
      providerJobId: result.providerJobId,
      status: result.status,
    }
  }

  async poll(providerJobId: string): Promise<VideoPollResult> {
    const result = await this.legacy.poll(providerJobId)
    return {
      status: result.status,
      progress: result.progress,
      outputUrl: result.outputUrl,
      thumbnailUrl: result.thumbnailUrl,
      errorMessage: result.errorMessage,
    }
  }
}
