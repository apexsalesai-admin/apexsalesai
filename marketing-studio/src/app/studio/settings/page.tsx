'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AlertTriangle, Shield, Trash2, Check, X, RefreshCw, Sparkles, ChevronRight, MessageSquare, Key, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAllConnectors } from '@/lib/connectors'

interface ConnectedChannel {
  id: string
  platform: string
  displayName: string
  accountName: string | null
  isActive: boolean
  connectedAt: string
  tokenHealth: 'healthy' | 'expiring_soon' | 'expired' | 'unknown'
  lastError: string | null
}

export default function SettingsPage() {
  const [channels, setChannels] = useState<ConnectedChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)
  const connectors = getAllConnectors()

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
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchChannels() }, [fetchChannels])

  const handleRevoke = async (channelId: string) => {
    setRevoking(channelId)
    try {
      await fetch('/api/studio/channels', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId }),
      })
      setChannels(prev => prev.filter(c => c.id !== channelId))
    } catch (e) {
      console.error('Failed to revoke channel:', e)
    } finally {
      setRevoking(null)
      setConfirmRevoke(null)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">
          Manage integrations, permissions, and security settings
        </p>
      </div>

      {/* AI Providers Section */}
      <Link
        href="/studio/settings/ai"
        className="block card hover:border-purple-300 hover:bg-purple-50/50 transition-colors group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 group-hover:text-purple-700">
                AI Providers
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Configure Anthropic Claude, OpenAI GPT-4, and other AI providers for content generation
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-600" />
        </div>
      </Link>

      {/* Brand Voice Section */}
      <Link
        href="/studio/settings/brand"
        className="block card hover:border-pink-300 hover:bg-pink-50/50 transition-colors group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-pink-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 group-hover:text-pink-700">
                Brand Voice
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Define your brand&apos;s tone, target audience, and content preferences for AI generation
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-pink-600" />
        </div>
      </Link>

      {/* Auth Diagnostics (Admin/Demo only) */}
      <Link
        href="/studio/settings/auth"
        className="block card hover:border-slate-300 hover:bg-slate-50/50 transition-colors group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Key className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 group-hover:text-slate-700">
                Auth Diagnostics
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Debug authentication configuration, OAuth callbacks, and session status
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
        </div>
      </Link>

      {/* Kill Switch Section */}
      <div className="card border-red-200 bg-red-50">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-red-900">Kill Switch</h2>
            <p className="text-sm text-red-700 mt-1">
              Instantly revoke access for any connected integration. This action is irreversible
              and will immediately disconnect the channel, preventing any further publishing.
              All actions are logged in the audit trail.
            </p>
          </div>
        </div>
      </div>

      {/* Connected Integrations */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Connected Integrations</h2>
          <button
            onClick={() => { setLoading(true); fetchChannels() }}
            className="btn-secondary text-sm flex items-center space-x-2"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            <span>Refresh All</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : channels.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Shield className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No publishing channels connected</p>
            <Link href="/studio/integrations" className="text-xs text-apex-primary hover:underline mt-1 block">
              Connect channels in Integrations
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {channels.map((channel) => {
              const platformType = channel.platform.toUpperCase()
              const connector = connectors.find(c => c.type === platformType)
              const healthColors = {
                healthy: 'badge-success',
                expiring_soon: 'badge-warning',
                expired: 'badge-error',
                unknown: 'bg-slate-100 text-slate-600',
              }

              return (
                <div
                  key={channel.id}
                  className="border rounded-lg p-4 border-slate-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-bold"
                        style={{ backgroundColor: connector?.color || '#64748b' }}
                      >
                        {connector?.name.charAt(0) || channel.platform.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-slate-900">{channel.displayName}</h3>
                          <span className={cn('badge', healthColors[channel.tokenHealth])}>
                            {channel.tokenHealth === 'healthy' ? 'Connected' : channel.tokenHealth.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          {channel.platform.charAt(0).toUpperCase() + channel.platform.slice(1)}
                          {channel.accountName && ` — ${channel.accountName}`}
                        </p>
                        {channel.lastError && (
                          <p className="text-xs text-red-500 mt-1">{channel.lastError}</p>
                        )}
                        <p className="text-xs text-slate-400 mt-2">
                          Connected {new Date(channel.connectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div>
                      {confirmRevoke === channel.id ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-red-600">Confirm revoke?</span>
                          <button
                            onClick={() => handleRevoke(channel.id)}
                            disabled={revoking === channel.id}
                            className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            {revoking === channel.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setConfirmRevoke(null)}
                            className="p-1.5 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmRevoke(channel.id)}
                          className="btn-danger flex items-center space-x-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Revoke Access</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Security Settings */}
      <div className="card">
        <h2 className="font-semibold text-slate-900 mb-4">Security Settings</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-slate-200">
            <div>
              <p className="font-medium text-slate-900">Require approval for all publishes</p>
              <p className="text-sm text-slate-500">
                Content must be approved before publishing to any channel
              </p>
            </div>
            <ToggleSwitch defaultChecked />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-slate-200">
            <div>
              <p className="font-medium text-slate-900">Audit log retention</p>
              <p className="text-sm text-slate-500">
                Keep audit logs for compliance purposes
              </p>
            </div>
            <select className="input w-40">
              <option>90 days</option>
              <option>1 year</option>
              <option>3 years</option>
              <option>Forever</option>
            </select>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-slate-900">Session timeout</p>
              <p className="text-sm text-slate-500">
                Automatically log out after inactivity
              </p>
            </div>
            <select className="input w-40">
              <option>30 minutes</option>
              <option>1 hour</option>
              <option>4 hours</option>
              <option>8 hours</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

function ToggleSwitch({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked)

  return (
    <button
      onClick={() => setChecked(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        checked ? 'bg-apex-primary' : 'bg-slate-200'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  )
}
