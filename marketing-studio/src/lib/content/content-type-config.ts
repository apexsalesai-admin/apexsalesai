/**
 * Content Type Configuration (P5-MIA-TYPE-AWARE)
 *
 * Central config that drives type-aware behavior across the Mia Creative Session:
 * - Section templates (which sections to build per type)
 * - Research prompt generation (full prompt replacement per type)
 * - System prompts for AI generation
 * - Scoring criteria with weights
 * - Assembly logic
 *
 * CRITICAL: The 'post' type returns EMPTY overrides so the existing
 * hook/body/cta pipeline is completely untouched. Empty string from
 * researchPrompt() is falsy, triggering the original social research path.
 */

import type { SectionType } from '@/lib/studio/mia-creative-types'

// ─── Types ──────────────────────────────────────────────────────────────────

export type SupportedContentType = 'post' | 'article' | 'email' | 'image' | 'campaign'

export interface SectionTemplate {
  type: SectionType
  title: string
  subtitle: string
  instruction: string
}

export interface ScoringCriterion {
  key: string
  label: string
  weight: number
  description: string
}

export interface ContentTypeConfig {
  type: SupportedContentType
  label: string
  researchMode: 'social' | 'longform' | 'direct' | 'visual' | 'campaign'
  structureMode: 'social' | 'article' | 'email' | 'image' | 'campaign'
  scoringMode: 'social' | 'article' | 'email' | 'image' | 'campaign'
  requiresChannelUpfront: boolean
  defaultChannels: string[]
  /** Empty array = use existing hardcoded hook/body/cta sections */
  sections: SectionTemplate[]
  /** Returns full research prompt, or empty string to use existing social logic */
  researchPrompt: (topic: string, channels: string[], brandVoice?: string) => string
  /** Type-specific system prompt for generation. Empty = use existing logic */
  systemPrompt: string
  /** Scoring criteria with weights. Empty = use existing social scoring */
  scoringCriteria: ScoringCriterion[]
  /** How to extract a title from the assembled sections */
  titleExtraction: 'first-line' | 'headline-section' | 'topic-fallback'
}

// ─── No Em Dash Rule (appended to all type-specific prompts) ────────────────

const NO_EM_DASH = 'Never use em dashes. Use commas, semicolons, colons, or separate sentences instead.'

// ─── POST (unchanged pipeline) ──────────────────────────────────────────────

const POST_CONFIG: ContentTypeConfig = {
  type: 'post',
  label: 'Social Post',
  researchMode: 'social',
  structureMode: 'social',
  scoringMode: 'social',
  requiresChannelUpfront: true,
  defaultChannels: [],
  sections: [],
  researchPrompt: () => '',
  systemPrompt: '',
  scoringCriteria: [],
  titleExtraction: 'first-line',
}

// ─── ARTICLE ────────────────────────────────────────────────────────────────

const ARTICLE_CONFIG: ContentTypeConfig = {
  type: 'article',
  label: 'Article',
  researchMode: 'longform',
  structureMode: 'article',
  scoringMode: 'article',
  requiresChannelUpfront: false,
  defaultChannels: ['LINKEDIN'],
  sections: [
    {
      type: 'headline',
      title: 'Headline & Introduction',
      subtitle: 'Hook readers and establish your thesis',
      instruction: 'Write a compelling headline and opening paragraph (150-200 words). Hook the reader with a surprising fact, bold claim, or relatable problem. Clearly state the thesis. Do not write social media content. Write in full paragraphs for a blog or publication.',
    },
    {
      type: 'body',
      title: 'Key Arguments & Evidence',
      subtitle: 'Build your case with depth and specificity',
      instruction: 'Write the main body (400-600 words) with 2-3 subheadings. Include specific examples, statistics, expert perspectives, and analysis. Use transitions between sections. This is long-form content, not a social post.',
    },
    {
      type: 'conclusion',
      title: 'Conclusion & Call to Action',
      subtitle: 'Summarize and drive the reader to act',
      instruction: 'Write a strong conclusion (150-200 words). Summarize the key insight, provide an actionable takeaway, and end with a forward-looking statement or question. Include a clear CTA.',
    },
  ],
  researchPrompt: (topic: string, channels: string[], brandVoice?: string) => {
    const brand = brandVoice ? `\nBrand voice: ${brandVoice}` : ''
    return `You are Mia, an AI content strategist specializing in long-form writing. Research the topic "${topic}" and generate 3 different article angles.

Each angle should be a distinct approach to writing a long-form article (800-1500 words).

For each angle, provide:
- title: A compelling article headline
- description: 2-3 sentences summarizing the thesis, key arguments, and target audience
- whyItWorks: One sentence explaining why this angle resonates with readers
${brand}

Return as JSON array: [{ "title": "...", "description": "...", "whyItWorks": "..." }]
Do not generate social media post angles. Generate article angles with depth and substance.
${NO_EM_DASH}`
  },
  systemPrompt: `You are Mia, an expert content writer and editor. Write professional long-form content suitable for blogs, publications, and thought leadership platforms. Use clear structure with paragraphs, subheadings, and transitions. Include specific details, examples, data, and analysis. Do not write social media posts. Write articles. ${NO_EM_DASH}`,
  scoringCriteria: [
    { key: 'clarity', label: 'Clarity & Readability', weight: 25, description: 'How clear and readable is the writing?' },
    { key: 'structure', label: 'Structure & Flow', weight: 25, description: 'Is it well-organized with clear sections and transitions?' },
    { key: 'depth', label: 'Depth & Usefulness', weight: 25, description: 'Does it deliver substantial, actionable insights?' },
    { key: 'relevance', label: 'Audience Relevance', weight: 25, description: 'Is the content relevant and valuable to the target audience?' },
  ],
  titleExtraction: 'headline-section',
}

