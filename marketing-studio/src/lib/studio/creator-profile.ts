/**
 * Creator Profile — Persona Engine (P24)
 *
 * Types, constants, and utilities for the creator profile system.
 * Provides voice presets, industry options, strategy goals,
 * and prompt-building for Mia AI personalization.
 */

// ─── Voice Presets ──────────────────────────────────────────────────────────────

export type VoicePresetKey =
  | 'trusted-advisor'
  | 'challenger'
  | 'storyteller'
  | 'data-driven'
  | 'visionary'
  | 'educator'
  | 'provocateur'
  | 'empathetic-guide'
  | 'hype-builder'
  | 'minimalist'

export interface VoicePreset {
  key: VoicePresetKey
  name: string
  tagline: string
  exampleOpener: string
  scores: { tone: number; energy: number; humor: number; formality: number }
  persuasion: 'logic' | 'emotion' | 'authority' | 'scarcity'
}

export const VOICE_PRESETS: Record<VoicePresetKey, VoicePreset> = {
  'trusted-advisor': {
    key: 'trusted-advisor',
    name: 'Trusted Advisor',
    tagline: 'Authoritative but approachable',
    exampleOpener: "Here's what most teams overlook when scaling their pipeline…",
    scores: { tone: 70, energy: 50, humor: 20, formality: 75 },
    persuasion: 'authority',
  },
  challenger: {
    key: 'challenger',
    name: 'Challenger',
    tagline: 'Bold contrarian takes',
    exampleOpener: 'Stop doing this with your outbound. Seriously.',
    scores: { tone: 40, energy: 85, humor: 30, formality: 40 },
    persuasion: 'emotion',
  },
  storyteller: {
    key: 'storyteller',
    name: 'Storyteller',
    tagline: 'Narrative-driven, human-first',
    exampleOpener: 'Last Tuesday, a founder told me something that changed how I think about growth…',
    scores: { tone: 60, energy: 55, humor: 35, formality: 50 },
    persuasion: 'emotion',
  },
  'data-driven': {
    key: 'data-driven',
    name: 'Data-Driven',
    tagline: 'Numbers speak louder',
    exampleOpener: "We analyzed 10,000 cold emails. The #1 pattern that 5x'd reply rates:",
    scores: { tone: 75, energy: 45, humor: 10, formality: 80 },
    persuasion: 'logic',
  },
  visionary: {
    key: 'visionary',
    name: 'Visionary',
    tagline: 'Big-picture, future-focused',
    exampleOpener: "In 3 years, 80% of sales teams will operate completely differently. Here's why.",
    scores: { tone: 65, energy: 75, humor: 15, formality: 65 },
    persuasion: 'authority',
  },
  educator: {
    key: 'educator',
    name: 'Educator',
    tagline: 'Clear, structured, helpful',
    exampleOpener: "Let me break down the 3 steps to building a repeatable content engine:",
    scores: { tone: 70, energy: 40, humor: 15, formality: 70 },
    persuasion: 'logic',
  },
  provocateur: {
    key: 'provocateur',
    name: 'Provocateur',
    tagline: 'Edgy, attention-grabbing',
    exampleOpener: "Your marketing strategy is probably backwards. Here's the proof.",
    scores: { tone: 30, energy: 90, humor: 40, formality: 25 },
    persuasion: 'scarcity',
  },
  'empathetic-guide': {
    key: 'empathetic-guide',
    name: 'Empathetic Guide',
    tagline: 'Warm, understanding, supportive',
    exampleOpener: "If you're feeling overwhelmed by content creation, you're not alone. Let's simplify it.",
    scores: { tone: 80, energy: 35, humor: 20, formality: 55 },
    persuasion: 'emotion',
  },
  'hype-builder': {
    key: 'hype-builder',
    name: 'Hype Builder',
    tagline: 'Energetic, momentum-driven',
    exampleOpener: "We just shipped something massive. And the early numbers are insane 🔥",
    scores: { tone: 35, energy: 95, humor: 45, formality: 20 },
    persuasion: 'scarcity',
  },
  minimalist: {
    key: 'minimalist',
    name: 'Minimalist',
    tagline: 'Less is more, every word earns its place',
    exampleOpener: 'One metric. One insight. One action.',
    scores: { tone: 60, energy: 30, humor: 5, formality: 65 },
    persuasion: 'logic',
  },
}

