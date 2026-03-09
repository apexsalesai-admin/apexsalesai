/**
 * Content Type Configuration (P5-MIA-TYPE-AWARE)
 *
 * Central config that drives type-aware behavior across the Mia Creative Session:
 * - Section templates (which sections to build per type)
 * - Research prompt framing
 * - Section generation instructions
 * - Scoring dimensions
 * - Assembly logic
 *
 * CRITICAL: The 'post' type returns EMPTY overrides so the existing
 * hook/body/cta pipeline is completely untouched.
 */

import type { SectionType } from '@/lib/studio/mia-creative-types'

// ─── Section Definition ─────────────────────────────────────────────────────

export interface SectionDefinition {
  type: SectionType
  label: string
  instruction: string
}

// ─── Scoring Dimension ──────────────────────────────────────────────────────

export interface ScoringDimension {
  key: string
  label: string
  description: string
}

// ─── Content Type Config ────────────────────────────────────────────────────

export interface ContentTypeConfig {
  /** Empty array = use default hook/body/cta */
  sections: SectionDefinition[]
  /** Type-specific research prompt context. Empty string = use default. */
  researchContext: string
  /** Type-specific scoring dimensions. Empty array = use default. */
  scoringDimensions: ScoringDimension[]
  /** How to extract a title from the assembled sections */
  titleExtraction: 'first-line' | 'headline-section' | 'topic-fallback'
  /** Default channel to auto-assign if none selected */
  defaultChannel: string
  /** Label for the "Generate" button in the section builder */
  generateLabel: string
}

// ─── Type Configs ───────────────────────────────────────────────────────────

const POST_CONFIG: ContentTypeConfig = {
  sections: [], // empty = existing hook/body/cta pipeline
  researchContext: '',
  scoringDimensions: [],
  titleExtraction: 'first-line',
  defaultChannel: 'LINKEDIN',
  generateLabel: 'Write section',
}

const ARTICLE_CONFIG: ContentTypeConfig = {
  sections: [
    {
      type: 'headline',
      label: 'Headline',
      instruction:
        'Write a compelling article headline (8-12 words). Use power words, specificity, and a clear value proposition. Proven formulas: How-to, List, Question, Contrarian take.',
    },
    {
      type: 'introduction',
      label: 'Introduction',
      instruction:
        'Write an engaging article introduction (2-3 paragraphs). Hook the reader with a surprising stat, bold claim, or relatable problem. End with a thesis statement that previews what the reader will learn.',
    },
    {
      type: 'body',
      label: 'Body',
      instruction:
        'Write the main article body (4-8 paragraphs). Use subheadings, concrete examples, data points, and actionable advice. Structure for scannability with short paragraphs. Include at least one expert quote or case study reference.',
    },
    {
      type: 'conclusion',
      label: 'Conclusion',
      instruction:
        'Write a strong conclusion (1-2 paragraphs) that summarizes key takeaways, reinforces the main argument, and includes a clear call-to-action (subscribe, share, implement, comment).',
    },
  ],
  researchContext:
    'Focus on long-form article angles: thought leadership positions, data-backed insights, contrarian takes, comprehensive guides, or trend analyses. Each angle should support 1000+ words of depth.',
  scoringDimensions: [
    { key: 'headline', label: 'Headline Power', description: 'How compelling and click-worthy is the headline?' },
    { key: 'depth', label: 'Depth & Value', description: 'Does the article deliver substantial, actionable insights?' },
    { key: 'structure', label: 'Structure', description: 'Is it well-organized with clear sections and flow?' },
    { key: 'seo', label: 'SEO Readiness', description: 'Is it optimized for search discovery?' },
    { key: 'cta', label: 'Call-to-Action', description: 'Does the conclusion drive a clear next step?' },
  ],
  titleExtraction: 'headline-section',
  defaultChannel: 'LINKEDIN',
  generateLabel: 'Write section',
}

const EMAIL_CONFIG: ContentTypeConfig = {
  sections: [
    {
      type: 'subject_line',
      label: 'Subject Line',
      instruction:
        'Write 3 email subject line options (each under 60 characters). Use urgency, curiosity, personalization, or benefit-driven language. Avoid spam trigger words. Format: one per line, numbered.',
    },
    {
      type: 'preview_text',
      label: 'Preview Text',
      instruction:
        'Write email preview text (40-90 characters) that complements the subject line and entices opens. Do not repeat the subject line.',
    },
    {
      type: 'body',
      label: 'Email Body',
      instruction:
        'Write the email body (3-5 short paragraphs). Open with a personal greeting. Lead with value, not asks. Use conversational tone. Keep paragraphs to 2-3 sentences max. Include one clear CTA button text suggestion in [brackets].',
    },
    {
      type: 'cta',
      label: 'CTA & Sign-off',
      instruction:
        'Write the email sign-off with a P.S. line (proven to increase conversions) and a final CTA. Keep it warm and action-oriented.',
    },
  ],
  researchContext:
    'Focus on email marketing angles: compelling hooks for subject lines, value-first messaging approaches, personalization strategies, and clear conversion paths. Consider open rates and click-through optimization.',
  scoringDimensions: [
    { key: 'subjectLine', label: 'Subject Line', description: 'Will this subject line get opened?' },
    { key: 'clarity', label: 'Message Clarity', description: 'Is the core message immediately clear?' },
    { key: 'personalization', label: 'Personalization', description: 'Does it feel personal and relevant?' },
    { key: 'cta', label: 'CTA Strength', description: 'Is the call-to-action clear and compelling?' },
    { key: 'deliverability', label: 'Deliverability', description: 'Will it avoid spam filters?' },
  ],
  titleExtraction: 'headline-section',
  defaultChannel: 'LINKEDIN',
  generateLabel: 'Write section',
}

