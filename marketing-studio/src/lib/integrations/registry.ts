/**
 * Master Integration Registry (P21)
 *
 * Single source of truth for all supported integrations.
 * Defines provider metadata, env var mappings, categories, and tiers.
 * Used by IntegrationManager, Integrations page, and status resolution.
 */

export interface IntegrationDefinition {
  provider: string
  displayName: string
  category: 'ai_model' | 'video_generation' | 'search' | 'voice_audio' | 'music' | 'thumbnails' | 'video_editing' | 'publishing'
  description: string
  envVar: string
  getApiKeyUrl: string
  capabilities: string[]
  tier: 'free' | 'standard' | 'premium' | 'cinematic'
  /** Maps to StudioIntegrationType enum in Prisma */
  dbType: string | null
  /** If this provider shares an env var with another (e.g., sora shares OPENAI_API_KEY) */
  sharedEnvWith?: string
  /** OAuth-based provider (no API key input — uses redirect flow) */
  oauthProvider?: boolean
}

export interface IntegrationStatus {
  provider: string
  displayName: string
  category: IntegrationDefinition['category']
  status: 'connected' | 'connected_env' | 'disconnected' | 'error'
  source: 'database' | 'env' | 'none'
  keyLastFour: string | null
  lastTestedAt: string | null
  description: string
  envVar: string
  getApiKeyUrl: string
  capabilities: string[]
  tier: IntegrationDefinition['tier']
  oauthProvider?: boolean
}

export const INTEGRATION_REGISTRY: IntegrationDefinition[] = [
  // ── AI Models ───────────────────────────────────────────
  {
    provider: 'anthropic',
    displayName: 'Anthropic (Claude)',
    category: 'ai_model',
    description: 'Powers Mia, your AI content strategist',
    envVar: 'ANTHROPIC_API_KEY',
    getApiKeyUrl: 'https://console.anthropic.com/settings/keys',
    capabilities: ['content_generation', 'script_analysis', 'seo_optimization'],
    tier: 'premium',
    dbType: 'ANTHROPIC',
  },
  {
    provider: 'openai',
    displayName: 'OpenAI (GPT-4)',
    category: 'ai_model',
    description: 'Alternative AI model for content generation + DALL-E for images',
    envVar: 'OPENAI_API_KEY',
    getApiKeyUrl: 'https://platform.openai.com/api-keys',
    capabilities: ['content_generation', 'image_generation', 'video_generation'],
    tier: 'premium',
    dbType: 'OPENAI',
  },
  {
    provider: 'gemini',
    displayName: 'Google Gemini',
    category: 'ai_model',
    description: "Google's multimodal AI for content generation and analysis",
    envVar: 'GOOGLE_AI_API_KEY',
    getApiKeyUrl: 'https://aistudio.google.com/apikey',
    capabilities: ['content_generation', 'multimodal_analysis'],
    tier: 'premium',
    dbType: 'GEMINI',
  },
  // ── Search ──────────────────────────────────────────────
  {
    provider: 'brave',
    displayName: 'Brave Search API',
    category: 'search',
    description: 'Real-time web research for content insights and competitive intelligence',
    envVar: 'BRAVE_SEARCH_API_KEY',
    getApiKeyUrl: 'https://brave.com/search/api/',
    capabilities: ['web_search', 'keyword_research', 'competitive_intel'],
    tier: 'standard',
    dbType: null,
  },
  // ── Video Generation ────────────────────────────────────
  {
    provider: 'runway',
    displayName: 'Runway Gen-4.5',
    category: 'video_generation',
    description: 'Hollywood-grade cinematic text-to-video generation',
    envVar: 'RUNWAYML_API_SECRET',
    getApiKeyUrl: 'https://dev.runwayml.com/',
    capabilities: ['text_to_video', 'image_to_video'],
    tier: 'cinematic',
    dbType: 'RUNWAY',
  },
  {
    provider: 'heygen',
    displayName: 'HeyGen',
    category: 'video_generation',
    description: 'AI avatar video generation for personalized outreach',
    envVar: 'HEYGEN_API_KEY',
    getApiKeyUrl: 'https://app.heygen.com/settings/api',
    capabilities: ['avatar_video', 'talking_head'],
    tier: 'premium',
    dbType: 'HEYGEN',
  },
  {
    provider: 'sora',
    displayName: 'OpenAI Sora 2',
    category: 'video_generation',
    description: 'Cinematic AI video with synchronized audio',
    envVar: 'OPENAI_API_KEY',
    getApiKeyUrl: 'https://platform.openai.com/api-keys',
    capabilities: ['text_to_video', 'audio_sync'],
    tier: 'cinematic',
    dbType: 'OPENAI',
    sharedEnvWith: 'openai',
  },
  // ── Voice & Audio ───────────────────────────────────────
  {
    provider: 'elevenlabs',
    displayName: 'ElevenLabs',
    category: 'voice_audio',
    description: 'AI voice generation and text-to-speech',
    envVar: 'ELEVENLABS_API_KEY',
    getApiKeyUrl: 'https://elevenlabs.io/app/settings/api-keys',
    capabilities: ['text_to_speech', 'voice_cloning'],
    tier: 'premium',
    dbType: 'ELEVENLABS',
  },
  // ── Thumbnails ──────────────────────────────────────────
  {
    provider: 'leonardo',
    displayName: 'Leonardo AI',
    category: 'thumbnails',
    description: 'AI image generation for thumbnails and graphics',
    envVar: 'LEONARDO_API_KEY',
    getApiKeyUrl: 'https://app.leonardo.ai/api-access',
    capabilities: ['image_generation', 'thumbnails'],
    tier: 'standard',
    dbType: null,
  },
  // ── Video Editing ───────────────────────────────────────
  {
    provider: 'descript',
    displayName: 'Descript',
    category: 'video_editing',
    description: 'AI-powered video editing and transcription',
    envVar: 'DESCRIPT_API_KEY',
    getApiKeyUrl: 'https://web.descript.com/settings/developer',
    capabilities: ['video_editing', 'transcription'],
    tier: 'premium',
    dbType: null,
  },
  {
    provider: 'opus_clip',
    displayName: 'Opus Clip',
    category: 'video_editing',
    description: 'Long-form to short-form video repurposing',
    envVar: 'OPUS_API_KEY',
    getApiKeyUrl: 'https://www.opus.pro/settings',
    capabilities: ['video_repurposing', 'clip_extraction'],
    tier: 'standard',
    dbType: null,
  },
  // ── Publishing ──────────────────────────────────────────
  {
    provider: 'youtube',
    displayName: 'YouTube',
    category: 'publishing',
    description: 'Publish videos directly to your YouTube channel',
    envVar: 'GOOGLE_CLIENT_ID',
    getApiKeyUrl: 'https://console.cloud.google.com/apis/credentials',
    capabilities: ['video_upload', 'channel_management'],
    tier: 'standard',
    dbType: 'YOUTUBE',
    oauthProvider: true,
  },
]

/** Category display config */
export const INTEGRATION_CATEGORIES = [
  { id: 'all', name: 'All Integrations' },
  { id: 'ai_model', name: 'AI Models' },
  { id: 'video_generation', name: 'Video Generation' },
  { id: 'search', name: 'Search' },
  { id: 'voice_audio', name: 'Voice & Audio' },
  { id: 'thumbnails', name: 'Thumbnails' },
  { id: 'video_editing', name: 'Video Editing' },
  { id: 'publishing', name: 'Publishing' },
] as const
