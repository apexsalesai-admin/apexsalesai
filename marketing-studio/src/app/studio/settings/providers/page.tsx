'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plug,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  TestTube,
  Eye,
  EyeOff,
  ExternalLink,
  X,
  Zap,
  Film,
  UserCircle,
  FileText,
  Globe,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProviderData {
  provider: string
  displayName: string
  tier: string
  description: string
  status: 'connected' | 'platform' | 'disconnected'
  keyLastFour: string | null
  keySource: string | null
  lastTestedAt: string | null
  lastTestResult: string | null
  monthlySpend: number
  capabilities: string[]
  costModel: string
  estimatedCostPer10s: number
  requiresApiKey: boolean
}

const TIER_COLORS: Record<string, string> = {
  cinematic: 'bg-purple-100 text-purple-700',
  avatar: 'bg-blue-100 text-blue-700',
  free: 'bg-slate-100 text-slate-600',
}

const TIER_ICONS: Record<string, React.ReactNode> = {
  cinematic: <Film className="w-5 h-5" />,
  avatar: <UserCircle className="w-5 h-5" />,
  free: <FileText className="w-5 h-5" />,
}

const PROVIDER_COLORS: Record<string, string> = {
  runway: 'from-purple-500 to-indigo-600',
  sora: 'from-emerald-500 to-teal-600',
  heygen: 'from-blue-500 to-cyan-600',
  template: 'from-slate-400 to-slate-500',
}

const PROVIDER_HELP_URLS: Record<string, string> = {
  runway: 'https://app.runwayml.com/settings/api-keys',
  sora: 'https://platform.openai.com/api-keys',
  heygen: 'https://app.heygen.com/settings/api',
}

