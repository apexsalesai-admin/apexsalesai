'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Zap,
  Check,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Video,
  Mic,
  Search,
  Brain,
  Sparkles,
  RefreshCw,
  X,
  Upload,
  Scissors,
  Image as ImageIcon,
  Linkedin,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MiaContextHint } from '@/components/studio/MiaContextHint'
import type { IntegrationStatus } from '@/lib/integrations/registry'

interface PublishingChannel {
  id: string
  platform: string
  tier: number
  displayName: string
  accountName: string | null
  accountAvatar: string | null
  isActive: boolean
  connectedAt: string
  lastPublishedAt: string | null
  lastError: string | null
  tokenExpiresAt: string | null
  tokenHealth: 'healthy' | 'expiring_soon' | 'expired' | 'unknown'
}

// ─── Category Config ────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { icon: typeof Zap; label: string }> = {
  all: { icon: Zap, label: 'All Integrations' },
  ai_model: { icon: Brain, label: 'AI Models' },
  video_generation: { icon: Video, label: 'Video Generation' },
  search: { icon: Search, label: 'Search' },
  voice_audio: { icon: Mic, label: 'Voice & Audio' },
  thumbnails: { icon: ImageIcon, label: 'Thumbnails' },
  video_editing: { icon: Scissors, label: 'Video Editing' },
  publishing: { icon: Upload, label: 'Publishing' },
}

const CATEGORIES = Object.entries(CATEGORY_CONFIG).map(([id, cfg]) => ({
  id,
  name: cfg.label,
  icon: cfg.icon,
}))

// ─── Main Page ──────────────────────────────────────────────