// ─── Industry Options ───────────────────────────────────────────────────────────

export type IndustryKey =
  | 'saas'
  | 'fintech'
  | 'healthcare'
  | 'ecommerce'
  | 'edtech'
  | 'cybersecurity'
  | 'ai-ml'
  | 'real-estate'
  | 'legal'
  | 'manufacturing'
  | 'media-entertainment'
  | 'nonprofit'
  | 'consulting'
  | 'hr-recruiting'
  | 'logistics'
  | 'energy'
  | 'food-beverage'
  | 'other'

export interface IndustryOption {
  key: IndustryKey
  name: string
  icon: string
  regulated: boolean
  complianceNote: string | null
  defaultAudienceRole: string
  defaultAudienceSeniority: string
}

export const INDUSTRY_OPTIONS: Record<IndustryKey, IndustryOption> = {
  saas: { key: 'saas', name: 'SaaS / Software', icon: '💻', regulated: false, complianceNote: null, defaultAudienceRole: 'Product Manager', defaultAudienceSeniority: 'Director' },
  fintech: { key: 'fintech', name: 'FinTech / Finance', icon: '🏦', regulated: true, complianceNote: 'Avoid specific return promises. Include required disclaimers for financial products.', defaultAudienceRole: 'CFO', defaultAudienceSeniority: 'C-Suite' },
  healthcare: { key: 'healthcare', name: 'Healthcare / MedTech', icon: '🏥', regulated: true, complianceNote: 'No unverified medical claims. HIPAA-aware language. Avoid diagnostic language.', defaultAudienceRole: 'Healthcare Administrator', defaultAudienceSeniority: 'VP' },
  ecommerce: { key: 'ecommerce', name: 'E-Commerce / Retail', icon: '🛒', regulated: false, complianceNote: null, defaultAudienceRole: 'E-Commerce Manager', defaultAudienceSeniority: 'Manager' },
  edtech: { key: 'edtech', name: 'EdTech / Education', icon: '🎓', regulated: false, complianceNote: null, defaultAudienceRole: 'Learning & Development Lead', defaultAudienceSeniority: 'Director' },
  cybersecurity: { key: 'cybersecurity', name: 'Cybersecurity', icon: '🔒', regulated: true, complianceNote: 'Avoid disclosing vulnerability details. No fear-mongering without substantiation.', defaultAudienceRole: 'CISO', defaultAudienceSeniority: 'C-Suite' },
  'ai-ml': { key: 'ai-ml', name: 'AI / Machine Learning', icon: '🤖', regulated: false, complianceNote: null, defaultAudienceRole: 'ML Engineer', defaultAudienceSeniority: 'Senior IC' },
  'real-estate': { key: 'real-estate', name: 'Real Estate', icon: '🏠', regulated: true, complianceNote: 'Fair housing compliance. No discriminatory language. Accurate property claims only.', defaultAudienceRole: 'Real Estate Investor', defaultAudienceSeniority: 'Owner' },
  legal: { key: 'legal', name: 'Legal / LegalTech', icon: '⚖️', regulated: true, complianceNote: 'Not legal advice disclaimers required. Jurisdiction-aware language.', defaultAudienceRole: 'General Counsel', defaultAudienceSeniority: 'C-Suite' },
  manufacturing: { key: 'manufacturing', name: 'Manufacturing', icon: '🏭', regulated: false, complianceNote: null, defaultAudienceRole: 'Operations Director', defaultAudienceSeniority: 'Director' },
  'media-entertainment': { key: 'media-entertainment', name: 'Media & Entertainment', icon: '🎬', regulated: false, complianceNote: null, defaultAudienceRole: 'Content Director', defaultAudienceSeniority: 'Director' },
  nonprofit: { key: 'nonprofit', name: 'Nonprofit', icon: '💚', regulated: false, complianceNote: null, defaultAudienceRole: 'Program Director', defaultAudienceSeniority: 'Director' },
  consulting: { key: 'consulting', name: 'Consulting / Services', icon: '📊', regulated: false, complianceNote: null, defaultAudienceRole: 'VP of Strategy', defaultAudienceSeniority: 'VP' },
  'hr-recruiting': { key: 'hr-recruiting', name: 'HR / Recruiting', icon: '👥', regulated: false, complianceNote: null, defaultAudienceRole: 'HR Director', defaultAudienceSeniority: 'Director' },
  logistics: { key: 'logistics', name: 'Logistics / Supply Chain', icon: '🚚', regulated: false, complianceNote: null, defaultAudienceRole: 'Supply Chain Manager', defaultAudienceSeniority: 'Manager' },
  energy: { key: 'energy', name: 'Energy / CleanTech', icon: '⚡', regulated: true, complianceNote: 'Environmental claims must be substantiated. Avoid greenwashing.', defaultAudienceRole: 'Sustainability Officer', defaultAudienceSeniority: 'VP' },
  'food-beverage': { key: 'food-beverage', name: 'Food & Beverage', icon: '🍽️', regulated: true, complianceNote: 'FDA-compliant health claims only. No unsubstantiated nutrition claims.', defaultAudienceRole: 'Brand Manager', defaultAudienceSeniority: 'Manager' },
  other: { key: 'other', name: 'Other', icon: '🌐', regulated: false, complianceNote: null, defaultAudienceRole: 'Decision Maker', defaultAudienceSeniority: 'Manager' },
}

