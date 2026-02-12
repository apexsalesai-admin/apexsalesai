/**
 * Template Provider
 *
 * Safe, zero-cost provider that produces a storyboard from the script.
 * Parses the prompt into scenes and returns structured storyboard frames.
 * Completes synchronously — no external API calls, no Inngest needed.
 */

import type { VideoProvider, VideoProviderConfig, VideoSubmitRequest, VideoSubmitResult, VideoPollResult, CostEstimate } from './types'
import type { StoryboardFrame } from '@/lib/video/types/render-result'

const MIN_SCENES = 3
const MAX_SCENES = 12

/** Dark palette that cycles for storyboard cards */
const SCENE_COLORS = [
  '#1e293b', // slate-800
  '#312e81', // indigo-900
  '#1e1b4b', // indigo-950
  '#172554', // blue-950
  '#0c4a6e', // sky-800
  '#134e4a', // teal-900
  '#3f3f46', // zinc-700
  '#581c87', // purple-900
  '#7c2d12', // orange-900
  '#991b1b', // red-800
  '#065f46', // emerald-800
  '#713f12', // yellow-900
]

/** Extract a visual direction from brackets like [Wide shot of city] */
function extractDirection(text: string): { direction: string; cleanText: string } {
  const match = text.match(/^\s*\[([^\]]+)\]\s*/)
  if (match) {
    return { direction: match[1].trim(), cleanText: text.replace(match[0], '').trim() }
  }
  return { direction: '', cleanText: text.trim() }
}

/**
 * Parse a script/prompt into scenes.
 *
 * Strategy (in priority order):
 * 1. Explicit scene markers: "Scene 1:", "SCENE ONE:", "Scene:", etc.
 * 2. Paragraph breaks (double newline)
 * 3. Sentence chunking (~50 words per scene)
 */
function parseScenes(script: string): { text: string; direction: string }[] {
  const trimmed = script.trim()
  if (!trimmed) return [{ text: 'No script provided.', direction: 'Opening' }]

  // Strategy 1: Explicit scene markers
  const sceneMarkerRegex = /(?:^|\n)\s*(?:scene\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*[:.\-—])/gi
  const markerPositions = Array.from(trimmed.matchAll(sceneMarkerRegex))

  if (markerPositions.length >= 2) {
    const scenes: { text: string; direction: string }[] = []
    for (let i = 0; i < markerPositions.length; i++) {
      const start = markerPositions[i].index! + markerPositions[i][0].length
      const end = i + 1 < markerPositions.length ? markerPositions[i + 1].index! : trimmed.length
      const raw = trimmed.slice(start, end).trim()
      if (raw) {
        const { direction, cleanText } = extractDirection(raw)
        scenes.push({ text: cleanText || raw, direction })
      }
    }
    if (scenes.length >= MIN_SCENES) return scenes.slice(0, MAX_SCENES)
  }

  // Strategy 2: Paragraph breaks
  const paragraphs = trimmed.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  if (paragraphs.length >= MIN_SCENES) {
    return paragraphs.slice(0, MAX_SCENES).map(p => {
      const { direction, cleanText } = extractDirection(p)
      return { text: cleanText || p, direction }
    })
  }

  // Strategy 3: Sentence chunking (~50 words per scene)
  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean)
  const scenes: { text: string; direction: string }[] = []
  let current: string[] = []
  let wordCount = 0

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).length
    current.push(sentence)
    wordCount += words

    if (wordCount >= 50 || current.length >= 3) {
      const combined = current.join(' ')
      const { direction, cleanText } = extractDirection(combined)
      scenes.push({ text: cleanText || combined, direction })
      current = []
      wordCount = 0
    }
  }

  // Flush remaining
  if (current.length > 0) {
    const combined = current.join(' ')
    const { direction, cleanText } = extractDirection(combined)
    scenes.push({ text: cleanText || combined, direction })
  }

  // Pad to minimum if needed
  while (scenes.length < MIN_SCENES) {
    scenes.push({ text: '...', direction: '' })
  }

  return scenes.slice(0, MAX_SCENES)
}

/** Build storyboard frames from parsed scenes */
function buildFrames(scenes: { text: string; direction: string }[]): StoryboardFrame[] {
  return scenes.map((scene, i) => ({
    sceneNumber: i + 1,
    text: scene.text,
    direction: scene.direction || `Scene ${i + 1}`,
    backgroundColor: SCENE_COLORS[i % SCENE_COLORS.length],
  }))
}

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
    const scenes = parseScenes(req.prompt)
    const frames = buildFrames(scenes)

    console.log('[TEMPLATE:SUBMIT]', {
      jobId,
      durationSeconds: req.durationSeconds,
      aspectRatio: req.aspectRatio,
      promptLength: req.prompt.length,
      sceneCount: frames.length,
    })

    return {
      providerJobId: jobId,
      status: 'completed',
      metadata: { frames },
    }
  }

  async poll(): Promise<VideoPollResult> {
    return { status: 'completed', progress: 100 }
  }
}
