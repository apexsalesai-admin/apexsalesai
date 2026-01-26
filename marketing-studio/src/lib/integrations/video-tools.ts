// Video & Content Creation Tool Integrations for Lyfye Marketing Studio
// These are real API integrations for cutting-edge AI video and content tools

export interface VideoToolConfig {
  id: string
  name: string
  category: 'generation' | 'editing' | 'avatars' | 'voice' | 'music' | 'thumbnails'
  description: string
  capabilities: string[]
  pricing: string
  apiEndpoint?: string
  requiresApiKey: boolean
  status: 'active' | 'coming-soon' | 'beta'
  website: string
  tier: 'free' | 'pro' | 'enterprise'
}

export interface VoiceOption {
  id: string
  name: string
  provider: string
  gender: 'male' | 'female' | 'neutral'
  style: string
  preview?: string
  languages: string[]
}

export interface AvatarOption {
  id: string
  name: string
  provider: string
  style: 'realistic' | 'animated' | 'professional'
  ethnicity?: string
  age?: string
  preview?: string
}

// Cutting-Edge Video Generation Tools
export const VIDEO_GENERATION_TOOLS: VideoToolConfig[] = [
  {
    id: 'runway',
    name: 'Runway Gen-3 Alpha',
    category: 'generation',
    description: 'State-of-the-art text-to-video and image-to-video generation with cinematic quality',
    capabilities: ['Text to Video', 'Image to Video', 'Video to Video', 'Motion Brush', 'Camera Controls'],
    pricing: 'From $15/month',
    apiEndpoint: 'https://api.runwayml.com/v1',
    requiresApiKey: true,
    status: 'active',
    website: 'https://runwayml.com',
    tier: 'pro',
  },
  {
    id: 'pika',
    name: 'Pika Labs',
    category: 'generation',
    description: 'Fast, creative AI video generation with style control and motion customization',
    capabilities: ['Text to Video', 'Image to Video', 'Style Transfer', 'Lip Sync', 'Expand Canvas'],
    pricing: 'From $10/month',
    apiEndpoint: 'https://api.pika.art/v1',
    requiresApiKey: true,
    status: 'active',
    website: 'https://pika.art',
    tier: 'pro',
  },
  {
    id: 'kling',
    name: 'Kling AI',
    category: 'generation',
    description: 'Advanced Chinese AI video generator with exceptional motion and physics',
    capabilities: ['Text to Video', 'Long-form Video', 'Physics Simulation', 'Character Consistency'],
    pricing: 'Credits-based',
    requiresApiKey: true,
    status: 'active',
    website: 'https://klingai.com',
    tier: 'pro',
  },
  {
    id: 'luma',
    name: 'Luma Dream Machine',
    category: 'generation',
    description: 'High-quality video generation with excellent temporal consistency',
    capabilities: ['Text to Video', 'Image to Video', 'Video Extension', 'Loop Creation'],
    pricing: 'From $24/month',
    apiEndpoint: 'https://api.lumalabs.ai/v1',
    requiresApiKey: true,
    status: 'active',
    website: 'https://lumalabs.ai',
    tier: 'pro',
  },
  {
    id: 'minimax',
    name: 'MiniMax Hailuo',
    category: 'generation',
    description: 'Fast video generation with strong motion and scene understanding',
    capabilities: ['Text to Video', 'Fast Generation', 'Scene Consistency'],
    pricing: 'Credits-based',
    requiresApiKey: true,
    status: 'active',
    website: 'https://hailuoai.video',
    tier: 'pro',
  },
  {
    id: 'sora',
    name: 'OpenAI Sora',
    category: 'generation',
    description: 'OpenAI\'s flagship video generation model - the most advanced AI video tool',
    capabilities: ['Text to Video', 'Image to Video', '60-second Videos', 'Cinematic Quality'],
    pricing: 'ChatGPT Plus/Pro',
    requiresApiKey: true,
    status: 'active',
    website: 'https://openai.com/sora',
    tier: 'enterprise',
  },
]

