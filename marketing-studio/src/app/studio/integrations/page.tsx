'use client'

import { useState, useEffect } from 'react'
import {
  Zap,
  Check,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Copy,
  Loader2,
  Video,
  Mic,
  Music,
  Image as ImageIcon,
  Scissors,
  User,
  Brain,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  VIDEO_GENERATION_TOOLS,
  AVATAR_TOOLS,
  VOICE_TOOLS,
  MUSIC_TOOLS,
  THUMBNAIL_TOOLS,
  EDITING_TOOLS,
  VideoToolConfig,
} from '@/lib/integrations/video-tools'

interface IntegrationStatus {
  [key: string]: boolean
}

interface ApiKeyConfig {
  id: string
  name: string
  envVar: string
  description: string
  website: string
  category: 'ai' | 'video' | 'voice' | 'music' | 'image' | 'editing'
  icon: typeof Zap
}

const API_KEYS: ApiKeyConfig[] = [
  // AI Models
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    envVar: 'ANTHROPIC_API_KEY',
    description: 'Powers Mia, your AI content strategist',
    website: 'https://console.anthropic.com',
    category: 'ai',
    icon: Brain,
  },
  {
    id: 'openai',
    name: 'OpenAI (GPT-4)',
    envVar: 'OPENAI_API_KEY',
    description: 'Alternative AI model for content generation + DALL-E for images',
    website: 'https://platform.openai.com/api-keys',
    category: 'ai',
    icon: Sparkles,
  },
  // Video Generation
  {
    id: 'runway',
    name: 'Runway',
    envVar: 'RUNWAY_API_KEY',
    description: 'Gen-3 Alpha text-to-video generation',
    website: 'https://runwayml.com/api',
    category: 'video',
    icon: Video,
  },
  {
    id: 'heygen',
    name: 'HeyGen',
    envVar: 'HEYGEN_API_KEY',
    description: 'AI avatar video generation',
    website: 'https://app.heygen.com/settings',
    category: 'video',
    icon: User,
  },
  {
    id: 'synthesia',
    name: 'Synthesia',
    envVar: 'SYNTHESIA_API_KEY',
    description: 'Enterprise AI video platform',
    website: 'https://app.synthesia.io/#/settings/api',
    category: 'video',
    icon: User,
  },
  {
    id: 'did',
    name: 'D-ID',
    envVar: 'DID_API_KEY',
    description: 'Photo animation and talking avatars',
    website: 'https://studio.d-id.com/account-settings',
    category: 'video',
    icon: User,
  },
  // Voice
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    envVar: 'ELEVENLABS_API_KEY',
    description: 'Industry-leading AI voice synthesis',
    website: 'https://elevenlabs.io/app/settings/api-keys',
    category: 'voice',
    icon: Mic,
  },
  {
    id: 'playht',
    name: 'Play.ht',
    envVar: 'PLAYHT_API_KEY',
    description: 'Ultra-realistic AI voices',
    website: 'https://play.ht/app/api-access',
    category: 'voice',
    icon: Mic,
  },
  // Music
  {
    id: 'suno',
    name: 'Suno AI',
    envVar: 'SUNO_API_KEY',
    description: 'AI music generation',
    website: 'https://suno.ai/account',
    category: 'music',
    icon: Music,
  },
  {
    id: 'epidemic',
    name: 'Epidemic Sound',
    envVar: 'EPIDEMIC_API_KEY',
    description: 'Royalty-free music library',
    website: 'https://www.epidemicsound.com/account/api/',
    category: 'music',
    icon: Music,
  },
  // Image
  {
    id: 'midjourney',
    name: 'Midjourney',
    envVar: 'MIDJOURNEY_API_KEY',
    description: 'AI image generation for thumbnails',
    website: 'https://www.midjourney.com/account',
    category: 'image',
    icon: ImageIcon,
  },
  {
    id: 'leonardo',
    name: 'Leonardo AI',
    envVar: 'LEONARDO_API_KEY',
    description: 'Creative AI image generation',
    website: 'https://app.leonardo.ai/settings',
    category: 'image',
    icon: ImageIcon,
  },
  // Editing
  {
    id: 'descript',
    name: 'Descript',
    envVar: 'DESCRIPT_API_KEY',
    description: 'AI-powered video editing',
    website: 'https://web.descript.com/settings/developer',
    category: 'editing',
    icon: Scissors,
  },
  {
    id: 'opus',
    name: 'Opus Clip',
    envVar: 'OPUS_API_KEY',
    description: 'Long-form to short-form repurposing',
    website: 'https://www.opus.pro/settings',
    category: 'editing',
    icon: Scissors,
  },
]