// ─── EMAIL ──────────────────────────────────────────────────────────────────

const EMAIL_CONFIG: ContentTypeConfig = {
  type: 'email',
  label: 'Email',
  researchMode: 'direct',
  structureMode: 'email',
  scoringMode: 'email',
  requiresChannelUpfront: false,
  defaultChannels: ['LINKEDIN'],
  sections: [
    {
      type: 'subject_line',
      title: 'Subject Line & Preview',
      subtitle: 'The first thing recipients see',
      instruction: 'Write 3 subject line options (each under 60 characters) and a preview text (under 100 characters). Format as:\nSubject 1: ...\nSubject 2: ...\nSubject 3: ...\nPreview: ...\n\nMake them compelling, specific, and action-oriented. No clickbait.',
    },
    {
      type: 'body',
      title: 'Email Body',
      subtitle: 'Deliver value and build toward your ask',
      instruction: 'Write the complete email body (150-300 words). Include a warm but professional greeting, 2-3 short paragraphs delivering the core message, and a natural transition to the CTA. Keep paragraphs short (2-3 sentences). Write for scanning, not reading.',
    },
    {
      type: 'cta',
      title: 'Call to Action & Close',
      subtitle: 'Drive the specific action you want',
      instruction: 'Write a clear, specific CTA (e.g., "Schedule a 15-minute call", "Download the report", "Reply with your thoughts"). Follow with a professional sign-off. The CTA should be one unmistakable action, not multiple options.',
    },
  ],
  researchPrompt: (topic: string, channels: string[], brandVoice?: string) => {
    const brand = brandVoice ? `\nBrand voice: ${brandVoice}` : ''
    return `You are Mia, an AI email strategist. Research the topic "${topic}" and generate 3 different email approach angles.

Each angle should be a distinct strategy for an email about this topic.

For each angle, provide:
- title: A short name for the email approach (e.g., "Direct Value Proposition", "Story-Driven Outreach")
- description: 2-3 sentences explaining the email strategy, tone, and expected recipient reaction
- whyItWorks: One sentence about why this email approach drives opens and responses
${brand}

Return as JSON array: [{ "title": "...", "description": "...", "whyItWorks": "..." }]
Do not generate social media angles. Generate email-specific strategies focused on deliverability, open rates, and conversion.
${NO_EM_DASH}`
  },
  systemPrompt: `You are Mia, an expert email copywriter. Write professional emails optimized for open rates, readability, and conversion. Keep paragraphs short (2-3 sentences). Write for scanning. Be concise, specific, and action-oriented. Do not write social media posts. Write emails. ${NO_EM_DASH}`,
  scoringCriteria: [
    { key: 'subjectLine', label: 'Subject Line Strength', weight: 25, description: 'Will this subject line get opened?' },
    { key: 'clarity', label: 'Clarity & Brevity', weight: 25, description: 'Is the core message clear and concise?' },
    { key: 'cta', label: 'CTA Effectiveness', weight: 25, description: 'Is the call-to-action clear and compelling?' },
    { key: 'relevance', label: 'Recipient Relevance', weight: 25, description: 'Does it feel personal and relevant?' },
  ],
  titleExtraction: 'headline-section',
}