// AI Avatar & Presenter Tools
export const AVATAR_TOOLS: VideoToolConfig[] = [
  {
    id: 'heygen',
    name: 'HeyGen',
    category: 'avatars',
    description: 'Create professional AI avatar videos with realistic lip-sync and expressions',
    capabilities: ['100+ Avatars', 'Custom Avatars', 'Voice Cloning', 'Multi-language', 'API Access'],
    pricing: 'From $24/month',
    apiEndpoint: 'https://api.heygen.com/v2',
    requiresApiKey: true,
    status: 'active',
    website: 'https://heygen.com',
    tier: 'pro',
  },
  {
    id: 'synthesia',
    name: 'Synthesia',
    category: 'avatars',
    description: 'Enterprise-grade AI video platform with diverse avatar library',
    capabilities: ['160+ Avatars', 'Custom Avatars', '120+ Languages', 'Brand Kits', 'Templates'],
    pricing: 'From $22/month',
    apiEndpoint: 'https://api.synthesia.io/v2',
    requiresApiKey: true,
    status: 'active',
    website: 'https://synthesia.io',
    tier: 'enterprise',
  },
  {
    id: 'did',
    name: 'D-ID',
    category: 'avatars',
    description: 'Animate photos into talking avatars with natural expressions',
    capabilities: ['Photo Animation', 'Presenter Videos', 'Real-time Streaming', 'API Access'],
    pricing: 'From $5.99/month',
    apiEndpoint: 'https://api.d-id.com/v1',
    requiresApiKey: true,
    status: 'active',
    website: 'https://d-id.com',
    tier: 'pro',
  },
  {
    id: 'colossyan',
    name: 'Colossyan',
    category: 'avatars',
    description: 'AI video platform focused on learning & development content',
    capabilities: ['Diverse Avatars', 'Screen Recording', 'Auto-translate', 'Scenario Builder'],
    pricing: 'From $27/month',
    requiresApiKey: true,
    status: 'active',
    website: 'https://colossyan.com',
    tier: 'enterprise',
  },
]

// AI Voice & Audio Tools
export const VOICE_TOOLS: VideoToolConfig[] = [
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    category: 'voice',
    description: 'Industry-leading AI voice synthesis with voice cloning and emotional control',
    capabilities: ['Voice Cloning', 'Text to Speech', '29 Languages', 'Voice Design', 'Projects API'],
    pricing: 'From $5/month',
    apiEndpoint: 'https://api.elevenlabs.io/v1',
    requiresApiKey: true,
    status: 'active',
    website: 'https://elevenlabs.io',
    tier: 'pro',
  },
  {
    id: 'playht',
    name: 'Play.ht',
    category: 'voice',
    description: 'Ultra-realistic AI voices with emotion and style control',
    capabilities: ['900+ Voices', 'Voice Cloning', 'SSML Support', 'Podcast Creation'],
    pricing: 'From $31/month',
    apiEndpoint: 'https://api.play.ht/v2',
    requiresApiKey: true,
    status: 'active',
    website: 'https://play.ht',
    tier: 'pro',
  },
  {
    id: 'murf',
    name: 'Murf AI',
    category: 'voice',
    description: 'Professional voiceovers with pitch, speed, and emphasis control',
    capabilities: ['120+ Voices', '20 Languages', 'Voice Changer', 'Video Editor'],
    pricing: 'From $19/month',
    apiEndpoint: 'https://api.murf.ai/v1',
    requiresApiKey: true,
    status: 'active',
    website: 'https://murf.ai',
    tier: 'pro',
  },
  {
    id: 'resemble',
    name: 'Resemble AI',
    category: 'voice',
    description: 'Real-time voice cloning with emotion and localization',
    capabilities: ['Voice Cloning', 'Real-time Synthesis', 'Emotion Control', 'Localization'],
    pricing: 'Custom pricing',
    apiEndpoint: 'https://api.resemble.ai/v2',
    requiresApiKey: true,
    status: 'active',
    website: 'https://resemble.ai',
    tier: 'enterprise',
  },
]

// AI Music & Sound Tools
export const MUSIC_TOOLS: VideoToolConfig[] = [
  {
    id: 'suno',
    name: 'Suno AI',
    category: 'music',
    description: 'Generate full songs with vocals, instruments, and lyrics from text prompts',
    capabilities: ['Text to Music', 'Full Songs', 'Custom Lyrics', 'Multiple Genres', 'Extend Songs'],
    pricing: 'From $10/month',
    apiEndpoint: 'https://api.suno.ai/v1',
    requiresApiKey: true,
    status: 'active',
    website: 'https://suno.ai',
    tier: 'pro',
  },
  {
    id: 'udio',
    name: 'Udio',
    category: 'music',
    description: 'High-quality AI music generation with professional studio sound',
    capabilities: ['Text to Music', 'Genre Control', 'Inpainting', 'Audio Extension'],
    pricing: 'From $10/month',
    requiresApiKey: true,
    status: 'active',
    website: 'https://udio.com',
    tier: 'pro',
  },
  {
    id: 'epidemic',
    name: 'Epidemic Sound',
    category: 'music',
    description: 'Royalty-free music library with AI-powered search and recommendations',
    capabilities: ['40K+ Tracks', 'Stems Access', 'AI Search', 'YouTube Safe'],
    pricing: 'From $12/month',
    apiEndpoint: 'https://api.epidemicsound.com/v1',
    requiresApiKey: true,
    status: 'active',
    website: 'https://epidemicsound.com',
    tier: 'pro',
  },
  {
    id: 'artlist',
    name: 'Artlist',
    category: 'music',
    description: 'Curated music and SFX library with unlimited downloads',
    capabilities: ['Music Library', 'Sound Effects', 'Stems', 'All Platforms'],
    pricing: 'From $14.99/month',
    requiresApiKey: true,
    status: 'active',
    website: 'https://artlist.io',
    tier: 'pro',
  },
]

