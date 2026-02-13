/**
 * Google Gemini Integration (P21)
 *
 * Multimodal AI for content generation and analysis.
 * Uses Gemini REST API v1beta — requires GOOGLE_AI_API_KEY env var or BYOK.
 */

import { IntegrationManager } from './integration-manager'

export interface GeminiGenerateOptions {
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface GeminiResponse {
  text: string
  model: string
  usage: { inputTokens: number; outputTokens: number }
}

/**
 * Generate text with Google Gemini.
 */
export async function generateWithGemini(
  prompt: string,
  workspaceId: string,
  options?: GeminiGenerateOptions
): Promise<GeminiResponse> {
  const resolved = await IntegrationManager.resolveKey('gemini', workspaceId)
  if (!resolved) {
    throw new Error('Google Gemini API key not configured')
  }

  const model = options?.model ?? 'gemini-2.0-flash'

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${resolved.key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: options?.maxTokens ?? 2048,
          temperature: options?.temperature ?? 0.7,
        },
      }),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${text}`)
  }

  const data = await response.json()

  const generatedText =
    data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

  const usageMeta = data.usageMetadata ?? {}

  return {
    text: generatedText,
    model,
    usage: {
      inputTokens: usageMeta.promptTokenCount ?? 0,
      outputTokens: usageMeta.candidatesTokenCount ?? 0,
    },
  }
}

/**
 * Test Google Gemini API connection.
 */
export async function testGeminiConnection(apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    )
    return response.ok
  } catch {
    return false
  }
}