const CATEGORIES = [
  { id: 'all', name: 'All Integrations', icon: Zap },
  { id: 'ai', name: 'AI Models', icon: Brain },
  { id: 'video', name: 'Video Generation', icon: Video },
  { id: 'voice', name: 'Voice & Audio', icon: Mic },
  { id: 'music', name: 'Music', icon: Music },
  { id: 'image', name: 'Thumbnails', icon: ImageIcon },
  { id: 'editing', name: 'Video Editing', icon: Scissors },
]

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationStatus>({})
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)

  useEffect(() => {
    async function checkIntegrations() {
      try {
        const response = await fetch('/api/video/generate')
        const data = await response.json()
        setIntegrations(data.integrations || {})
      } catch (e) {
        console.error('Failed to check integrations:', e)
      } finally {
        setIsLoading(false)
      }
    }
    checkIntegrations()
  }, [])

  const filteredKeys = selectedCategory === 'all'
    ? API_KEYS
    : API_KEYS.filter(k => k.category === selectedCategory)

  const configuredCount = Object.values(integrations).filter(Boolean).length
  const totalCount = API_KEYS.length

  const toggleShowKey = (id: string) => {
    setShowApiKeys(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleSaveKey = async (id: string) => {
    // In a real app, this would save to a secure backend
    // For now, we just show that they need to add it to .env
    setSavingKey(id)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSavingKey(null)
    alert('To add API keys, add them to your .env.local file and restart the server.')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
            <p className="text-slate-500">Connect your favorite AI and creative tools</p>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm">Connected</span>
            <Check className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{configuredCount}</p>
        </div>
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm">Available</span>
            <Zap className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{totalCount}</p>
        </div>
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm">Video Tools</span>
            <Video className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{VIDEO_GENERATION_TOOLS.length + AVATAR_TOOLS.length}</p>
        </div>
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm">Voice Tools</span>
            <Mic className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{VOICE_TOOLS.length}</p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'flex items-center space-x-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all',
                selectedCategory === cat.id
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.name}</span>
            </button>
          )
        })}
      </div>

      {/* API Keys List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredKeys.map(apiKey => {
            const isConnected = integrations[apiKey.id]
            const Icon = apiKey.icon

            return (
              <div
                key={apiKey.id}
                className={cn(
                  'p-6 bg-white rounded-xl border-2 transition-all',
                  isConnected ? 'border-emerald-200' : 'border-slate-200'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      isConnected
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-slate-100 text-slate-400'
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="font-bold text-slate-900">{apiKey.name}</h3>
                        {isConnected ? (
                          <span className="flex items-center space-x-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                            <Check className="w-3 h-3" />
                            <span>Connected</span>
                          </span>
                        ) : (
                          <span className="flex items-center space-x-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                            <AlertCircle className="w-3 h-3" />
                            <span>Not Connected</span>
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">{apiKey.description}</p>
                      <div className="flex items-center space-x-4 mt-3">
                        <code className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                          {apiKey.envVar}
                        </code>
                        <a
                          href={apiKey.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-purple-600 hover:text-purple-700 flex items-center space-x-1"
                        >
                          <span>Get API Key</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {isConnected ? (
                      <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center space-x-2">
                        <RefreshCw className="w-4 h-4" />
                        <span>Reconnect</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSaveKey(apiKey.id)}
                        disabled={savingKey === apiKey.id}
                        className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50"
                      >
                        {savingKey === apiKey.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}
                        <span>Connect</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* API Key Input (hidden by default) */}
                {!isConnected && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-2">
                      Add <code className="bg-slate-100 px-1 rounded">{apiKey.envVar}</code> to your <code className="bg-slate-100 px-1 rounded">.env.local</code> file:
                    </p>
                    <div className="flex items-center space-x-2">
                      <input
                        type={showApiKeys[apiKey.id] ? 'text' : 'password'}
                        placeholder={`${apiKey.envVar}=your_api_key_here`}
                        value={apiKeyInputs[apiKey.id] || ''}
                        onChange={(e) => setApiKeyInputs(prev => ({ ...prev, [apiKey.id]: e.target.value }))}
                        className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
                      />
                      <button
                        onClick={() => toggleShowKey(apiKey.id)}
                        className="p-2 text-slate-400 hover:text-slate-600"
                      >
                        {showApiKeys[apiKey.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`${apiKey.envVar}=${apiKeyInputs[apiKey.id] || 'your_api_key_here'}`)
                        }}
                        className="p-2 text-slate-400 hover:text-slate-600"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Help Section */}
      <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
        <h3 className="font-bold text-slate-900 mb-2">Need Help?</h3>
        <p className="text-sm text-slate-600 mb-4">
          To connect integrations, add your API keys to the <code className="bg-white/50 px-1 rounded">.env.local</code> file in your project root, then restart the development server.
        </p>
        <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
          <pre>{`# .env.local
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
HEYGEN_API_KEY=...
RUNWAY_API_KEY=...`}</pre>
        </div>
      </div>
    </div>
  )
}
