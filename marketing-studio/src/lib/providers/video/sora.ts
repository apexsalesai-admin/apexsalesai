/**
 * OpenAI Sora 2 Video Provider
 *
 * Single provider with two models: sora-2 (Standard) and sora-2-pro (Pro).
 * Model selection determines duration range and pricing.
 *
 * Endpoints: POST /v1/videos, GET /v1/videos/{id}, GET /v1/videos/{id}/content
 *
 * Note: Sora's download endpoint streams binary MP4 with auth header.
 * The Inngest finalize step must handle authenticated download.
 */

import type { VideoProvider, VideoProviderConfig, VideoSubmitRequest, VideoSubmitResult, VideoPollResult, CostEstimate } from './types'

const SORA_API_BASE = 'https://api.openai.com/v1'

/** Per-second pricing by model and resolution tier */
const PRICING: Record<string, number> = {
  'sora-2': 0.10,           // $0.10/sec for 720p
  'sora-2-pro': 0.30,       // $0.30/sec for 720p
  'sora-2-pro-hd': 0.50,    // $0.50/sec for 1024p+
}

/** Map user-friendly aspect ratios to Sora size format */
function mapSize(ratio: string): string {
  const mapping: Record<string, string> = {
    '16:9': '1280x720',
    '9:16': '720x1280',
    '1:1': '1024x1024',
    '21:9': '1792x1024',
    '9:21': '1024x1792',
    '1280x720': '1280x720',
    '720x1280': '720x1280',
    '1792x1024': '1792x1024',
    '1024x1792': '1024x1792',
    '1024x1024': '1024x1024',
  }
  return mapping[ratio] || '1280x720'
}

/** Clamp duration to valid Sora values */
function clampDuration(d: number, model: string): number {
  if (model === 'sora-2-pro') {
    // sora-2-pro: 10, 15, 25
    if (d <= 10) return 10
    if (d <= 15) return 15
    return 25
  }
  // sora-2: 4, 8, 12
  if (d <= 4) return 4
  if (d <= 8) return 8
  return 12
}

export class SoraProvider implements VideoProvider {
  readonly config: VideoProviderConfig = {
    name: 'sora',
    displayName: 'OpenAI Sora 2',
    category: 'cinematic',
    supportedDurations: [4, 8, 12],  // Default model (sora-2) durations
    supportedAspectRatios: ['16:9', '9:16', '1:1', '21:9'],
    maxPromptLength: 5000,
    costPerSecond: 0.10,             // Default model pricing
    requiresApiKey: true,
    envKeyName: 'OPENAI_API_KEY',
    models: [
      { id: 'sora-2', displayName: 'Standard (4-12s)', supportedDurations: [4, 8, 12], costPerSecond: 0.10 },
      { id: 'sora-2-pro', displayName: 'Pro (10-25s)', supportedDurations: [10, 15, 25], costPerSecond: 0.30 },
    ],
  }

  estimateCost(durationSeconds: number): CostEstimate {
    const usd = Math.round(PRICING['sora-2'] * durationSeconds * 100) / 100
    return { credits: 0, usd }
  }

  async submit(req: VideoSubmitRequest): Promise<VideoSubmitResult> {
    const apiKey = req.apiKey
    if (!apiKey) {
      throw new Error('OpenAI API key not configured. Add your key in Settings > Providers or set OPENAI_API_KEY in .env.local')
    }

    const model = req.model || 'sora-2'
    const size = mapSize(req.aspectRatio)
    const duration = clampDuration(req.durationSeconds, model)

    console.log('[SORA:SUBMIT]', {
      model,
      size,
      duration,
      promptLength: req.prompt.length,
    })

    const response = await fetch(`${SORA_API_BASE}/videos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: req.prompt,
        size,
        seconds: String(duration),
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
      const msg = error?.error?.message || response.statusText
      console.error('[SORA:SUBMIT:ERR]', { status: response.status, error: msg })
      throw new Error(`[SORA:SUBMIT:FAILED] ${msg}`)
    }

    const data = await response.json()
    const videoId = data.id

    console.log('[SORA:SUBMIT:OK]', { videoId, model, size, duration })

    return {
      providerJobId: videoId,
      status: 'queued',
      metadata: { model, size, seconds: String(duration) },
    }
  }

  async poll(providerJobId: string, apiKey?: string): Promise<VideoPollResult> {
    const key = apiKey || process.env.OPENAI_API_KEY
    if (!key) {
      return { status: 'failed', errorMessage: 'OpenAI API key not available for polling' }
    }

    const response = await fetch(`${SORA_API_BASE}/videos/${providerJobId}`, {
      headers: {
        'Authorization': `Bearer ${key}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[SORA:POLL:ERR]', { providerJobId, status: response.status, error: error.slice(0, 200) })
      return { status: 'failed', errorMessage: `Sora poll error (${response.status}): ${error}` }
    }

    const data = await response.json()
    const soraStatus: string = data.status || ''

    console.log('[SORA:POLL]', { providerJobId, status: soraStatus, progress: data.progress })

    switch (soraStatus) {
      case 'queued':
        return { status: 'queued', progress: 0 }

      case 'in_progress':
        return { status: 'processing', progress: data.progress ?? undefined }

      case 'completed':
        // Sora requires authenticated download — outputUrl is the content endpoint
        return {
          status: 'completed',
          progress: 100,
          outputUrl: `${SORA_API_BASE}/videos/${providerJobId}/content`,
          requiresDownload: true,
        }

      case 'failed':
        return {
          status: 'failed',
          errorMessage: data.error?.message || 'Sora generation failed',
        }

      default:
        return { status: 'processing', progress: data.progress ?? undefined }
    }
  }
}
