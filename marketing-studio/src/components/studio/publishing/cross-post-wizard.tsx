'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X,
  Check,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Send,
  Linkedin,
  Youtube,
  Twitter,
  Upload,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Channel {
  id: string
  platform: string
  displayName: string
  accountName: string | null
  accountAvatar: string | null
  isActive: boolean
  tokenHealth: 'healthy' | 'expiring_soon' | 'expired' | 'unknown'
}

interface Adaptation {
  platform: string
  title: string | null
  body: string
  hashtags: string[]
  callToAction: string
  charCount: number
  charLimit: number
  adaptationNotes: string
  threadParts?: string[]
}

interface CrossPostWizardProps {
  contentId: string
  content: {
    title: string
    body: string
    channels: string[]
  }
  onClose: () => void
  onPublished: () => void
}

const PLATFORM_ICONS: Record<string, typeof Linkedin> = {
  linkedin: Linkedin,
  youtube: Youtube,
  x: Twitter,
}

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: 'bg-[#0A66C2]',
  youtube: 'bg-[#FF0000]',
  x: 'bg-black',
}

const STEPS = [
  { label: 'Select Channels', step: 1 },
  { label: 'Adapt Content', step: 2 },
  { label: 'Review & Publish', step: 3 },
]

export function CrossPostWizard({ contentId, content, onClose, onPublished }: CrossPostWizardProps) {
  const [step, setStep] = useState(1)
  const [channels, setChannels] = useState<Channel[]>([])
  const [loadingChannels, setLoadingChannels] = useState(true)
  const [selectedChannelIds, setSelectedChannelIds] = useState<Set<string>>(new Set())
  const [adaptations, setAdaptations] = useState<Adaptation[]>([])
  const [isAdapting, setIsAdapting] = useState(false)
  const [adaptError, setAdaptError] = useState<string | null>(null)
  const [editedAdaptations, setEditedAdaptations] = useState<Record<string, Adaptation>>({})
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishResult, setPublishResult] = useState<{ success: boolean; message: string } | null>(null)

  // Fetch connected channels
  useEffect(() => {
    async function fetchChannels() {
      try {
        const res = await fetch('/api/studio/channels')
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            setChannels(data.channels?.filter((c: Channel) => c.isActive) || [])
          }
        }
      } catch (e) {
        console.error('Failed to fetch channels:', e)
      } finally {
        setLoadingChannels(false)
      }
    }
    fetchChannels()
  }, [])

  const toggleChannel = (channelId: string) => {
    setSelectedChannelIds(prev => {
      const next = new Set(prev)
      if (next.has(channelId)) next.delete(channelId)
      else next.add(channelId)
      return next
    })
  }

  const selectedChannels = channels.filter(c => selectedChannelIds.has(c.id))
  const selectedPlatforms = Array.from(new Set(selectedChannels.map(c => c.platform)))

  // Step 2: Adapt content for selected platforms
  const handleAdapt = useCallback(async () => {
    if (selectedPlatforms.length === 0) return
    setIsAdapting(true)
    setAdaptError(null)

    try {
      const res = await fetch('/api/studio/publish/adapt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          platforms: selectedPlatforms,
        }),
      })
      const data = await res.json()
      if (data.success && data.adaptations) {
        setAdaptations(data.adaptations)
        setEditedAdaptations({})
        if (data.warnings?.length) {
          setAdaptError(`Partial: ${data.warnings.map((w: { platform: string; error: string }) => `${w.platform}: ${w.error}`).join('; ')}`)
        }
      } else {
        setAdaptError(data.error || `Adaptation failed (${res.status})`)
      }
    } catch (e) {
      setAdaptError('Network error during adaptation')
    } finally {
      setIsAdapting(false)
    }
  }, [contentId, selectedPlatforms])

  const goToStep2 = () => {
    setStep(2)
    handleAdapt()
  }

  const updateAdaptation = (platform: string, field: keyof Adaptation, value: string) => {
    setEditedAdaptations(prev => {
      const existing = prev[platform] || adaptations.find(a => a.platform === platform)!
      return {
        ...prev,
        [platform]: { ...existing, [field]: value, charCount: field === 'body' ? value.length : existing.charCount },
      }
    })
  }

  const getAdaptation = (platform: string): Adaptation | undefined => {
    return editedAdaptations[platform] || adaptations.find(a => a.platform === platform)
  }

  // Step 3: Publish to all selected channels
  const handlePublish = async () => {
    setIsPublishing(true)
    setPublishResult(null)

    try {
      const res = await fetch('/api/studio/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          channels: Array.from(selectedChannelIds),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setPublishResult({ success: true, message: `Publishing to ${selectedChannels.length} channel${selectedChannels.length > 1 ? 's' : ''}...` })
        setTimeout(() => onPublished(), 2000)
      } else {
        setPublishResult({ success: false, message: data.error || 'Publishing failed' })
      }
    } catch (e) {
      setPublishResult({ success: false, message: 'Network error during publishing' })
    } finally {
      setIsPublishing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Cross-Post Wizard</h2>
            <p className="text-sm text-slate-500 mt-0.5">Publish to multiple platforms at once</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center space-x-4 px-6 py-4 border-b border-slate-100 shrink-0">
          {STEPS.map((s, i) => (
            <div key={s.step} className="flex items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                step > s.step ? 'bg-emerald-500 text-white' :
                step === s.step ? 'bg-purple-600 text-white' :
                'bg-slate-100 text-slate-400'
              )}>
                {step > s.step ? <Check className="w-4 h-4" /> : s.step}
              </div>
              <span className={cn(
                'ml-2 text-sm font-medium',
                step >= s.step ? 'text-slate-900' : 'text-slate-400'
              )}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-4 h-4 text-slate-300 mx-3" />
              )}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Select Channels */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Select which channels to publish to:</p>

              {loadingChannels ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              ) : channels.length === 0 ? (
                <div className="text-center py-8">
                  <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No connected channels.</p>
                  <a
                    href="/studio/integrations"
                    className="text-purple-600 text-sm hover:underline mt-2 inline-block"
                  >
                    Connect a channel first
                  </a>
                </div>
              ) : (
                <div className="space-y-2">
                  {channels.map(channel => {
                    const PlatformIcon = PLATFORM_ICONS[channel.platform] || Upload
                    const isSelected = selectedChannelIds.has(channel.id)
                    const isHealthy = channel.tokenHealth === 'healthy' || channel.tokenHealth === 'expiring_soon'

                    return (
                      <button
                        key={channel.id}
                        onClick={() => isHealthy && toggleChannel(channel.id)}
                        disabled={!isHealthy}
                        className={cn(
                          'w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all text-left',
                          isSelected ? 'border-purple-500 bg-purple-50' :
                          isHealthy ? 'border-slate-200 hover:border-slate-300' :
                          'border-slate-200 opacity-50 cursor-not-allowed'
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', PLATFORM_COLORS[channel.platform] || 'bg-slate-500')}>
                            <PlatformIcon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <span className="font-medium text-slate-900">{channel.displayName}</span>
                            <p className="text-xs text-slate-500">
                              {channel.platform.charAt(0).toUpperCase() + channel.platform.slice(1)}
                              {!isHealthy && ' — Token expired'}
                            </p>
                          </div>
                        </div>
                        <div className={cn(
                          'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors',
                          isSelected ? 'border-purple-500 bg-purple-500' : 'border-slate-300'
                        )}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Adapt Content */}
          {step === 2 && (
            <div className="space-y-4">
              {isAdapting ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-3" />
                  <p className="text-sm text-slate-600">Adapting content for {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? 's' : ''}...</p>
                </div>
              ) : adaptError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-sm text-red-700">{adaptError}</span>
                  </div>
                  <button
                    onClick={handleAdapt}
                    className="mt-3 text-sm text-red-600 hover:text-red-700 underline"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span>AI-adapted for each platform. Edit as needed:</span>
                  </div>

                  {selectedPlatforms.map(platform => {
                    const adaptation = getAdaptation(platform)
                    if (!adaptation) return null
                    const PlatformIcon = PLATFORM_ICONS[platform] || Upload
                    const isOverLimit = adaptation.charLimit > 0 && adaptation.charCount > adaptation.charLimit

                    return (
                      <div key={platform} className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={cn('w-6 h-6 rounded flex items-center justify-center', PLATFORM_COLORS[platform] || 'bg-slate-500')}>
                              <PlatformIcon className="w-3.5 h-3.5 text-white" />
                            </div>
                            <span className="font-medium text-slate-900 text-sm">
                              {platform.charAt(0).toUpperCase() + platform.slice(1)}
                            </span>
                          </div>
                          <span className={cn(
                            'text-xs font-mono',
                            isOverLimit ? 'text-red-500' : 'text-slate-400'
                          )}>
                            {adaptation.charCount}/{adaptation.charLimit || '∞'}
                          </span>
                        </div>

                        {adaptation.title && (
                          <input
                            type="text"
                            value={adaptation.title}
                            onChange={e => updateAdaptation(platform, 'title', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                          />
                        )}

                        <textarea
                          value={adaptation.body}
                          onChange={e => updateAdaptation(platform, 'body', e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-y focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                        />

                        {adaptation.adaptationNotes && (
                          <p className="text-xs text-slate-400 italic">{adaptation.adaptationNotes}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Review & Publish */}
          {step === 3 && (
            <div className="space-y-4">
              {publishResult ? (
                <div className={cn(
                  'p-4 rounded-xl border',
                  publishResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                )}>
                  <div className="flex items-center space-x-2">
                    {publishResult.success ? (
                      <Check className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={cn(
                      'text-sm font-medium',
                      publishResult.success ? 'text-emerald-800' : 'text-red-800'
                    )}>
                      {publishResult.message}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-600">Review and confirm publishing:</p>

                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    <h4 className="font-medium text-slate-900 text-sm">Content</h4>
                    <p className="text-sm font-medium text-slate-700">{content.title}</p>
                    <p className="text-sm text-slate-500 line-clamp-3">{content.body}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-slate-900 text-sm">Publishing to:</h4>
                    {selectedChannels.map(channel => {
                      const PlatformIcon = PLATFORM_ICONS[channel.platform] || Upload
                      const adaptation = getAdaptation(channel.platform)

                      return (
                        <div key={channel.id} className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', PLATFORM_COLORS[channel.platform] || 'bg-slate-500')}>
                              <PlatformIcon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <span className="text-sm font-medium text-slate-900">{channel.displayName}</span>
                              {adaptation && (
                                <p className="text-xs text-slate-400">
                                  {adaptation.charCount} chars
                                  {adaptation.threadParts && adaptation.threadParts.length > 1 && ` (${adaptation.threadParts.length}-part thread)`}
                                </p>
                              )}
                            </div>
                          </div>
                          <Check className="w-4 h-4 text-emerald-500" />
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 shrink-0">
          <button
            onClick={step === 1 ? onClose : () => setStep(step - 1)}
            disabled={isPublishing}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            {step === 1 ? (
              <span>Cancel</span>
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </>
            )}
          </button>

          {step === 1 && (
            <button
              onClick={goToStep2}
              disabled={selectedChannelIds.size === 0}
              className="flex items-center space-x-2 px-6 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <span>Adapt Content</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 2 && (
            <button
              onClick={() => setStep(3)}
              disabled={isAdapting || (!!adaptError && adaptations.length === 0)}
              className="flex items-center space-x-2 px-6 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <span>Review</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 3 && !publishResult && (
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="flex items-center space-x-2 px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg rounded-lg transition-all disabled:opacity-50"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Publish All</span>
                </>
              )}
            </button>
          )}

          {step === 3 && publishResult?.success && (
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