// ─── Strategy Goals ─────────────────────────────────────────────────────────────

export type StrategyGoalKey =
  | 'thought-leadership'
  | 'lead-generation'
  | 'brand-awareness'
  | 'community-building'
  | 'product-launch'
  | 'talent-attraction'
  | 'customer-education'
  | 'partner-ecosystem'
  | 'event-promotion'
  | 'seo-authority'

export interface StrategyGoal {
  key: StrategyGoalKey
  name: string
  description: string
  suggestedChannels: string[]
  contentMix: { type: string; percentage: number }[]
  ctaStyle: string
}

export const STRATEGY_GOALS: Record<StrategyGoalKey, StrategyGoal> = {
  'thought-leadership': {
    key: 'thought-leadership',
    name: 'Thought Leadership',
    description: 'Position as an industry authority with original insights',
    suggestedChannels: ['linkedin', 'twitter', 'blog'],
    contentMix: [{ type: 'opinion', percentage: 40 }, { type: 'data-insight', percentage: 30 }, { type: 'case-study', percentage: 30 }],
    ctaStyle: 'Follow for more insights',
  },
  'lead-generation': {
    key: 'lead-generation',
    name: 'Lead Generation',
    description: 'Drive qualified leads into your pipeline',
    suggestedChannels: ['linkedin', 'twitter', 'blog'],
    contentMix: [{ type: 'problem-solution', percentage: 40 }, { type: 'social-proof', percentage: 30 }, { type: 'gated-content', percentage: 30 }],
    ctaStyle: 'Book a demo / Download the guide',
  },
  'brand-awareness': {
    key: 'brand-awareness',
    name: 'Brand Awareness',
    description: 'Expand reach and recognition across channels',
    suggestedChannels: ['linkedin', 'twitter', 'instagram', 'youtube'],
    contentMix: [{ type: 'storytelling', percentage: 35 }, { type: 'behind-scenes', percentage: 30 }, { type: 'trending-takes', percentage: 35 }],
    ctaStyle: 'Share / Tag someone who needs this',
  },
  'community-building': {
    key: 'community-building',
    name: 'Community Building',
    description: 'Foster engaged communities around your brand',
    suggestedChannels: ['twitter', 'linkedin', 'reddit'],
    contentMix: [{ type: 'discussion', percentage: 40 }, { type: 'user-spotlight', percentage: 30 }, { type: 'polls-questions', percentage: 30 }],
    ctaStyle: 'Join the conversation / What do you think?',
  },
  'product-launch': {
    key: 'product-launch',
    name: 'Product Launch',
    description: 'Build buzz and drive adoption for new releases',
    suggestedChannels: ['twitter', 'linkedin', 'youtube', 'producthunt'],
    contentMix: [{ type: 'teaser', percentage: 30 }, { type: 'demo', percentage: 35 }, { type: 'social-proof', percentage: 35 }],
    ctaStyle: 'Try it free / Get early access',
  },
  'talent-attraction': {
    key: 'talent-attraction',
    name: 'Talent Attraction',
    description: 'Attract top talent by showcasing culture and mission',
    suggestedChannels: ['linkedin', 'twitter', 'instagram'],
    contentMix: [{ type: 'culture', percentage: 40 }, { type: 'employee-story', percentage: 30 }, { type: 'role-highlight', percentage: 30 }],
    ctaStyle: "We're hiring / See open roles",
  },
  'customer-education': {
    key: 'customer-education',
    name: 'Customer Education',
    description: 'Help customers succeed and reduce churn',
    suggestedChannels: ['youtube', 'blog', 'linkedin'],
    contentMix: [{ type: 'how-to', percentage: 45 }, { type: 'best-practice', percentage: 30 }, { type: 'tip', percentage: 25 }],
    ctaStyle: 'Learn more / Watch the tutorial',
  },
  'partner-ecosystem': {
    key: 'partner-ecosystem',
    name: 'Partner Ecosystem',
    description: 'Grow and engage your partner network',
    suggestedChannels: ['linkedin', 'blog'],
    contentMix: [{ type: 'co-marketing', percentage: 40 }, { type: 'integration-showcase', percentage: 30 }, { type: 'partner-win', percentage: 30 }],
    ctaStyle: 'Become a partner / Explore integrations',
  },
  'event-promotion': {
    key: 'event-promotion',
    name: 'Event Promotion',
    description: 'Drive registrations and attendance for events',
    suggestedChannels: ['linkedin', 'twitter', 'instagram'],
    contentMix: [{ type: 'speaker-spotlight', percentage: 30 }, { type: 'agenda-teaser', percentage: 35 }, { type: 'countdown', percentage: 35 }],
    ctaStyle: 'Register now / Save your spot',
  },
  'seo-authority': {
    key: 'seo-authority',
    name: 'SEO Authority',
    description: 'Build organic search presence with high-value content',
    suggestedChannels: ['blog', 'youtube'],
    contentMix: [{ type: 'pillar-content', percentage: 40 }, { type: 'how-to', percentage: 35 }, { type: 'comparison', percentage: 25 }],
    ctaStyle: 'Read the full guide / Subscribe',
  },
}

