/**
 * Template Provider
 *
 * Safe, zero-cost "external workflow" provider.
 * Returns immediately with a completed status so the UI flow works
 * without burning API credits. Use this as the default provider.
 */

import type { VideoProvider, VideoProviderConfig, VideoSubmitRequest, VideoSubmitResult, VideoPollResult, CostEstimate } from './types'

export class TemplateProvider implements VideoProvider {
  readonly config: VideoProviderConfig = {
    name: 'template',
    displayName: 'Template (No Cost)',
    category: 'marketing',
    supportedDurations: [4, 6, 8, 15, 30, 60],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxPromptLength: 10000,
    costPerSecond: 0,
    requiresApiKey: false,
    envKeyName: '',
  }

  estimateCost(): CostEstimate {
    return { credits: 0, usd: 0 }
  }

  async submit(req: VideoSubmitRequest): Promise<VideoSubmitResult> {
    const jobId = `template-${Date.now()}`
    console.log('[TEMPLATE:SUBMIT]', {
      jobId,
      durationSeconds: req.durationSeconds,
      aspectRatio: req.aspectRatio,
      promptLength: req.prompt.length,
    })
    return {
      providerJobId: jobId,
      status: 'completed',
    }
  }

  async poll(providerJobId: string): Promise<VideoPollResult> {
    // Template provider always completes immediately
    return {
      status: 'completed',
      progress: 100,
    }
  }
}