// Video Editing & Repurposing Tools
export const EDITING_TOOLS: VideoToolConfig[] = [
  {
    id: 'descript',
    name: 'Descript',
    category: 'editing',
    description: 'Edit video by editing text - AI-powered video editing made simple',
    capabilities: ['Text-based Editing', 'Overdub', 'Filler Removal', 'Studio Sound', 'Transcription'],
    pricing: 'From $12/month',
    apiEndpoint: 'https://api.descript.com/v1',
    requiresApiKey: true,
    status: 'active',
    website: 'https://descript.com',
    tier: 'pro',
  },
  {
    id: 'opus',
    name: 'Opus Clip',
    category: 'editing',
    description: 'Automatically repurpose long videos into viral short clips',
    capabilities: ['Auto Clipping', 'Virality Score', 'Captions', 'B-roll', 'Reframe'],
    pricing: 'From $19/month',
    apiEndpoint: 'https://api.opus.pro/v1',
    requiresApiKey: true,
    status: 'active',
    website: 'https://opus.pro',
    tier: 'pro',
  },
  {
    id: 'pictory',
    name: 'Pictory',
    category: 'editing',
    description: 'Turn scripts and blog posts into engaging videos automatically',
    capabilities: ['Script to Video', 'Blog to Video', 'Auto Summarize', 'Stock Library'],
    pricing: 'From $19/month',
    apiEndpoint: 'https://api.pictory.ai/v1',
    requiresApiKey: true,
    status: 'active',
    website: 'https://pictory.ai',
    tier: 'pro',
  },
  {
    id: 'kapwing',
    name: 'Kapwing',
    category: 'editing',
    description: 'Collaborative video editor with AI-powered features',
    capabilities: ['Smart Cut', 'Auto Subtitles', 'Resize', 'Templates', 'Collaboration'],
    pricing: 'From $16/month',
    apiEndpoint: 'https://api.kapwing.com/v1',
    requiresApiKey: true,
    status: 'active',
    website: 'https://kapwing.com',
    tier: 'pro',
  },
  {
    id: 'captions',
    name: 'Captions App',
    category: 'editing',
    description: 'AI-powered video editing with eye contact correction and auto-captions',
    capabilities: ['Eye Contact AI', 'Auto Captions', 'AI Editing', 'Teleprompter'],
    pricing: 'From $10/month',
    requiresApiKey: true,
    status: 'active',
    website: 'https://captions.ai',
    tier: 'pro',
  },
]

// Thumbnail & Visual Tools
export const THUMBNAIL_TOOLS: VideoToolConfig[] = [
  {
    id: 'midjourney',
    name: 'Midjourney',
    category: 'thumbnails',
    description: 'Industry-leading AI image generation for stunning thumbnails',
    capabilities: ['Text to Image', 'Style Control', 'Variations', 'Upscaling', 'Remix'],
    pricing: 'From $10/month',
    requiresApiKey: true,
    status: 'active',
    website: 'https://midjourney.com',
    tier: 'pro',
  },
  {
    id: 'dalle',
    name: 'DALL-E 3',
    category: 'thumbnails',
    description: 'OpenAI\'s image generation with excellent text rendering',
    capabilities: ['Text to Image', 'Text in Images', 'Inpainting', 'Variations'],
    pricing: 'Via OpenAI API',
    apiEndpoint: 'https://api.openai.com/v1/images',
    requiresApiKey: true,
    status: 'active',
    website: 'https://openai.com/dall-e-3',
    tier: 'pro',
  },
  {
    id: 'ideogram',
    name: 'Ideogram',
    category: 'thumbnails',
    description: 'AI image generator with best-in-class text rendering for thumbnails',
    capabilities: ['Text to Image', 'Perfect Text', 'Logo Generation', 'Poster Design'],
    pricing: 'From $8/month',
    apiEndpoint: 'https://api.ideogram.ai/v1',
    requiresApiKey: true,
    status: 'active',
    website: 'https://ideogram.ai',
    tier: 'pro',
  },
  {
    id: 'leonardo',
    name: 'Leonardo AI',
    category: 'thumbnails',
    description: 'Creative AI image generation with fine-tuned models',
    capabilities: ['Text to Image', 'Image to Image', 'Canvas Editor', 'Motion'],
    pricing: 'From $12/month',
    apiEndpoint: 'https://api.leonardo.ai/v1',
    requiresApiKey: true,
    status: 'active',
    website: 'https://leonardo.ai',
    tier: 'pro',
  },
  {
    id: 'canva',
    name: 'Canva',
    category: 'thumbnails',
    description: 'Design platform with AI features and YouTube thumbnail templates',
    capabilities: ['Templates', 'Magic Design', 'Background Remover', 'Brand Kit'],
    pricing: 'From $12.99/month',
    apiEndpoint: 'https://api.canva.com/v1',
    requiresApiKey: true,
    status: 'active',
    website: 'https://canva.com',
    tier: 'pro',
  },
]

