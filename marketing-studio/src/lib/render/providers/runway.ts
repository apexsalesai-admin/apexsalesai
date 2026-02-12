/**
 * Runway Render Provider
 *
 * Implements the RenderProvider interface for Runway's text-to-video API.
 * API docs: https://docs.runwayml.com
 *
 * Config via env vars:
 *   RUNWAY_API_KEY              — required
 *   RUNWAY_API_URL              — default https://api.dev.runwayml.com/v1
 *   RUNWAY_TEXT_TO_VIDEO_MODEL  — default gen4.5
 */

import type { RenderProvider, RenderRequest, RenderSubmitResult, RenderPollResult } from '../types'

const BASE_URL = process.env.RUNWAY_API_URL || 'https://api.dev.runwayml.com/v1'
const API_VERSION = '2024-11-06'
const MAX_PROMPT_LENGTH = 1000

function getModel(): string {
  return process.env.RUNWAY_TEXT_TO_VIDEO_MODEL || 'gen4.5'
}

/** Map user-friendly aspect ratios to Runway's resolution format */
function mapAspectRatio(ratio: string): string {
  const mapping: Record<string, string> = {
    '16:9': '1280:720',
    '9:16': '720:1280',
    '1:1': '960:960',
    '4:3': '1104:832',
    '3:4': '832:1104',
    '1280:720': '1280:720',
    '720:1280': '720:1280',
    '1080:1080': '960:960',
    '960:960': '960:960',
    '1104:832': '1104:832',
    '832:1104': '832:1104',
  }
  const mapped = mapping[ratio]
  if (!mapped) {
    console.warn(`[Runway] Unknown aspect ratio "${ratio}", falling back to 1280:720`)
  }
  return mapped || '1280:720'
}

/** Clamp duration to valid Runway range: 2-10 seconds (integer) */
function clampDuration(d: number): number {
  return Math.max(2, Math.min(10, Math.round(d)))
}

function getApiKey(): string {
  const key = process.env.RUNWAY_API_KEY
  if (!key) {
    throw new Error(
      'RUNWAY_API_KEY is not set. ' +
      'Get your key from https://app.runwayml.com/settings/api-keys ' +
      'and add it to .env.local'
    )
  }
  return key
}

export class RunwayProvider implements RenderProvider {
  name = 'runway'

  async submit(req: RenderRequest): Promise<RenderSubmitResult> {
    const apiKey = req.apiKey || getApiKey()

    // Runway enforces a 1000-character limit on promptText
    let promptText = req.prompt
    if (promptText.length > MAX_PROMPT_LENGTH) {
      console.warn('[RUNWAY:API:TRUNCATE]', { original: promptText.length, truncated: MAX_PROMPT_LENGTH })
      promptText = promptText.slice(0, MAX_PROMPT_LENGTH)
    }

    console.log('[RUNWAY:API:SUBMIT]', { url: `${BASE_URL}/text_to_video`, model: req.model || getModel(), ratio: mapAspectRatio(req.aspectRatio), duration: clampDuration(req.duration), promptLength: promptText.length })

    const response = await fetch(`${BASE_URL}/text_to_video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Runway-Version': API_VERSION,
      },
      body: JSON.stringify({
        model: req.model || getModel(),
        promptText,
        ratio: mapAspectRatio(req.aspectRatio),
        duration: clampDuration(req.duration),
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[RUNWAY:API:SUBMIT:ERR]', { status: response.status, error: error.slice(0, 200) })
      throw new Error(`Runway submit error (${response.status}): ${error}`)
    }

    const data = await response.json()
    const providerJobId = data.id || data.taskId
    console.log('[RUNWAY:API:SUBMIT:OK]', { providerJobId })
    return {
      providerJobId,
      status: 'queued',
    }
  }

  async poll(providerJobId: string, apiKey?: string): Promise<RenderPollResult> {
    const resolvedKey = apiKey || getApiKey()

    const response = await fetch(`${BASE_URL}/tasks/${providerJobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${resolvedKey}`,
        'X-Runway-Version': API_VERSION,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[RUNWAY:API:POLL:ERR]', { providerJobId, status: response.status, error: error.slice(0, 200) })
      throw new Error(`Runway poll error (${response.status}): ${error}`)
    }

    const data = await response.json()
    const runwayStatus: string = data.status || ''
    console.log('[RUNWAY:API:POLL]', { providerJobId, runwayStatus, progress: data.progress })

    // Map Runway statuses to our abstraction
    switch (runwayStatus) {
      case 'PENDING':
      case 'THROTTLED':
        return { status: 'queued', progress: 0 }

      case 'RUNNING':
        return { status: 'processing', progress: data.progress ?? undefined }

      case 'SUCCEEDED':
        return {
          status: 'completed',
          progress: 100,
          outputUrl: Array.isArray(data.output) ? data.output[0] : data.output,
          thumbnailUrl: data.thumbnail || undefined,
        }

      case 'FAILED':
      case 'CANCELLED':
        return {
          status: 'failed',
          errorMessage: data.error || data.failure || `Runway task ${runwayStatus.toLowerCase()}`,
        }

      default:
        return { status: 'processing', progress: data.progress ?? undefined }
    }
  }
}