// ─── Creator Profile Type ───────────────────────────────────────────────────────

export interface CreatorProfile {
  id: string
  userId: string
  name: string
  isDefault: boolean

  // Voice
  voicePreset: VoicePresetKey
  voiceCustom?: {
    tone: number
    persuasion: 'logic' | 'emotion' | 'authority' | 'scarcity'
    energy: number
    humor: number
    formality: number
  } | null

  // Industry
  role: string
  company: string
  industry: IndustryKey
  audienceRole: string
  audienceSeniority: string
  complianceLevel: 'none' | 'light' | 'strict'

  // Strategy
  primaryGoal: StrategyGoalKey
  secondaryGoal?: StrategyGoalKey | null
  preferredChannels: string[]
  contentMix?: { type: string; percentage: number }[] | null
  postingFrequency: string
  competitorNames: string[]

  // Brand
  brandName: string
  brandKeywords: string[]
  brandAvoid: string[]
  brandColors?: { primary?: string; secondary?: string } | null
  logoUrl?: string | null

  // Facts
  factCheckSensitivity: 'low' | 'medium' | 'high'

  createdAt: string
  updatedAt: string
}

// ─── Default Profile Factory ────────────────────────────────────────────────────

export function createDefaultProfile(userId: string): Omit<CreatorProfile, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    userId,
    name: 'My Profile',
    isDefault: true,
    voicePreset: 'trusted-advisor',
    voiceCustom: null,
    role: '',
    company: '',
    industry: 'saas',
    audienceRole: 'Decision Maker',
    audienceSeniority: 'Manager',
    complianceLevel: 'none',
    primaryGoal: 'thought-leadership',
    secondaryGoal: null,
    preferredChannels: ['linkedin'],
    contentMix: null,
    postingFrequency: '3x/week',
    competitorNames: [],
    brandName: '',
    brandKeywords: [],
    brandAvoid: [],
    brandColors: null,
    logoUrl: null,
    factCheckSensitivity: 'medium',
  }
}

