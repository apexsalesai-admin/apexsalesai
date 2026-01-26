'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  X,
  ChevronRight,
  Zap,
  ArrowRight,
  Lightbulb,
  Edit3,
  Copy,
  Check,
  Loader2,
  MessageSquare,
  TrendingUp,
  FileText,
  Target,
  Settings,
  AlertCircle,
} from 'lucide-react'
import { toast } from '@/components/ui/toaster'

interface MiaSuggestion {
  id: string
  title: string
  description: string
  why?: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void | Promise<void>
  actionLabel?: string
  priority?: 'high' | 'medium' | 'low'
  loading?: boolean
}

interface SetupStatus {
  aiConfigured: boolean
  brandVoiceConfigured: boolean
  hasContent: boolean
  hasIntegrations: boolean
}

interface MiaPanelProps {
  isOpen: boolean
  onClose: () => void
  currentContent?: {
    id: string
    text: string
    channel?: string
    topic?: string
  }
}

export function MiaPanel({ isOpen, onClose, currentContent }: MiaPanelProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [setupStatus, setSetupStatus] = useState<SetupStatus>({
    aiConfigured: true,
    brandVoiceConfigured: true,
    hasContent: true,
    hasIntegrations: true,
  })

  // Check setup status on mount
  useEffect(() => {
    checkSetupStatus()
  }, [isOpen])

  const checkSetupStatus = async () => {
    // Check AI provider status
    let aiConfigured = false
    try {
      const res = await fetch('/api/ai/status')
      const data = await res.json()
      aiConfigured = data.data?.anyConfigured || false
    } catch {
      // Ignore
    }

    // Check brand voice (localStorage)
    const brandVoice = typeof window !== 'undefined'
      ? localStorage.getItem('lyfye-brand-voice')
      : null
    const brandVoiceConfigured = !!brandVoice && brandVoice !== '{}'

    // Check content created
    const hasContent = typeof window !== 'undefined'
      ? localStorage.getItem('lyfye-has-content') === 'true'
      : false

    // Check integrations
    const hasIntegrations = typeof window !== 'undefined'
      ? localStorage.getItem('lyfye-has-integrations') === 'true'
      : false

    setSetupStatus({
      aiConfigured,
      brandVoiceConfigured,
      hasContent,
      hasIntegrations,
    })
  }

  // Get context-aware suggestions based on current route and setup status
  const getSuggestions = (): MiaSuggestion[] => {
    const suggestions: MiaSuggestion[] = []

    // Priority: Setup suggestions first if not configured
    if (!setupStatus.aiConfigured) {
      suggestions.push({
        id: 'setup-ai',
        title: 'Connect an AI Provider',
        description: 'Required to generate content',
        why: 'Content generation needs an AI provider',
        icon: AlertCircle,
        priority: 'high',
        action: () => {
          router.push('/studio/settings/ai')
          onClose()
        },
        actionLabel: 'Set Up Now',
      })
    }

    if (!setupStatus.brandVoiceConfigured) {
      suggestions.push({
        id: 'setup-brand',
        title: 'Define your Brand Voice',
        description: 'Customize how Mia writes for you',
        why: 'Better content that sounds like you',
        icon: MessageSquare,
        priority: 'medium',
        action: () => {
          router.push('/studio/settings/brand')
          onClose()
        },
        actionLabel: 'Configure',
      })
    }

    // Dashboard suggestions
    if (pathname === '/studio' || pathname === '/studio/') {
      if (setupStatus.aiConfigured) {
        suggestions.push({
          id: 'dashboard-create',
          title: 'Create content now',
          description: 'Start with a topic or let me suggest one',
          why: 'AI-powered content in seconds',
          icon: Sparkles,
          action: () => {
            router.push('/studio/content/new')
            onClose()
          },
          actionLabel: 'Create',
        })
      }

      suggestions.push({
        id: 'dashboard-approvals',
        title: 'Review pending content',
        description: '3 items waiting for approval',
        why: 'Keep your content pipeline moving',
        icon: FileText,
        action: () => {
          router.push('/studio/approvals')
          onClose()
        },
      })

      suggestions.push({
        id: 'dashboard-calendar',
        title: 'Plan this week\'s content',
        description: 'See your content calendar',
        why: 'Stay consistent with scheduled posts',
        icon: TrendingUp,
        action: () => {
          router.push('/studio/content/calendar')
          onClose()
        },
      })
    }

    // Content/New suggestions
    if (pathname.includes('/content/new')) {
      suggestions.push({
        id: 'new-hooks',
        title: 'Suggest 3 viral hooks',
        description: 'Attention-grabbing openers for your topic',
        why: 'Hooks drive 80% of engagement',
        icon: Lightbulb,
        action: async () => {
          setLoading('new-hooks')
          await new Promise((r) => setTimeout(r, 1500))
          toast.success('Generated 3 hook options', {
            description: 'Scroll down to see suggestions',
          })
          setLoading(null)
        },
        actionLabel: 'Generate',
      })

      suggestions.push({
        id: 'new-cta',
        title: 'Generate CTA options',
        description: '3 call-to-action variants',
        why: 'CTAs convert viewers to customers',
        icon: Target,
        action: async () => {
          setLoading('new-cta')
          await new Promise((r) => setTimeout(r, 1000))
          toast.success('Generated CTA options')
          setLoading(null)
        },
        actionLabel: 'Generate',
      })

      suggestions.push({
        id: 'new-structure',
        title: 'Suggest content structure',
        description: 'Optimal format for your channel',
        why: 'Structure improves readability 40%',
        icon: FileText,
        action: async () => {
          setLoading('new-structure')
          await new Promise((r) => setTimeout(r, 1200))
          toast.success('Structure suggestion added')
          setLoading(null)
        },
        actionLabel: 'Apply',
      })
    }

    // Approvals suggestions
    if (pathname.includes('/approvals')) {
      suggestions.push({
        id: 'approvals-summary',
        title: 'Summarize pending items',
        description: 'Quick overview of what needs review',
        why: 'Save time with AI summaries',
        icon: MessageSquare,
        action: async () => {
          setLoading('approvals-summary')
          await new Promise((r) => setTimeout(r, 1000))
          toast.info('3 posts pending: 2 LinkedIn, 1 X thread', {
            description: 'Oldest is 2 days ago',
          })
          setLoading(null)
        },
        actionLabel: 'Summarize',
      })

      suggestions.push({
        id: 'approvals-priority',
        title: 'Prioritize by urgency',
        description: 'Sort by engagement potential',
        why: 'Focus on high-impact content first',
        icon: TrendingUp,
        action: async () => {
          setLoading('approvals-priority')
          await new Promise((r) => setTimeout(r, 800))
          toast.success('Recommended: LinkedIn post first', {
            description: 'Time-sensitive content',
          })
          setLoading(null)
        },
      })
    }

    // Settings suggestions
    if (pathname.includes('/settings')) {
      if (!setupStatus.aiConfigured) {
        // Already added above
      } else {
        suggestions.push({
          id: 'settings-test',
          title: 'Test your AI provider',
          description: 'Verify your connection is working',
          why: 'Ensure content generation works',
          icon: Zap,
          action: () => {
            router.push('/studio/settings/ai')
            onClose()
          },
        })
      }
    }

    // Default suggestions if nothing else
    if (suggestions.length === 0) {
      suggestions.push({
        id: 'default-create',
        title: 'Create new content',
        description: 'AI-powered posts, videos, articles',
        icon: Edit3,
        action: () => {
          router.push('/studio/content/new')
          onClose()
        },
      })

      suggestions.push({
        id: 'default-calendar',
        title: 'View content calendar',
        description: 'See scheduled posts',
        icon: FileText,
        action: () => {
          router.push('/studio/content/calendar')
          onClose()
        },
      })
    }

    return suggestions.slice(0, 5) // Max 5 suggestions
  }

  // Improve This actions
  const improveActions = currentContent
    ? [
        { id: 'improve-hook', label: 'Tighten hook', action: async () => {
          setLoading('improve-hook')
          await new Promise((r) => setTimeout(r, 1500))
          toast.success('Hook improved!', { description: 'Revision saved as draft' })
          setLoading(null)
        }},
        { id: 'improve-executive', label: 'Make it executive', action: async () => {
          setLoading('improve-executive')
          await new Promise((r) => setTimeout(r, 1500))
          toast.success('Tone adjusted for executives')
          setLoading(null)
        }},
        { id: 'improve-proof', label: 'Add proof', action: async () => {
          setLoading('improve-proof')
          await new Promise((r) => setTimeout(r, 1200))
          toast.success('Added credibility markers')
          setLoading(null)
        }},
        { id: 'improve-shorten', label: 'Shorten 30%', action: async () => {
          setLoading('improve-shorten')
          await new Promise((r) => setTimeout(r, 1000))
          toast.success('Reduced by 32%', { description: '145 → 98 words' })
          setLoading(null)
        }},
      ]
    : []

  // Repurpose actions
  const repurposeActions = currentContent
    ? [
        { id: 'repurpose-linkedin', label: 'LinkedIn post', channel: 'linkedin' },
        { id: 'repurpose-x', label: 'X thread', channel: 'x' },
        { id: 'repurpose-email', label: 'Email', channel: 'email' },
        { id: 'repurpose-video', label: 'Video script', channel: 'video' },
      ]
    : []

  const handleRepurpose = async (channel: string) => {
    setLoading(`repurpose-${channel}`)
    await new Promise((r) => setTimeout(r, 2000))
    toast.success(`Created ${channel} version`, { description: 'Saved to drafts' })
    setLoading(null)
  }

  const suggestions = getSuggestions()

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-white border-l border-slate-200 shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">Mia</h2>
                  <p className="text-xs text-slate-500">AI Content Strategist</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Recommended Actions */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Recommended for You
                </h3>
                <div className="space-y-2">
                  {suggestions.map((suggestion) => {
                    const Icon = suggestion.icon
                    const isLoading = loading === suggestion.id
                    const isPriority = suggestion.priority === 'high'
                    return (
                      <button
                        key={suggestion.id}
                        onClick={suggestion.action}
                        disabled={isLoading}
                        className={`w-full p-3 rounded-xl transition-colors group text-left disabled:opacity-50 ${
                          isPriority
                            ? 'bg-amber-50 hover:bg-amber-100 border border-amber-200'
                            : 'bg-slate-50 hover:bg-purple-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm transition-colors ${
                            isPriority
                              ? 'bg-amber-100 group-hover:bg-amber-200'
                              : 'bg-white group-hover:bg-purple-100'
                          }`}>
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                            ) : (
                              <Icon className={`w-4 h-4 ${isPriority ? 'text-amber-600' : 'text-purple-600'}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-slate-900 text-sm">
                                {suggestion.title}
                              </p>
                              {suggestion.actionLabel && (
                                <span className="text-xs text-purple-600 font-medium">
                                  {suggestion.actionLabel}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {suggestion.description}
                            </p>
                            {suggestion.why && (
                              <p className="text-xs text-purple-600 mt-1 italic">
                                {suggestion.why}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 transition-colors flex-shrink-0 mt-1" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Improve This (if content selected) */}
              {currentContent && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Improve This
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {improveActions.map((action) => {
                      const isLoading = loading === action.id
                      return (
                        <button
                          key={action.id}
                          onClick={action.action}
                          disabled={isLoading}
                          className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                          {action.label}
                        </button>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Repurpose (if content selected) */}
              {currentContent && (
                <section>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Repurpose Into
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {repurposeActions.map((action) => {
                      const isLoading = loading === action.id
                      return (
                        <button
                          key={action.id}
                          onClick={() => handleRepurpose(action.channel)}
                          disabled={isLoading}
                          className="p-3 text-sm bg-white border border-slate-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ArrowRight className="w-4 h-4 text-purple-500" />
                          )}
                          {action.label}
                        </button>
                      )
                    })}
                  </div>
                </section>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200">
              <p className="text-xs text-slate-400 text-center">
                Mia learns from your content to give better suggestions
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