export default function ProvidersSettingsPage() {
  const [providers, setProviders] = useState<ProviderData[]>([])
  const [loading, setLoading] = useState(true)
  const [connectModal, setConnectModal] = useState<string | null>(null)
  const [connectKey, setConnectKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch('/api/studio/integrations')
      const json = await res.json()
      if (json.success) setProviders(json.data)
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchProviders() }, [fetchProviders])

  const handleConnect = async (provider: string) => {
    if (!connectKey.trim()) return
    setConnecting(true)
    setMessage(null)

    try {
      // First save the key
      const res = await fetch('/api/studio/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: connectKey.trim() }),
      })
      const json = await res.json()

      if (!json.success) {
        setMessage({ type: 'error', text: json.error || 'Failed to save key' })
        setConnecting(false)
        return
      }

      // Then test it
      const testRes = await fetch(`/api/studio/integrations/${provider}/test`, { method: 'POST' })
      const testJson = await testRes.json()

      if (testJson.success) {
        setMessage({ type: 'success', text: `${provider} connected and verified!` })
        setConnectModal(null)
        setConnectKey('')
        fetchProviders()
      } else {
        setMessage({ type: 'error', text: testJson.testMessage || 'Key verification failed' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection failed' })
    } finally {
      setConnecting(false)
    }
  }

  const handleTest = async (provider: string) => {
    setTesting(provider)
    setMessage(null)

    try {
      const res = await fetch(`/api/studio/integrations/${provider}/test`, { method: 'POST' })
      const json = await res.json()
      setMessage({
        type: json.success ? 'success' : 'error',
        text: json.testMessage || (json.success ? 'Connection verified' : 'Test failed'),
      })
      fetchProviders()
    } catch {
      setMessage({ type: 'error', text: 'Test failed' })
    } finally {
      setTesting(null)
    }
  }

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Disconnect ${provider}? You can reconnect anytime.`)) return
    setDisconnecting(provider)

    try {
      await fetch(`/api/studio/integrations/${provider}`, { method: 'DELETE' })
      setMessage({ type: 'success', text: `${provider} disconnected` })
      fetchProviders()
    } catch {
      setMessage({ type: 'error', text: 'Disconnect failed' })
    } finally {
      setDisconnecting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Plug className="w-6 h-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-slate-900">Video Providers</h1>
        </div>
        <p className="text-slate-500">
          Connect your accounts to generate premium video content. Your API keys are encrypted with AES-256-GCM.
        </p>
      </div>

      {/* Status message */}
      {message && (
        <div className={cn(
          'mb-6 px-4 py-3 rounded-lg flex items-center justify-between',
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        )}>
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="p-1 hover:bg-black/5 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Provider grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {providers.map(p => (
          <div
            key={p.provider}
            className="rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition-shadow"
          >
            {/* Card header */}
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center text-white bg-gradient-to-br',
                    PROVIDER_COLORS[p.provider] || 'from-slate-400 to-slate-500'
                  )}>
                    {TIER_ICONS[p.tier] || <Globe className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{p.displayName}</h3>
                    <span className={cn(
                      'text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider',
                      TIER_COLORS[p.tier] || 'bg-slate-100 text-slate-600'
                    )}>
                      {p.tier}
                    </span>
                  </div>
                </div>
                {/* Status indicator */}
                <div className={cn(
                  'flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                  p.status === 'connected' ? 'bg-emerald-50 text-emerald-700' :
                  p.status === 'platform' ? 'bg-blue-50 text-blue-700' :
                  'bg-slate-50 text-slate-500'
                )}>
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    p.status === 'connected' ? 'bg-emerald-500' :
                    p.status === 'platform' ? 'bg-blue-500' :
                    'bg-slate-300'
                  )} />
                  <span>
                    {p.status === 'connected' ? 'Connected' :
                     p.status === 'platform' ? 'Platform Key' :
                     'Not Connected'}
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-500 mb-4">{p.description}</p>

              {/* Key info + spend */}
              {(p.status === 'connected' || p.status === 'platform') && (
                <div className="space-y-2 mb-4">
                  {p.keyLastFour && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Key</span>
                      <span className="font-mono text-slate-700">{p.keyLastFour}</span>
                    </div>
                  )}
                  {p.keySource === 'platform' && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Source</span>
                      <span className="text-blue-600 text-xs font-medium">Platform (.env)</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">This Month</span>
                    <span className="font-medium text-slate-700">${p.monthlySpend.toFixed(2)}</span>
                  </div>
                  {p.costModel !== 'free' && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Est. per 10s</span>
                      <span className="text-slate-700">${p.estimatedCostPer10s.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Card actions */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center space-x-2">
              {p.requiresApiKey && p.status !== 'disconnected' && (
                <>
                  <button
                    onClick={() => handleTest(p.provider)}
                    disabled={testing === p.provider}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {testing === p.provider ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <TestTube className="w-3.5 h-3.5" />
                    )}
                    <span>Test</span>
                  </button>
                  <button
                    onClick={() => handleDisconnect(p.provider)}
                    disabled={disconnecting === p.provider}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {disconnecting === p.provider ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Disconnect</span>
                  </button>
                </>
              )}
              {p.requiresApiKey && p.status === 'disconnected' && (
                <button
                  onClick={() => { setConnectModal(p.provider); setConnectKey(''); setMessage(null); setShowKey(false) }}
                  className="flex items-center space-x-1.5 px-4 py-2 text-xs font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-md transition-shadow"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Connect Provider</span>
                </button>
              )}
              {!p.requiresApiKey && (
                <span className="text-xs text-slate-400 italic">No API key needed</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Connect Modal */}
      {connectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">
                  Connect {providers.find(p => p.provider === connectModal)?.displayName || connectModal}
                </h2>
                <button onClick={() => setConnectModal(null)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">API Key</label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={connectKey}
                      onChange={e => setConnectKey(e.target.value)}
                      placeholder="Paste your API key here..."
                      className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      autoFocus
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {PROVIDER_HELP_URLS[connectModal] && (
                  <a
                    href={PROVIDER_HELP_URLS[connectModal]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1.5 text-xs text-purple-600 hover:text-purple-700"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>How to get your API key</span>
                  </a>
                )}

                {message && (
                  <div className={cn(
                    'px-3 py-2 rounded-lg text-xs',
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  )}>
                    {message.text}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-2xl flex justify-end space-x-3">
              <button
                onClick={() => setConnectModal(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleConnect(connectModal)}
                disabled={!connectKey.trim() || connecting}
                className="flex items-center space-x-2 px-5 py-2 text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-md disabled:opacity-50 transition-all"
              >
                {connecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span>{connecting ? 'Verifying...' : 'Test & Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