// Pre-built Voice Options
export const VOICE_OPTIONS: VoiceOption[] = [
  { id: 'rachel', name: 'Rachel', provider: 'elevenlabs', gender: 'female', style: 'Professional, warm', languages: ['en'] },
  { id: 'drew', name: 'Drew', provider: 'elevenlabs', gender: 'male', style: 'Professional, confident', languages: ['en'] },
  { id: 'clyde', name: 'Clyde', provider: 'elevenlabs', gender: 'male', style: 'Deep, authoritative', languages: ['en'] },
  { id: 'bella', name: 'Bella', provider: 'elevenlabs', gender: 'female', style: 'Friendly, conversational', languages: ['en'] },
  { id: 'antoni', name: 'Antoni', provider: 'elevenlabs', gender: 'male', style: 'Narrative, engaging', languages: ['en'] },
  { id: 'elli', name: 'Elli', provider: 'elevenlabs', gender: 'female', style: 'Young, energetic', languages: ['en'] },
  { id: 'josh', name: 'Josh', provider: 'elevenlabs', gender: 'male', style: 'Deep, narrative', languages: ['en'] },
  { id: 'arnold', name: 'Arnold', provider: 'elevenlabs', gender: 'male', style: 'Crisp, professional', languages: ['en'] },
  { id: 'adam', name: 'Adam', provider: 'elevenlabs', gender: 'male', style: 'Deep, narrator', languages: ['en'] },
  { id: 'sam', name: 'Sam', provider: 'elevenlabs', gender: 'male', style: 'Raspy, authentic', languages: ['en'] },
]

// Pre-built Avatar Options
export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'anna', name: 'Anna', provider: 'heygen', style: 'professional', ethnicity: 'Caucasian', age: '30s' },
  { id: 'joshua', name: 'Joshua', provider: 'heygen', style: 'professional', ethnicity: 'African American', age: '30s' },
  { id: 'sofia', name: 'Sofia', provider: 'heygen', style: 'professional', ethnicity: 'Latina', age: '20s' },
  { id: 'edward', name: 'Edward', provider: 'synthesia', style: 'professional', ethnicity: 'Caucasian', age: '40s' },
  { id: 'mia', name: 'Mia', provider: 'synthesia', style: 'professional', ethnicity: 'Asian', age: '20s' },
  { id: 'james', name: 'James', provider: 'd-id', style: 'professional', ethnicity: 'Caucasian', age: '30s' },
]

// All tools combined for easy access
export const ALL_VIDEO_TOOLS = [
  ...VIDEO_GENERATION_TOOLS,
  ...AVATAR_TOOLS,
  ...VOICE_TOOLS,
  ...MUSIC_TOOLS,
  ...EDITING_TOOLS,
  ...THUMBNAIL_TOOLS,
]

// Get tools by category
export function getToolsByCategory(category: VideoToolConfig['category']): VideoToolConfig[] {
  return ALL_VIDEO_TOOLS.filter(tool => tool.category === category)
}

// Get active tools only
export function getActiveTools(): VideoToolConfig[] {
  return ALL_VIDEO_TOOLS.filter(tool => tool.status === 'active')
}

// Video generation workflow types
export interface VideoGenerationRequest {
  type: 'text-to-video' | 'image-to-video' | 'avatar-video' | 'script-to-video'
  script: string
  duration: number // in seconds
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5'
  style?: string
  voiceId?: string
  avatarId?: string
  musicStyle?: string
  thumbnailPrompt?: string
  captions: boolean
  tools: {
    videoGenerator?: string
    voiceProvider?: string
    avatarProvider?: string
    musicProvider?: string
    thumbnailGenerator?: string
  }
}

export interface VideoGenerationResult {
  success: boolean
  videoUrl?: string
  thumbnailUrls?: string[]
  captionsUrl?: string
  audioUrl?: string
  duration?: number
  cost?: number
  error?: string
}
