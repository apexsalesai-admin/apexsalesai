'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Linkedin,
  Upload,
  Loader2,
  Trash2,
  RefreshCw,
  Check,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface ChannelConnectorProps {
  onChannelChange?: (channels: PublishingChannel[]) => void
  compact?: boolean
}

const PLATFORM_CONFIG: Record<string, {
  name: string
  icon: typeof Linkedin
  color: string
  connectUrl: string
}> = {
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: '#0A66C2',
    connectUrl: '/api/studio/channels/connect/linkedin',
  },
}

export function ChannelConnector({ onChannelChange, compact }: ChannelConnectorProps) {
  const [channels, setChannels] = useState<PublishingChannel[]>([])
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const fetchChannels = useCallback(async () => {
    try {
      const res = await fetch('/api/studio/channels')
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setChannels(data.channels || [])
          onChannelChange?.(data.channels || [])
        }
      }
    } catch (e) {
      console.error('Failed to fetch channels:', e)
    } finally {
      setLoading(false)
    }
  }, [onChannelChange])

  useEffect(() => { fetchChannels() }, [fetchChannels])

  const disconnect = async (channelId: string) => {
    setDisconnecting(channelId)
    try {
      await fetch('/api/studio/channels', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId }),
      })
      const updated = channels.filter(c => c.id !== channelId)
      setChannels(updated)
      onChannelChange?.(updated)
    } finally {
      setDisconnecting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {channels.map(channel => {
        const config = PLATFORM_CONFIG[channel.platform]
        const Icon = config?.icon || Upload
        const healthDot = {
          healthy: 'bg-emerald-500',
          expiring_soon: 'bg-amber-500',
          expired: 'bg-red-500',
          unknown: 'bg-slate-400',
        }

        return (
          <div
            key={channel.id}
            className={cn(
              'flex items-center justify-between rounded-xl border',
              compact ? 'p-2 bg-white border-slate-200' : 'p-3 bg-white border-slate-200'
            )}
          >
            <div className="flex items-center space-x-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: config?.color || '#6366F1' }}
              >
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className={cn('font-medium text-slate-900', compact ? 'text-xs' : 'text-sm')}>
                    {channel.displayName}
                  </span>
                  <span className={cn('w-1.5 h-1.5 rounded-full', healthDot[channel.tokenHealth])} />
                </div>
                {!compact && channel.accountName && (
                  <p className="text-xs text-slate-500">{channel.accountName}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {channel.tokenHealth === 'expired' && (
                <a
                  href={config?.connectUrl || '#'}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200"
                >
                  Reconnect
                </a>
              )}
              <button
                onClick={() => disconnect(channel.id)}
                disabled={disconnecting === channel.id}
                className="p-1 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                {disconnecting === channel.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        )
      })}

      {/* Connect New */}
      {Object.entries(PLATFORM_CONFIG).map(([platform, config]) => {
        const alreadyConnected = channels.some(c => c.platform === platform)
        if (alreadyConnected) return null
        const Icon = config.icon
        return (
          <a
            key={platform}
            href={config.connectUrl}
            className={cn(
              'flex items-center space-x-2 rounded-xl border border-dashed border-slate-300 hover:border-purple-400 hover:bg-purple-50 transition-colors',
              compact ? 'p-2' : 'p-3'
            )}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center opacity-60"
              style={{ backgroundColor: config.color }}
            >
              <Icon className="w-4 h-4 text-white" />
            </div>
            <span className={cn('text-slate-600', compact ? 'text-xs' : 'text-sm')}>
              Connect {config.name}
            </span>
          </a>
        )
      })}
    </div>
  )
}
