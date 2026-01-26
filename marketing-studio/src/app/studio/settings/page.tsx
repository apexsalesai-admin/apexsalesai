'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Shield, Trash2, Check, X, RefreshCw, Sparkles, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { IntegrationType, IntegrationStatus } from '@/types'
import { getAllConnectors } from '@/lib/connectors'

// Mock connected integrations
const MOCK_INTEGRATIONS = [
  {
    id: 'int_1',
    type: 'YOUTUBE' as IntegrationType,
    status: 'CONNECTED' as IntegrationStatus,
    channelName: 'Lyfye',
    channelUrl: 'https://youtube.com/@lyfye',
    connectedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    scopesGranted: ['youtube.readonly', 'youtube.upload'],
  },
  {
    id: 'int_2',
    type: 'TIKTOK' as IntegrationType,
    status: 'CONNECTED' as IntegrationStatus,
    channelName: 'Lyfye',
    channelUrl: 'https://tiktok.com/@lyfye',
    connectedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    scopesGranted: ['user.info.basic', 'video.upload'],
  },
  {
    id: 'int_3',
    type: 'LINKEDIN' as IntegrationType,
    status: 'CONNECTED' as IntegrationStatus,
    channelName: 'Lyfye Company',
    channelUrl: 'https://linkedin.com/company/lyfye',
    connectedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    scopesGranted: ['r_liteprofile', 'w_member_social'],
  },
]

export default function SettingsPage() {
  const [integrations, setIntegrations] = useState(MOCK_INTEGRATIONS)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)
  const connectors = getAllConnectors()

  const handleRevoke = async (integrationId: string) => {
    setRevoking(integrationId)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Update integration status
    setIntegrations(prev =>
      prev.map(int =>
        int.id === integrationId
          ? { ...int, status: 'REVOKED' as IntegrationStatus }
          : int
      )
    )

    setRevoking(null)
    setConfirmRevoke(null)

    // In production, this would:
    // 1. Call API to revoke tokens
    // 2. Create audit log entry
    // 3. Disable related workflows
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
          <button className="btn-secondary text-sm flex items-center space-x-2">
            <RefreshCw className="w-4 h-4" />
            <span>Refresh All</span>
          </button>
        </div>

        <div className="space-y-4">
          {integrations.map((integration) => {
            const connector = connectors.find(c => c.type === integration.type)
            const isRevoked = integration.status === 'REVOKED'

            return (
              <div
                key={integration.id}
                className={cn(
                  'border rounded-lg p-4',
                  isRevoked ? 'border-red-200 bg-red-50' : 'border-slate-200'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-bold"
                      style={{ backgroundColor: connector?.color || '#64748b' }}
                    >
                      {connector?.name.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-slate-900">{connector?.name}</h3>
                        <span className={cn(
                          'badge',
                          isRevoked ? 'badge-error' : 'badge-success'
                        )}>
                          {integration.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        {integration.channelName}
                      </p>
                      <a
                        href={integration.channelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-apex-primary hover:underline"
                      >
                        {integration.channelUrl}
                      </a>

                      {/* Scopes */}
                      <div className="mt-2">
                        <p className="text-xs text-slate-500 mb-1">Granted Scopes:</p>
                        <div className="flex flex-wrap gap-1">
                          {integration.scopesGranted.map((scope) => (
                            <span
                              key={scope}
                              className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs"
                            >
                              {scope}
                            </span>
                          ))}
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 mt-2">
                        Connected {formatDate(integration.connectedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    {isRevoked ? (
                      <span className="text-sm text-red-600">Access Revoked</span>
                    ) : confirmRevoke === integration.id ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-red-600">Confirm revoke?</span>
                        <button
                          onClick={() => handleRevoke(integration.id)}
                          disabled={revoking === integration.id}
                          className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          {revoking === integration.id ? (
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
                        onClick={() => setConfirmRevoke(integration.id)}
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

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