// ─── IMAGE ──────────────────────────────────────────────────────────────────

const IMAGE_CONFIG: ContentTypeConfig = {
  type: 'image',
  label: 'Image',
  researchMode: 'visual',
  structureMode: 'image',
  scoringMode: 'image',
  requiresChannelUpfront: false,
  defaultChannels: ['LINKEDIN'],
  sections: [
    {
      type: 'visual_concept',
      title: 'Primary Image Prompt',
      subtitle: 'Main visual concept for DALL-E generation',
      instruction: 'Generate a detailed, production-ready DALL-E 3 image prompt (60-100 words). Include specific details: subject, composition, camera angle, lighting, color palette, art style, mood, and atmosphere. Do not write social media text. Write an image generation prompt.',
    },
    {
      type: 'prompt_variations',
      title: 'Alternative Style',
      subtitle: 'Different visual interpretation',
      instruction: 'Generate a second DALL-E 3 prompt with a distinctly different art style, mood, or composition from the primary prompt. Same subject, completely different visual treatment.',
    },
    {
      type: 'body',
      title: 'Creative Variation',
      subtitle: 'Bold or unexpected approach',
      instruction: 'Generate a third DALL-E 3 prompt that takes a creative, unexpected, or artistic approach. Push the visual concept in a bold direction. Abstract, surreal, or highly stylized interpretations welcome.',
    },
  ],
  researchPrompt: (topic: string, channels: string[], brandVoice?: string) => {
    const brand = brandVoice ? `\nBrand voice: ${brandVoice}` : ''
    return `You are Mia, an AI visual content strategist. Research the concept "${topic}" and generate 3 different visual interpretation angles.

Each angle should be a distinct visual approach that could be generated by DALL-E 3 or Midjourney.

For each angle, provide:
- title: A short name for the visual concept (e.g., "Minimalist Corporate", "Cinematic Photorealism", "Children's Book Illustration")
- description: 2-3 sentences describing what the image would look like: subject, composition, style, color palette, mood
- whyItWorks: One sentence about why this visual approach is effective for the intended use
${brand}

Return as JSON array: [{ "title": "...", "description": "...", "whyItWorks": "..." }]
Do not generate social media post angles. Generate visual concept angles for image creation.
${NO_EM_DASH}`
  },
  systemPrompt: `You are Mia, an expert visual prompt engineer for AI image generation. Generate detailed, production-ready prompts optimized for DALL-E 3. Include specific composition, lighting, color palette, art style, mood, and atmosphere descriptors. Each prompt should be 60-100 words and immediately usable in an image generation tool. Do not write social media posts or articles. Write image prompts. ${NO_EM_DASH}`,
  scoringCriteria: [
    { key: 'promptClarity', label: 'Prompt Clarity', weight: 25, description: 'Are the prompts specific and detailed enough for DALL-E?' },
    { key: 'visualSpecificity', label: 'Visual Specificity', weight: 25, description: 'Do prompts include composition, lighting, style, and mood?' },
    { key: 'styleCoherence', label: 'Style Coherence', weight: 25, description: 'Are the prompts stylistically consistent with the concept?' },
    { key: 'generationReadiness', label: 'Generation Readiness', weight: 25, description: 'Can these prompts be used immediately in DALL-E 3?' },
  ],
  titleExtraction: 'topic-fallback',
}

// ─── CAMPAIGN ───────────────────────────────────────────────────────────────