export default function IntegrationsPage() {
  const searchParams = useSearchParams()
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [testingAll, setTestingAll] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latency: number } | null>>({})

  // Publishing Channels state
  const [channels, setChannels] = useState<PublishingChannel[]>([])
  const [channelsLoading, setChannelsLoading] = useState(true)
  const [disconnectingChannel, setDisconnectingChannel] = useState<string | null>(null)

  // OAuth status from query params
  const oauthConnected = searchParams.get('connected')
  const oauthError = searchParams.get('error')
  const oauthDetail = searchParams.get('detail')

  // Connect modal state
  const [connectModal, setConnectModal] = useState<IntegrationStatus | null>(null)

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/studio/channels')
      if (res.ok) {
        const data = await res.json()
        if (data.success) setChannels(data.channels || [])
      }
    } catch (e) {
      console.error('Failed to fetch channels:', e)
    } finally {
      setChannelsLoading(false)
    }
  }, [])

  const disconnectChannel = async (channelId: string) => {
    setDisconnectingChannel(channelId)
    try {
      await fetch('/api/studio/channels', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId }),
      })
      setChannels(prev => prev.filter(c => c.id !== channelId))
    } catch (e) {
      console.error('Failed to disconnect channel:', e)
    } finally {
      setDisconnectingChannel(null)
    }
  }

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/studio/integrations')
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data) {
          setIntegrations(data.data)
        }
      }
    } catch (e) {
      console.error('Failed to fetch integrations:', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIntegrations()
    fetchChannels()
  }, [fetchIntegrations, fetchChannels])

  const testAllConnections = useCallback(async () => {
    setTestingAll(true)
    const connected = integrations.filter(i => i.status === 'connected' || i.status === 'connected_env')

    const results: Record<string, { success: boolean; latency: number } | null> = {}
    for (const integration of connected) {
      try {
        const res = await fetch(`/api/studio/integrations/${integration.provider}/test`, { method: 'POST' })
        const data = await res.json()
        results[integration.provider] = { success: data.success, latency: data.latency || 0 }
      } catch {
        results[integration.provider] = { success: false, latency: 0 }
      }
    }

    setTestResults(results)
    setTestingAll(false)
  }, [integrations])

  const filtered = selectedCategory === 'all'
    ? integrations
    : integrations.filter(i => i.category === selectedCategory)

  const connectedCount = integrations.filter(i => i.status === 'connected' || i.status === 'connected_env').length
  const totalCount = integrations.length

  const handleConnected = () => {
    setConnectModal(null)
    fetchIntegrations()
  }

  return (
    <div className="space-y-8">
      {/* Mia Context Hint */}
      <MiaContextHint
        hintKey="integrations-byok"
        message="Connect your own API keys for AI models, or use the platform keys already configured. Your keys are encrypted with AES-256-GCM and never logged."
        variant="default"
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
            <p className="text-slate-500">Connect your favorite AI and creative tools</p>
          </div>
        </div>
        <button
          onClick={testAllConnections}
          disabled={testingAll}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors disabled:opacity-50"
        >
          {testingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span>Test Connections</span>
        </button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm">Connected</span>
            <Check className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{connectedCount}</p>
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
            <span className="text-slate-500 text-sm">AI Models</span>
            <Brain className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {integrations.filter(i => i.category === 'ai_model' && (i.status === 'connected' || i.status === 'connected_env')).length}
          </p>
        </div>
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-500 text-sm">Video Tools</span>
            <Video className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {integrations.filter(i => i.category === 'video_generation' && (i.status === 'connected' || i.status === 'connected_env')).length}
          </p>
        </div>
      </div>

      {/* OAuth Status Banner */}
      {oauthConnected && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3">
          <Check className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-800">
            {oauthConnected.charAt(0).toUpperCase() + oauthConnected.slice(1)} connected successfully!
          </span>
        </div>
      )}
      {oauthError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="text-sm font-medium text-red-800">
              Connection failed: {oauthError.replace(/_/g, ' ')}
            </span>
          </div>
          {oauthDetail && (
            <p className="mt-2 ml-8 text-xs text-red-600 font-mono break-all">{oauthDetail}</p>
          )}
        </div>
      )}

      {/* Publishing Channels */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Upload className="w-5 h-5 text-purple-600" />
            <span>Publishing Channels</span>
          </h2>
          <a
            href="/api/studio/channels/connect/linkedin"
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium bg-[#0A66C2] text-white rounded-lg hover:bg-[#004182] transition-colors"
          >
            <Linkedin className="w-4 h-4" />
            <span>Connect LinkedIn</span>
          </a>
        </div>

        {channelsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          </div>
        ) : channels.length === 0 ? (
          <div className="p-8 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No publishing channels connected yet.</p>
            <p className="text-slate-400 text-xs mt-1">Connect LinkedIn to publish directly from Marketing Studio.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {channels.map(channel => {
              const platformIcons: Record<string, typeof Linkedin> = { linkedin: Linkedin }
              const PlatformIcon = platformIcons[channel.platform] || Upload
              const healthColors = {
                healthy: 'bg-emerald-500',
                expiring_soon: 'bg-amber-500',
                expired: 'bg-red-500',
                unknown: 'bg-slate-400',
              }

              return (
                <div key={channel.id} className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-[#0A66C2] rounded-lg flex items-center justify-center">
                      <PlatformIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-900">{channel.displayName}</span>
                        <span className={cn('w-2 h-2 rounded-full', healthColors[channel.tokenHealth])} title={`Token: ${channel.tokenHealth}`} />
                      </div>
                      <p className="text-xs text-slate-500">
                        {channel.platform.charAt(0).toUpperCase() + channel.platform.slice(1)}
                        {channel.accountName && ` — ${channel.accountName}`}
                        {channel.lastPublishedAt && ` — Last posted ${new Date(channel.lastPublishedAt).toLocaleDateString()}`}
                      </p>
                      {channel.lastError && (
                        <p className="text-xs text-red-500 mt-0.5">{channel.lastError}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {channel.tokenHealth === 'expired' && (
                      <a
                        href="/api/studio/channels/connect/linkedin"
                        className="text-xs font-medium px-3 py-1 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors flex items-center space-x-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Reconnect</span>
                      </a>
                    )}
                    <button
                      onClick={() => disconnectChannel(channel.id)}
                      disabled={disconnectingChannel === channel.id}
                      className="text-xs text-red-500 hover:text-red-700 p-1 rounded transition-colors disabled:opacity-50"
                      title="Disconnect"
                    >
                      {disconnectingChannel === channel.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
                  : 'bg-white text-slate-600 hover:bg-slate-100',
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{cat.name}</span>
            </button>
          )
        })}
      </div>

      {/* Integration Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(integration => (
            <IntegrationCard
              key={integration.provider}
              integration={integration}
              testResult={testResults[integration.provider] ?? null}
              onConnect={() => setConnectModal(integration)}
              onDisconnect={async () => {
                await fetch(`/api/studio/integrations/${integration.provider}`, { method: 'DELETE' })
                fetchIntegrations()
              }}
              onTest={async () => {
                const res = await fetch(`/api/studio/integrations/${integration.provider}/test`, { method: 'POST' })
                const data = await res.json()
                setTestResults(prev => ({ ...prev, [integration.provider]: { success: data.success, latency: data.latency || 0 } }))
              }}
            />
          ))}
        </div>
      )}

      {/* Connect Modal */}
      {connectModal && (
        <ConnectProviderModal
          integration={connectModal}
          onClose={() => setConnectModal(null)}
          onConnected={handleConnected}
        />
      )}
    </div>
  )
}

// ─── Integration Card ───────────────────────────────────────

function IntegrationCard({
  integration,
  testResult,
  onConnect,
  onDisconnect,
  onTest,
}: {
  integration: IntegrationStatus
  testResult: { success: boolean; latency: number } | null
  onConnect: () => void
  onDisconnect: () => Promise<void>
  onTest: () => Promise<void>
}) {
  const [testing, setTesting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const isConnected = integration.status === 'connected' || integration.status === 'connected_env'

  const badge = (() => {
    switch (integration.status) {
      case 'connected':
        return { label: 'Connected', color: 'bg-emerald-100 text-emerald-700', dotColor: 'bg-emerald-500' }
      case 'connected_env':
        return { label: 'Platform Key', color: 'bg-blue-100 text-blue-700', dotColor: 'bg-blue-500' }
      case 'error':
        return { label: 'Error', color: 'bg-red-100 text-red-700', dotColor: 'bg-red-500' }
      default:
        return { label: 'Not Connected', color: 'bg-slate-100 text-slate-600', dotColor: 'bg-slate-400' }
    }
  })()

  const tierBadge = (() => {
    switch (integration.tier) {
      case 'cinematic': return { label: 'Cinematic', color: 'bg-amber-100 text-amber-700' }
      case 'premium': return { label: 'Premium', color: 'bg-purple-100 text-purple-700' }
      case 'standard': return { label: 'Standard', color: 'bg-slate-100 text-slate-600' }
      default: return { label: 'Free', color: 'bg-emerald-100 text-emerald-700' }
    }
  })()

  const CategoryIcon = CATEGORY_CONFIG[integration.category]?.icon || Zap

  return (
    <div
      className={cn(
        'p-6 bg-white rounded-xl border-2 transition-all',
        isConnected ? 'border-emerald-200' : integration.status === 'error' ? 'border-red-200' : 'border-slate-200',
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            isConnected ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400',
          )}>
            <CategoryIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h3 className="font-bold text-slate-900">{integration.displayName}</h3>
              <span className={cn('flex items-center space-x-1.5 text-xs px-2 py-1 rounded-full', badge.color)}>
                <span className={cn('w-2 h-2 rounded-full', badge.dotColor)} />
                <span>{badge.label}</span>
              </span>
              <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', tierBadge.color)}>
                {tierBadge.label}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">{integration.description}</p>

            {/* Capabilities */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {integration.capabilities.map(cap => (
                <span key={cap} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                  {cap.replace(/_/g, ' ')}
                </span>
              ))}
            </div>

            {/* Env var + Get API Key link */}
            <div className="flex items-center space-x-4 mt-3">
              <code className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{integration.envVar}</code>
              {!integration.oauthProvider && (
                <a
                  href={integration.getApiKeyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-600 hover:text-purple-700 flex items-center space-x-1"
                >
                  <span>Get API Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Test result */}
            {testResult && (
              <div className={cn(
                'inline-flex items-center space-x-1.5 text-xs mt-2 px-2 py-1 rounded-full',
                testResult.success
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              )}>
                {testResult.success ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <AlertCircle className="w-3 h-3" />
                )}
                <span>{testResult.success ? `Test passed (${testResult.latency}ms)` : 'Test failed — check API key'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          {isConnected ? (
            <>
              <button
                onClick={async () => { setTesting(true); await onTest(); setTesting(false) }}
                disabled={testing}
                className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center space-x-1.5"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>Test</span>
              </button>
              {integration.source === 'database' && (
                <button
                  onClick={async () => { setDisconnecting(true); await onDisconnect(); setDisconnecting(false) }}
                  disabled={disconnecting}
                  className="px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Disconnect'}
                </button>
              )}
            </>
          ) : (
            <button
              onClick={onConnect}
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center space-x-2"
            >
              <Zap className="w-4 h-4" />
              <span>{integration.oauthProvider ? 'Authorize' : 'Connect'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Connect Provider Modal ─────────────────────────────────

function ConnectProviderModal({
  integration,
  onClose,
  onConnected,
}: {
  integration: IntegrationStatus
  onClose: () => void
  onConnected: () => void
}) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)

  const handleConnect = async () => {
    if (!apiKey.trim()) return
    setSaving(true)
    setResult(null)

    try {
      const res = await fetch('/api/studio/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: integration.provider, apiKey: apiKey.trim() }),
      })
      const data = await res.json()

      if (data.success) {
        setResult({ success: true })
        setTimeout(onConnected, 1500)
      } else {
        setResult({ success: false, error: data.error || 'Connection failed. Check your API key.' })
      }
    } catch {
      setResult({ success: false, error: 'Network error. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  // OAuth providers redirect instead of showing key input
  if (integration.oauthProvider) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Connect {integration.displayName}</h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-slate-600">
              {integration.displayName} requires OAuth authorization. Click below to authorize with Google.
            </p>
            <button
              onClick={() => {
                window.location.href = `/api/studio/youtube/authorize`
              }}
              className="w-full px-4 py-3 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Authorize with Google</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Connect {integration.displayName}</h2>
            <p className="text-xs text-slate-500 mt-1">{integration.description}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">API Key</label>
            <a
              href={integration.getApiKeyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-600 hover:text-purple-700 flex items-center space-x-1"
            >
              <span>Get API Key</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Paste your ${integration.envVar}...`}
              className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono"
              autoFocus
            />
            <button onClick={() => setShowKey(!showKey)} className="p-2 text-slate-400 hover:text-slate-600">
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Your key will be encrypted with AES-256-GCM and stored securely.
          </p>

          {/* Result */}
          {result && (
            <div className={cn(
              'p-3 rounded-lg border text-sm flex items-center space-x-2',
              result.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800',
            )}>
              {result.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{result.success ? 'Connected successfully!' : result.error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={!apiKey.trim() || saving}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{saving ? 'Testing...' : 'Test & Connect'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
