import { type PlatformConfig } from './platform-registry'

export interface AdaptationInput {
  title: string
  body: string
  hashtags: string[]
  callToAction?: string
  contentType: string
  videoUrl?: string
  imageUrls?: string[]
  creatorVoice?: string
}

export interface AdaptationOutput {
  platform: string
  title: string | null
  body: string
  hashtags: string[]
  callToAction: string
  mediaType: string
  aspectRatio: string
  charCount: number
  charLimit: number
  adaptationNotes: string
  threadParts?: string[]
}

export function buildAdaptationSystemPrompt(
  platform: PlatformConfig,
  creatorVoice?: string
): string {
  const parts: string[] = []

  parts.push(`You are adapting content for ${platform.name}.`)
  parts.push(`Character limit: ${platform.maxTextLength} characters. You MUST stay under this limit.`)

  if (platform.adaptation.toneShift) {
    parts.push(`Tone: ${platform.adaptation.toneShift}`)
  }

  parts.push(`Hashtag strategy: ${platform.adaptation.hashtagStrategy}`)
  if (platform.adaptation.hashtagStrategy === 'bottom') {
    parts.push('Place hashtags at the bottom of the post, separated by a blank line.')
  } else if (platform.adaptation.hashtagStrategy === 'inline') {
    parts.push('Weave hashtags naturally into the text.')
  } else if (platform.adaptation.hashtagStrategy === 'first-comment') {
    parts.push('Do NOT include hashtags in the body. Return them separately.')
  }

  parts.push(`Link handling: ${platform.adaptation.linkHandling}`)
  parts.push(`CTA style: ${platform.adaptation.ctaStyle}`)
  parts.push(`Emoji usage: ${platform.adaptation.emojiUsage}`)

  if (platform.maxHashtags) {
    parts.push(`Maximum hashtags: ${platform.maxHashtags}`)
  }

  if (creatorVoice) {
    parts.push(`Creator voice instructions: ${creatorVoice}`)
  }

  if (platform.supportsThreads) {
    parts.push(`This platform supports threads. If the content exceeds ${platform.maxTextLength} characters, split it into a thread. Return the thread parts as a JSON array under "threadParts".`)
  }

  parts.push('')
  parts.push('Rules:')
  parts.push('- NEVER exceed the character limit. Count carefully.')
  parts.push('- Adapt tone and structure for the platform audience.')
  parts.push('- Preserve the core message, key facts, and data points.')
  parts.push('- If content is too long, prioritize the hook and primary insight.')
  parts.push('- Return valid JSON with fields: title (string|null), body (string), hashtags (string[]), callToAction (string), adaptationNotes (string), threadParts (string[]|undefined)')
  parts.push('- Do NOT include any text outside the JSON object.')

  return parts.join('\n')
}

export function buildAdaptationUserPrompt(input: AdaptationInput): string {
  const parts: string[] = []
  parts.push(`Title: ${input.title}`)
  parts.push(`Body: ${input.body}`)
  parts.push(`Hashtags: ${input.hashtags.join(', ')}`)
  if (input.callToAction) parts.push(`CTA: ${input.callToAction}`)
  parts.push(`Content type: ${input.contentType}`)
  parts.push('')
  parts.push('Adapt this content for the target platform. Return only valid JSON.')
  return parts.join('\n')
}
