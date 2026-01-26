'use client'

import { useState } from 'react'
import { useOnboarding } from '@/hooks/use-onboarding'
import { getAllConnectors, type ConnectorConfig } from '@/lib/connectors'
import { IntegrationType } from '@/types'
import { Check, ExternalLink, Info, Loader2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Step1Channels() {
  const { steps, setChannelsData, nextStep } = useOnboarding()
  const [connecting, setConnecting] = useState<IntegrationType | null>(null)
  const [connected, setConnected] = useState<IntegrationType[]>(
    steps.channels?.connectedChannels ?? []
  )

  const connectors = getAllConnectors()

  const handleConnect = async (connector: ConnectorConfig) => {
    setConnecting(connector.type)

    // Simulate OAuth flow (mock)
    await new Promise(resolve => setTimeout(resolve, 1500))

    setConnected(prev => [...prev, connector.type])
    setConnecting(null)

    // Update store
    setChannelsData({
      connectedChannels: [...connected, connector.type],
      pendingChannels: [],
    })
  }

  const handleDisconnect = (type: IntegrationType) => {
    const updated = connected.filter(c => c !== type)
    setConnected(updated)
    setChannelsData({
      connectedChannels: updated,
      pendingChannels: [],
    })
  }

  const handleContinue = () => {
    if (connected.length > 0) {
      setChannelsData({
        connectedChannels: connected,
        pendingChannels: [],
      })
      nextStep()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Connect Your Channels</h2>
        <p className="text-slate-600 mt-1">
          Link your social accounts to enable automated content distribution.
          We use least-privilege OAuth scopes for security.
        </p>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">About permissions</p>
          <p className="mt-1">
            We only request the minimum permissions needed to read and publish content.
            You can revoke access at any time from the Settings page.
          </p>
        </div>
      </div>

      {/* Channel grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {connectors.map((connector) => {
          const isConnected = connected.includes(connector.type)
          const isConnecting = connecting === connector.type

          return (
            <div
              key={connector.type}
              className={cn(
                'border rounded-lg p-4 transition-all',
                isConnected
                  ? 'border-apex-success bg-green-50'
                  : 'border-slate-200 hover:border-slate-300'
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg font-bold"
                    style={{ backgroundColor: connector.color }}
                  >
                    {connector.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900">{connector.name}</h3>
                    <p className="text-sm text-slate-500">{connector.description}</p>
                  </div>
                </div>
                {isConnected && (
                  <Check className="w-5 h-5 text-apex-success" />
                )}
              </div>

              {/* Scopes */}
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-slate-500 uppercase">
                  Required Permissions
                </p>
                <ul className="text-sm text-slate-600 space-y-1">
                  {connector.requiredScopes.slice(0, 3).map((scope) => (
                    <li key={scope} className="flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                      <span>{connector.scopeDescriptions[scope]}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center space-x-2">
                {isConnected ? (
                  <button
                    onClick={() => handleDisconnect(connector.type)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(connector)}
                    disabled={isConnecting}
                    className="btn-primary text-sm flex items-center space-x-2"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        <span>Connect</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Mock indicator */}
              {connector.mockEnabled && (
                <p className="mt-2 text-xs text-amber-600">
                  Mock connector (OAuth not yet configured)
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Continue button */}
      <div className="flex justify-between items-center pt-4 border-t">
        <p className="text-sm text-slate-500">
          {connected.length} channel{connected.length !== 1 ? 's' : ''} connected
        </p>
        <button
          onClick={handleContinue}
          disabled={connected.length === 0}
          className="btn-primary flex items-center space-x-2"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
