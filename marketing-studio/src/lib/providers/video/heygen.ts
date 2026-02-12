/**
 * HeyGen Video Provider
 *
 * Real API integration for HeyGen avatar video generation.
 * Endpoints sourced from the working legacy code in /api/video/generate.
 */

import type { VideoProvider, VideoProviderConfig, VideoSubmitRequest, VideoSubmitResult, VideoPollResult, CostEstimate } from './types'

// HeyGen pricing: ~0.5 credits per 30s on API Pro, $0.99/credit
const CREDITS_PER_30S = 0.5
const USD_PER_CREDIT = 0.99

export class HeyGenProvider implements VideoProvider {
  readonly config: VideoProviderConfig = {
    name: 'heygen',
    displayName: 'HeyGen (Avatar)',
    category: 'avatar',
    supportedDurations: [15, 30, 60, 120, 300],
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxPromptLength: 5000,
    costPerSecond: (CREDITS_PER_30S * USD_PER_CREDIT) / 30,
    requiresApiKey: true,
    envKeyName: 'HEYGEN_API_KEY',
  }

  estimateCost(durationSeconds: number): CostEstimate {
    const credits = Math.ceil(durationSeconds / 30) * CREDITS_PER_30S
    const usd = Math.round(credits * USD_PER_CREDIT * 100) / 100
    return { credits, usd }
  }

  async submit(req: VideoSubmitRequest): Promise<VideoSubmitResult> {
    const apiKey = req.apiKey
    if (!apiKey) {
      throw new Error('HeyGen API key not configured. Add your key in Settings > Integrations or set HEYGEN_API_KEY in .env.local')
    }

    // Map aspect ratio to dimensions
    const dimensions = req.aspectRatio === '9:16'
      ? { width: 720, height: 1280 }
      : req.aspectRatio === '1:1'
        ? { width: 1080, height: 1080 }
        : { width: 1920, height: 1080 }

    console.log('[HEYGEN:SUBMIT]', {
      durationSeconds: req.durationSeconds,
      promptLength: req.prompt.length,
      aspectRatio: req.aspectRatio,
    })

    const response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        video_inputs: [
          {
            character: {
              type: 'avatar',
              avatar_id: 'Daisy-inskirt-20220818',
              avatar_style: 'normal',
            },
            voice: {
              type: 'text',
              input_text: req.prompt,
              voice_id: 'en-US-JennyNeural',
            },
          },
        ],
        dimension: dimensions,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[HEYGEN:SUBMIT:ERR]', { status: response.status, body: errorBody.slice(0, 200) })
      throw new Error(`HeyGen API error (${response.status}): ${errorBody}`)
    }

    const data = await response.json()
    const videoId = data.data?.video_id
    console.log('[HEYGEN:SUBMIT:OK]', { videoId })

    return {
      providerJobId: videoId || '',
      status: 'queued',
    }
  }

  async poll(providerJobId: string, apiKey?: string): Promise<VideoPollResult> {
    const key = apiKey || process.env.HEYGEN_API_KEY
    if (!key) {
      return { status: 'failed', errorMessage: 'HeyGen API key not available for polling' }
    }

    const url = `https://api.heygen.com/v1/video_status.get?video_id=${providerJobId}`
    const response = await fetch(url, {
      headers: { 'X-Api-Key': key },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('[HEYGEN:POLL:ERR]', { providerJobId, status: response.status, body: errorBody.slice(0, 200) })
      return { status: 'failed', errorMessage: `HeyGen poll error (${response.status}): ${errorBody}` }
    }

    const data = await response.json()
    const status = data.data?.status
    console.log('[HEYGEN:POLL]', { providerJobId, status })

    switch (status) {
      case 'completed':
        console.log('[HEYGEN:COMPLETE]', { providerJobId, videoUrl: (data.data.video_url || '').slice(0, 80) })
        return {
          status: 'completed',
          progress: 100,
          outputUrl: data.data.video_url,
          thumbnailUrl: data.data.thumbnail_url,
        }
      case 'failed':
        return {
          status: 'failed',
          errorMessage: data.data.error || 'HeyGen render failed',
        }
      case 'processing':
        return { status: 'processing', progress: undefined }
      default:
        return { status: 'queued', progress: 0 }
    }
  }
}
