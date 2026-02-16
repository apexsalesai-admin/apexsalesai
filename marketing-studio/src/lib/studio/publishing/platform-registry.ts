export type PublishingTier = 1 | 2 | 3

export interface PlatformAdaptation {
  toneShift: string
  hashtagStrategy: 'inline' | 'bottom' | 'first-comment' | 'none'
  mentionFormat: string
  linkHandling: 'inline' | 'bio' | 'first-comment' | 'link-sticker'
  ctaStyle: string
  emojiUsage: 'liberal' | 'moderate' | 'minimal' | 'none'
}

export interface PlatformConfig {
  id: string
  name: string
  icon: string
  tier: PublishingTier
  color: string
  description: string
  maxTextLength: number
  maxTitleLength?: number
  maxHashtags?: number
  supportedMediaTypes: string[]
  maxMediaCount?: number
  aspectRatios: { ratio: string; label: string; recommended?: boolean }[]
  supportsScheduling: boolean
  supportsThreads: boolean
  supportsDrafts: boolean
  supportsAnalytics: boolean
  isImplemented: boolean
  oauth?: {
    authUrl: string
    tokenUrl: string
    scopes: string[]
    additionalParams?: Record<string, string>
  }
  adaptation: PlatformAdaptation
}

export const PLATFORM_REGISTRY: Record<string, PlatformConfig> = {
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'linkedin',
    tier: 1,
    color: '#0A66C2',
    description: 'Professional thought leadership and B2B engagement',
    maxTextLength: 3000,
    maxHashtags: 5,
    supportedMediaTypes: ['image', 'video', 'article', 'document', 'carousel', 'poll'],
    maxMediaCount: 20,
    aspectRatios: [
      { ratio: '1:1', label: 'Square', recommended: true },
      { ratio: '16:9', label: 'Landscape' },
      { ratio: '4:5', label: 'Portrait' },
    ],
    supportsScheduling: true,
    supportsThreads: false,
    supportsDrafts: true,
    supportsAnalytics: true,
    isImplemented: true,
    oauth: {
      authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
      scopes: ['openid', 'profile', 'w_member_social'],
    },
    adaptation: {
      toneShift: 'Professional thought leadership. Data-backed insights. First-person narrative that builds authority.',
      hashtagStrategy: 'bottom',
      mentionFormat: '@{name}',
      linkHandling: 'inline',
      ctaStyle: 'Soft CTA: "What are your thoughts?" or "Share if you agree." Avoid hard sell.',
      emojiUsage: 'minimal',
    },
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    icon: 'youtube',
    tier: 1,
    color: '#FF0000',
    description: 'Video content, Shorts, and long-form storytelling',
    maxTextLength: 5000,
    maxTitleLength: 100,
    maxHashtags: 15,
    supportedMediaTypes: ['video'],
    aspectRatios: [
      { ratio: '16:9', label: 'Landscape', recommended: true },
      { ratio: '9:16', label: 'Shorts (vertical)' },
      { ratio: '1:1', label: 'Square' },
    ],
    supportsScheduling: true,
    supportsThreads: false,
    supportsDrafts: true,
    supportsAnalytics: true,
    isImplemented: true,
    oauth: {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scopes: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'],
      additionalParams: { access_type: 'offline', prompt: 'consent' },
    },
    adaptation: {
      toneShift: 'Conversational, hook-first. Open with a question or bold statement. Optimize for watch time.',
      hashtagStrategy: 'bottom',
      mentionFormat: '@{handle}',
      linkHandling: 'inline',
      ctaStyle: 'Subscribe + notification bell CTA. End screen card suggestions.',
      emojiUsage: 'moderate',
    },
  },
  x: {
    id: 'x',
    name: 'X (Twitter)',
    icon: 'twitter',
    tier: 1,
    color: '#000000',
    description: 'Short-form, punchy takes with thread support',
    maxTextLength: 280,
    maxHashtags: 3,
    supportedMediaTypes: ['image', 'video', 'poll'],
    maxMediaCount: 4,
    aspectRatios: [
      { ratio: '16:9', label: 'Landscape', recommended: true },
      { ratio: '1:1', label: 'Square' },
    ],
    supportsScheduling: true,
    supportsThreads: true,
    supportsDrafts: true,
    supportsAnalytics: true,
    isImplemented: true,
    oauth: {
      authUrl: 'https://twitter.com/i/oauth2/authorize',
      tokenUrl: 'https://api.x.com/2/oauth2/token',
      scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
      additionalParams: { pkce: 'true' },
    },
    adaptation: {
      toneShift: 'Punchy, concise, opinionated. Lead with the insight. Threads for depth.',
      hashtagStrategy: 'inline',
      mentionFormat: '@{handle}',
      linkHandling: 'inline',
      ctaStyle: 'Retweet/bookmark CTA or "Thread below" for thread starters.',
      emojiUsage: 'moderate',
    },
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook Page',
    icon: 'facebook',
    tier: 1,
    color: '#1877F2',
    description: 'Community engagement and storytelling for Pages',
    maxTextLength: 63206,
    maxHashtags: 10,
    supportedMediaTypes: ['image', 'video', 'carousel'],
    maxMediaCount: 10,
    aspectRatios: [
      { ratio: '16:9', label: 'Landscape', recommended: true },
      { ratio: '1:1', label: 'Square' },
      { ratio: '9:16', label: 'Vertical (Reels)' },
    ],
    supportsScheduling: true,
    supportsThreads: false,
    supportsDrafts: true,
    supportsAnalytics: true,
    isImplemented: false,
    adaptation: {
      toneShift: 'Community-focused, storytelling. Longer posts perform well. Native video preferred.',
      hashtagStrategy: 'bottom',
      mentionFormat: '@{pageName}',
      linkHandling: 'inline',
      ctaStyle: 'Engagement-first: "Tag someone who needs this" or "Share your experience."',
      emojiUsage: 'liberal',
    },
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'music',
    tier: 1,
    color: '#000000',
    description: 'Short-form video with trending hooks',
    maxTextLength: 2200,
    maxHashtags: 5,
    supportedMediaTypes: ['video'],
    aspectRatios: [
      { ratio: '9:16', label: 'Vertical', recommended: true },
      { ratio: '1:1', label: 'Square' },
    ],
    supportsScheduling: false,
    supportsThreads: false,
    supportsDrafts: true,
    supportsAnalytics: true,
    isImplemented: false,
    adaptation: {
      toneShift: 'Casual, energetic, trend-aware. Hook in first 3 seconds. Educational content that entertains.',
      hashtagStrategy: 'inline',
      mentionFormat: '@{handle}',
      linkHandling: 'bio',
      ctaStyle: 'Follow for more, duet this, stitch this. Comment-driving questions.',
      emojiUsage: 'liberal',
    },
  },
  threads: {
    id: 'threads',
    name: 'Threads',
    icon: 'at-sign',
    tier: 1,
    color: '#000000',
    description: 'Conversational, text-first engagement',
    maxTextLength: 500,
    maxHashtags: 5,
    supportedMediaTypes: ['image', 'video', 'carousel'],
    maxMediaCount: 10,
    aspectRatios: [
      { ratio: '1:1', label: 'Square', recommended: true },
      { ratio: '4:5', label: 'Portrait' },
    ],
    supportsScheduling: false,
    supportsThreads: true,
    supportsDrafts: false,
    supportsAnalytics: true,
    isImplemented: false,
    adaptation: {
      toneShift: 'Conversational, authentic. Text-first. Feels like talking to friends about industry topics.',
      hashtagStrategy: 'none',
      mentionFormat: '@{handle}',
      linkHandling: 'inline',
      ctaStyle: 'Discussion prompts. "Thoughts?" "What would you do?"',
      emojiUsage: 'moderate',
    },
  },
  pinterest: {
    id: 'pinterest',
    name: 'Pinterest',
    icon: 'pin',
    tier: 1,
    color: '#E60023',
    description: 'Visual discovery with SEO-optimized pins',
    maxTextLength: 500,
    maxTitleLength: 100,
    maxHashtags: 20,
    supportedMediaTypes: ['image', 'video'],
    aspectRatios: [
      { ratio: '2:3', label: 'Standard Pin', recommended: true },
      { ratio: '1:1', label: 'Square' },
      { ratio: '9:16', label: 'Idea Pin' },
    ],
    supportsScheduling: true,
    supportsThreads: false,
    supportsDrafts: true,
    supportsAnalytics: true,
    isImplemented: false,
    adaptation: {
      toneShift: 'Aspirational, actionable. SEO-optimized descriptions. "How to" framing.',
      hashtagStrategy: 'inline',
      mentionFormat: '@{handle}',
      linkHandling: 'inline',
      ctaStyle: 'Save this pin. Click through for more.',
      emojiUsage: 'minimal',
    },
  },
  medium: {
    id: 'medium',
    name: 'Medium',
    icon: 'book-open',
    tier: 1,
    color: '#000000',
    description: 'Long-form articles and thought leadership',
    maxTextLength: 100000,
    maxHashtags: 5,
    supportedMediaTypes: ['article'],
    aspectRatios: [{ ratio: '16:9', label: 'Feature Image', recommended: true }],
    supportsScheduling: false,
    supportsThreads: false,
    supportsDrafts: true,
    supportsAnalytics: false,
    isImplemented: false,
    adaptation: {
      toneShift: 'Long-form thought leadership. Well-structured with subheadings. Pull quotes and data.',
      hashtagStrategy: 'none',
      mentionFormat: '@{handle}',
      linkHandling: 'inline',
      ctaStyle: 'Clap + follow CTA.',
      emojiUsage: 'none',
    },
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    icon: 'instagram',
    tier: 2,
    color: '#E4405F',
    description: 'Visual storytelling — Business/Creator accounts via API, Personal via Ready-to-Post',
    maxTextLength: 2200,
    maxHashtags: 30,
    supportedMediaTypes: ['image', 'video', 'carousel', 'reel', 'story'],
    maxMediaCount: 10,
    aspectRatios: [
      { ratio: '1:1', label: 'Square Feed', recommended: true },
      { ratio: '4:5', label: 'Portrait Feed' },
      { ratio: '9:16', label: 'Reels/Stories' },
    ],
    supportsScheduling: true,
    supportsThreads: false,
    supportsDrafts: false,
    supportsAnalytics: true,
    isImplemented: false,
    adaptation: {
      toneShift: 'Visual-first storytelling. Caption hooks that stop the scroll.',
      hashtagStrategy: 'first-comment',
      mentionFormat: '@{handle}',
      linkHandling: 'bio',
      ctaStyle: 'Link in bio. Save this post. Share to stories.',
      emojiUsage: 'liberal',
    },
  },
  email: {
    id: 'email',
    name: 'Email Newsletter',
    icon: 'mail',
    tier: 2,
    color: '#6366F1',
    description: 'Direct email via SendGrid, Mailchimp, or ConvertKit',
    maxTextLength: 100000,
    supportedMediaTypes: ['article'],
    aspectRatios: [{ ratio: '16:9', label: 'Header Image', recommended: true }],
    supportsScheduling: true,
    supportsThreads: false,
    supportsDrafts: true,
    supportsAnalytics: true,
    isImplemented: false,
    adaptation: {
      toneShift: 'Personal, direct address. Scannable with bold key points.',
      hashtagStrategy: 'none',
      mentionFormat: '{name}',
      linkHandling: 'inline',
      ctaStyle: 'Single clear CTA button.',
      emojiUsage: 'moderate',
    },
  },
}

export function getImplementedPlatforms(): PlatformConfig[] {
  return Object.values(PLATFORM_REGISTRY).filter(p => p.isImplemented)
}

export function getAllPlatforms(): PlatformConfig[] {
  return Object.values(PLATFORM_REGISTRY)
}
