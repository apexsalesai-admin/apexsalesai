'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Clock,
  Send,
  X,
  AlertTriangle,
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

interface DbIntegration {
  id: string
  type: string
  status: 'PENDING' | 'CONNECTED' | 'DISCONNECTED' | 'REVOKED' | 'ERROR' | 'EXPIRED'
  externalName: string | null
  lastTestResult: string | null
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
  const [dbIntegrations, setDbIntegrations] = useState<DbIntegration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({})
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [tokenLastChecked, setTokenLastChecked] = useState<string | null>(null)
  const [testingConnection, setTestingConnection] = useState(false)
  const [tokenHealth, setTokenHealth] = useState<Array<{
    platform: string
    status: string
    lastChecked: string
    message?: string
  }>>([])

  // Test Publish modal state
  const [showTestPublish, setShowTestPublish] = useState(false)
  const [testPublishText, setTestPublishText] = useState('')
  const [testPublishConfirmed, setTestPublishConfirmed] = useState(false)
  const [testPublishLoading, setTestPublishLoading] = useState(false)
  const [testPublishResult, setTestPublishResult] = useState<{
    success: boolean
    postId?: string
    permalink?: string
    error?: string
    errorType?: string
  } | null>(null)

  const handleTestPublish = useCallback(async () => {
    if (!testPublishConfirmed || !testPublishText.trim()) return
    setTestPublishLoading(true)
    setTestPublishResult(null)

    try {
      const res = await fetch('/api/publish/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testPublishText.trim(),
          confirm: true,
        }),
      })
      const data = await res.json()
      setTestPublishResult({
        success: data.success,
        postId: data.postId,
        permalink: data.permalink,
        error: data.error,
        errorType: data.errorType,
      })
    } catch (err) {
      setTestPublishResult({
        success: false,
        error: err instanceof Error ? err.message : 'Network error',
      })
    } finally {
      setTestPublishLoading(false)
    }
  }, [testPublishConfirmed, testPublishText])

  const fetchTokenHealth = useCallback(async () => {
    setTestingConnection(true)
    try {
      const res = await fetch('/api/integrations/test')
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setTokenHealth(data.integrations || [])
          setTokenLastChecked(data.timestamp)
        }
      }
    } catch (e) {
      console.error('Failed to test integrations:', e)
    } finally {
      setTestingConnection(false)
    }
  }, [])

  useEffect(() => {
    async function checkIntegrations() {
      try {
        const [envRes, dbRes, tokenRes] = await Promise.all([
          fetch('/api/video/generate').catch(() => null),
          fetch('/api/system/readiness').catch(() => null),
          fetch('/api/integrations/test').catch(() => null),
        ])

        if (envRes?.ok) {
          const data = await envRes.json()
          setIntegrations(data.integrations || {})
        }

        if (dbRes?.ok) {
          const data = await dbRes.json()
          if (data.success && data.readiness?.checks) {
            setDbIntegrations(data.readiness.dbIntegrations || [])
          }
        }

        if (tokenRes?.ok) {
          const data = await tokenRes.json()
          if (data.success) {
            setTokenHealth(data.integrations || [])
            setTokenLastChecked(data.timestamp)
          }
        }
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
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
            <p className="text-slate-500">
              Connect your favorite AI and creative tools
              {tokenLastChecked && (
                <span className="ml-2 text-slate-400">
                  &middot; Last checked: {new Date(tokenLastChecked).toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={fetchTokenHealth}
          disabled={testingConnection}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors disabled:opacity-50"
        >
          {testingConnection ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span>Test Connections</span>
        </button>
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
            const dbMatch = dbIntegrations.find(
              (d) => d.type.toLowerCase() === apiKey.id.toLowerCase()
            )
            const Icon = apiKey.icon

            // Determine badge based on DB status + env var status
            const getBadge = () => {
              if (dbMatch) {
                switch (dbMatch.status) {
                  case 'CONNECTED':
                    return { label: 'Connected', color: 'bg-emerald-100 text-emerald-700', icon: Check }
                  case 'EXPIRED':
                  case 'PENDING':
                    return { label: 'Needs Auth', color: 'bg-amber-100 text-amber-700', icon: AlertCircle }
                  case 'ERROR':
                  case 'REVOKED':
                    return { label: 'Error', color: 'bg-red-100 text-red-700', icon: AlertCircle }
                  case 'DISCONNECTED':
                    return { label: 'Disconnected', color: 'bg-slate-100 text-slate-700', icon: AlertCircle }
                }
              }
              if (isConnected) {
                return { label: 'Connected', color: 'bg-emerald-100 text-emerald-700', icon: Check }
              }
              return { label: 'Not Connected', color: 'bg-amber-100 text-amber-700', icon: AlertCircle }
            }

            const badge = getBadge()
            const BadgeIcon = badge.icon
            const hasConnection = isConnected || dbMatch?.status === 'CONNECTED'

            return (
              <div
                key={apiKey.id}
                className={cn(
                  'p-6 bg-white rounded-xl border-2 transition-all',
                  hasConnection ? 'border-emerald-200' : dbMatch?.status === 'ERROR' ? 'border-red-200' : 'border-slate-200'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center',
                      hasConnection
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-slate-100 text-slate-400'
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="font-bold text-slate-900">{apiKey.name}</h3>
                        <span className={cn(
                          'flex items-center space-x-1 text-xs px-2 py-1 rounded-full',
                          badge.color
                        )}>
                          <BadgeIcon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </div>
                      {dbMatch?.externalName && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          Account: {dbMatch.externalName}
                        </p>
                      )}
                      {(() => {
                        const tokenInfo = tokenHealth.find(
                          (t) => t.platform.toLowerCase() === apiKey.id.toLowerCase()
                        )
                        if (tokenInfo && tokenInfo.status === 'EXPIRED') {
                          return (
                            <p className="flex items-center gap-1 text-xs text-amber-600 mt-0.5">
                              <Clock className="w-3 h-3" />
                              Token expired — reconnect required
                            </p>
                          )
                        }
                        if (tokenInfo && tokenInfo.status === 'ERROR') {
                          return (
                            <p className="flex items-center gap-1 text-xs text-red-600 mt-0.5">
                              <AlertCircle className="w-3 h-3" />
                              {tokenInfo.message || 'Token error'}
                            </p>
                          )
                        }
                        return null
                      })()}
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
                    {hasConnection ? (
                      <>
                        {dbMatch?.type === 'LINKEDIN' ? (
                          <button
                            onClick={() => {
                              setShowTestPublish(true)
                              setTestPublishText('')
                              setTestPublishConfirmed(false)
                              setTestPublishResult(null)
                            }}
                            className="px-4 py-2 text-sm font-medium text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors flex items-center space-x-2"
                          >
                            <Send className="w-4 h-4" />
                            <span>Test Publish</span>
                          </button>
                        ) : null}
                        <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center space-x-2">
                          <RefreshCw className="w-4 h-4" />
                          <span>Reconnect</span>
                        </button>
                      </>
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
                {!hasConnection && (
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

      {/* Test Publish Modal */}
      {showTestPublish && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Send className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Test Publish to LinkedIn</h2>
                  <p className="text-xs text-slate-500">This will create a REAL post on your LinkedIn profile</p>
                </div>
              </div>
              <button
                onClick={() => setShowTestPublish(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Warning */}
              <div className="flex items-start space-x-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">This is a live publish</p>
                  <p className="mt-1">The text below will be posted publicly to your LinkedIn feed. This action cannot be undone from this app.</p>
                </div>
              </div>

              {/* Textarea */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Post Content
                </label>
                <textarea
                  value={testPublishText}
                  onChange={(e) => setTestPublishText(e.target.value)}
                  placeholder="Write your LinkedIn post here..."
                  rows={5}
                  maxLength={3000}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                />
                <p className={cn(
                  'text-xs mt-1',
                  testPublishText.length > 2800 ? 'text-amber-600' : 'text-slate-400'
                )}>
                  {testPublishText.length}/3,000 characters
                </p>
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={testPublishConfirmed}
                  onChange={(e) => setTestPublishConfirmed(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">
                  I understand this will publish a <strong>real post</strong> to my LinkedIn profile that is visible to my network.
                </span>
              </label>

              {/* Result */}
              {testPublishResult && (
                <div className={cn(
                  'p-3 rounded-lg border text-sm',
                  testPublishResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                )}>
                  {testPublishResult.success ? (
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <Check className="w-4 h-4" /> Published successfully!
                      </p>
                      {testPublishResult.permalink && (
                        <a
                          href={testPublishResult.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-emerald-700 underline"
                        >
                          View on LinkedIn <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Publish failed
                      </p>
                      <p className="mt-1">{testPublishResult.error}</p>
                      {testPublishResult.errorType && (
                        <p className="mt-1 text-xs text-red-600">
                          Error type: {testPublishResult.errorType}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-200">
              <button
                onClick={() => setShowTestPublish(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTestPublish}
                disabled={!testPublishConfirmed || !testPublishText.trim() || testPublishLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testPublishLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{testPublishLoading ? 'Publishing...' : 'Publish to LinkedIn'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coming Soon Section */}
      <div className="p-6 bg-white rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
            Coming Soon
          </span>
          <h3 className="font-bold text-slate-900">Future Integrations</h3>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <p className="font-medium text-slate-900">Brave Search API</p>
            <p className="text-sm text-slate-500 mt-1">Real-time web research for content insights</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <p className="font-medium text-slate-900">Google Gemini</p>
            <p className="text-sm text-slate-500 mt-1">Multimodal AI for advanced content generation</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
            <p className="font-medium text-slate-900">Perplexity</p>
            <p className="text-sm text-slate-500 mt-1">AI-powered research assistant</p>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4">
          Want a specific integration? Let us know at feedback@lyfye.com
        </p>
      </div>

      {/* Help Section */}
      <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
        <h3 className="font-bold text-slate-900 mb-2">Need Help?</h3>
        <p className="text-sm text-slate-600 mb-4">
          To connect integrations, add your API keys to your Vercel project environment variables, or to <code className="bg-white/50 px-1 rounded">.env.local</code> for local development.
        </p>
        <div className="bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
          <pre>{`# .env.local (for local development)
# Or add to Vercel Dashboard → Settings → Environment Variables

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