const CAMPAIGN_CONFIG: ContentTypeConfig = {
  type: 'campaign',
  label: 'Campaign',
  researchMode: 'campaign',
  structureMode: 'campaign',
  scoringMode: 'campaign',
  requiresChannelUpfront: false,
  defaultChannels: ['LINKEDIN'],
  sections: [
    {
      type: 'strategy_overview',
      title: 'LinkedIn Post',
      subtitle: 'Professional thought leadership content',
      instruction: 'Write a complete, ready-to-publish LinkedIn post (200-300 words) about this campaign topic. Professional tone, short paragraphs, include a hook in the first line, deliver value in the body, end with a question or CTA. No hashtag spam (max 3 relevant hashtags).',
    },
    {
      type: 'channel_plan',
      title: 'X/Twitter Thread',
      subtitle: 'Engaging thread for X/Twitter',
      instruction: 'Write a complete X/Twitter thread (4-5 tweets). Each tweet MUST be under 280 characters. Number them 1/ 2/ 3/ 4/ 5/. First tweet is the hook that makes people want to read the thread. Last tweet is the CTA. Separate each tweet with a blank line.',
    },
    {
      type: 'messaging_framework',
      title: 'Email Draft',
      subtitle: 'Direct outreach or newsletter content',
      instruction: 'Write a complete email about this campaign topic. Format:\nSubject: [compelling subject line]\nPreview: [preview text under 100 chars]\n---\n[Greeting]\n[2-3 short paragraphs]\n[Clear CTA]\n[Sign-off]',
    },
    {
      type: 'body',
      title: 'Blog Summary',
      subtitle: 'Anchor content for the campaign',
      instruction: 'Write a blog article summary (300-400 words) with a headline, 3 key points as subheadings with 1-2 paragraphs each, and a conclusion with CTA. This serves as the campaign anchor content that other pieces reference.',
    },
  ],
  researchPrompt: (topic: string, channels: string[], brandVoice?: string) => {
    const brand = brandVoice ? `\nBrand voice: ${brandVoice}` : ''
    return `You are Mia, an AI campaign strategist. Research the campaign goal "${topic}" and generate 3 different campaign strategy angles.

Each angle should be a distinct multi-channel campaign approach.

For each angle, provide:
- title: A campaign strategy name (e.g., "Thought Leadership Blitz", "Community-First Launch", "Data-Driven Authority Play")
- description: 2-3 sentences explaining the campaign approach, target audience, content mix, and distribution strategy
- whyItWorks: One sentence about why this campaign strategy drives results
${brand}

Return as JSON array: [{ "title": "...", "description": "...", "whyItWorks": "..." }]
Do not generate single-post angles. Generate multi-channel campaign strategies that produce real content assets.
${NO_EM_DASH}`
  },
  systemPrompt: `You are Mia, an expert campaign strategist. Generate complete, ready-to-publish content for each platform in the campaign. Each piece should be a standalone, publishable asset, not a brief or summary. Match each platform style and constraints exactly. LinkedIn posts are professional and 200-300 words. X threads are 4-5 tweets under 280 chars each. Emails have subject lines and structured bodies. Blog summaries have headlines and subheadings. ${NO_EM_DASH}`,
  scoringCriteria: [
    { key: 'strategyCoherence', label: 'Strategic Coherence', weight: 25, description: 'Is the campaign strategy clear and unified?' },
    { key: 'channelFit', label: 'Channel Fit', weight: 25, description: 'Does each piece match its target platform?' },
    { key: 'assetCompleteness', label: 'Asset Completeness', weight: 25, description: 'Are all content pieces complete and publishable?' },
    { key: 'messageConsistency', label: 'Message Consistency', weight: 25, description: 'Is the core message consistent across channels?' },
  ],
  titleExtraction: 'topic-fallback',
}

// ─── Config Map ─────────────────────────────────────────────────────────────

const CONFIG_MAP: Record<string, ContentTypeConfig> = {
  post: POST_CONFIG,
  article: ARTICLE_CONFIG,
  email: EMAIL_CONFIG,
  image: IMAGE_CONFIG,
  campaign: CAMPAIGN_CONFIG,
}

/**
 * Get the type-aware configuration for a content type.
 * Falls back to POST_CONFIG (empty overrides) for unknown types,
 * ensuring the existing pipeline is never broken.
 */
export function getContentTypeConfig(contentType: string): ContentTypeConfig {
  return CONFIG_MAP[contentType] || POST_CONFIG
}

/**
 * Check if a content type uses custom sections (non-default pipeline).
 */
export function hasCustomSections(contentType: string): boolean {
  const config = getContentTypeConfig(contentType)
  return config.sections.length > 0
}

/**
 * Get section instruction for a given content type and section type.
 * Returns undefined if using default pipeline.
 */
export function getSectionInstruction(contentType: string, sectionType: string): string | undefined {
  const config = getContentTypeConfig(contentType)
  const section = config.sections.find(s => s.type === sectionType)
  return section?.instruction
}