const IMAGE_CONFIG: ContentTypeConfig = {
  sections: [
    {
      type: 'visual_concept',
      label: 'Visual Concept',
      instruction:
        'Describe the overall visual concept for this image (2-3 sentences). Include the mood, color palette, composition style, and key visual elements. Think about what will stop the scroll on social media.',
    },
    {
      type: 'prompt_variations',
      label: 'DALL-E Prompts',
      instruction:
        'Write 3 detailed DALL-E image generation prompts (each 1-2 sentences). Each should be a variation on the visual concept with different styles or compositions. Format as "Prompt 1: ...", "Prompt 2: ...", "Prompt 3: ...". Include art style, lighting, perspective, and mood descriptors.',
    },
    {
      type: 'body',
      label: 'Caption & Context',
      instruction:
        'Write a social media caption (2-4 sentences) to accompany the generated image. Include relevant context, a hook, and a call-to-action. Add 3-5 hashtag suggestions at the end.',
    },
  ],
  researchContext:
    'Focus on visual content angles: striking visual metaphors, trending aesthetic styles, scroll-stopping compositions, and brand-aligned imagery concepts. Consider what performs well visually on social platforms.',
  scoringDimensions: [
    { key: 'visualImpact', label: 'Visual Impact', description: 'Will this image stop the scroll?' },
    { key: 'promptClarity', label: 'Prompt Clarity', description: 'Are the DALL-E prompts specific and detailed?' },
    { key: 'brandAlignment', label: 'Brand Alignment', description: 'Does the concept match the brand identity?' },
    { key: 'captionQuality', label: 'Caption Quality', description: 'Is the accompanying text engaging?' },
    { key: 'platformFit', label: 'Platform Fit', description: 'Will this work well on the target platform?' },
  ],
  titleExtraction: 'topic-fallback',
  defaultChannel: 'LINKEDIN',
  generateLabel: 'Generate concept',
}

const CAMPAIGN_CONFIG: ContentTypeConfig = {
  sections: [
    {
      type: 'strategy_overview',
      label: 'Strategy Overview',
      instruction:
        'Write a campaign strategy overview (2-3 paragraphs). Define the campaign objective, target audience, key messaging pillars, and success metrics. Include a campaign name suggestion and timeline recommendation.',
    },
    {
      type: 'channel_plan',
      label: 'Channel Plan',
      instruction:
        'Create a channel-specific content plan. For each major channel (LinkedIn, X/Twitter, Email, Blog), outline: the content format, posting frequency, key message adaptation, and unique angle. Format as a structured list by channel.',
    },
    {
      type: 'messaging_framework',
      label: 'Messaging Framework',
      instruction:
        'Define the campaign messaging framework: 1) Primary tagline/hook, 2) Three supporting messages, 3) Key proof points or stats to reference, 4) Tone guidelines, 5) Words to use vs. avoid. Format as a structured reference document.',
    },
    {
      type: 'body',
      label: 'Launch Content',
      instruction:
        'Write the first piece of launch content for this campaign — a LinkedIn post that introduces the campaign theme. This should serve as the anchor content that other channel adaptations will reference.',
    },
  ],
  researchContext:
    'Focus on multi-channel campaign angles: overarching themes that work across platforms, unified messaging strategies, content pillar approaches, and campaign arc structures. Think about 2-4 week campaign timelines.',
  scoringDimensions: [
    { key: 'strategyClarity', label: 'Strategy Clarity', description: 'Is the campaign objective and approach clear?' },
    { key: 'channelCoverage', label: 'Channel Coverage', description: 'Does the plan cover key channels effectively?' },
    { key: 'messagingConsistency', label: 'Messaging', description: 'Is the messaging framework coherent and adaptable?' },
    { key: 'actionability', label: 'Actionability', description: 'Can a team execute this plan immediately?' },
    { key: 'launchContent', label: 'Launch Content', description: 'Is the anchor piece compelling and on-brand?' },
  ],
  titleExtraction: 'topic-fallback',
  defaultChannel: 'LINKEDIN',
  generateLabel: 'Generate section',
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