// ─── System Prompt Builder ──────────────────────────────────────────────────────

export function buildProfileSystemPrompt(profile: CreatorProfile): string {
  const voice = profile.voiceCustom
    ? `Voice: Custom (tone=${profile.voiceCustom.tone}/100, energy=${profile.voiceCustom.energy}/100, humor=${profile.voiceCustom.humor}/100, formality=${profile.voiceCustom.formality}/100, persuasion=${profile.voiceCustom.persuasion})`
    : `Voice: ${VOICE_PRESETS[profile.voicePreset]?.name || 'Trusted Advisor'} — ${VOICE_PRESETS[profile.voicePreset]?.tagline || 'authoritative but approachable'}`

  const industry = INDUSTRY_OPTIONS[profile.industry]
  const complianceStr = industry?.regulated
    ? `\nCOMPLIANCE (${profile.complianceLevel}): ${industry.complianceNote || 'Follow industry regulations.'}`
    : ''

  const goal = STRATEGY_GOALS[profile.primaryGoal]
  const secondaryGoal = profile.secondaryGoal ? STRATEGY_GOALS[profile.secondaryGoal] : null

  const lines: string[] = [
    '── CREATOR PROFILE ──',
    profile.role && profile.company
      ? `Role: ${profile.role} at ${profile.company}`
      : profile.role
        ? `Role: ${profile.role}`
        : '',
    `Industry: ${industry?.name || profile.industry}`,
    `Audience: ${profile.audienceRole} (${profile.audienceSeniority} level)`,
    voice,
    goal ? `Primary Goal: ${goal.name} — ${goal.description}` : '',
    secondaryGoal ? `Secondary Goal: ${secondaryGoal.name}` : '',
    profile.preferredChannels.length > 0
      ? `Preferred Channels: ${profile.preferredChannels.join(', ')}`
      : '',
    profile.brandName ? `Brand: "${profile.brandName}"` : '',
    profile.brandKeywords.length > 0
      ? `Brand Keywords: ${profile.brandKeywords.join(', ')}`
      : '',
    profile.brandAvoid.length > 0
      ? `Avoid: ${profile.brandAvoid.join(', ')}`
      : '',
    profile.competitorNames.length > 0
      ? `Competitors (differentiate from): ${profile.competitorNames.join(', ')}`
      : '',
    `Fact-Check Sensitivity: ${profile.factCheckSensitivity}`,
    complianceStr,
    '── END PROFILE ──',
  ]

  return lines.filter(Boolean).join('\n')
}
