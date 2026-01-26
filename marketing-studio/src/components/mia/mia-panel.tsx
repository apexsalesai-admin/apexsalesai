'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  X,
  ChevronRight,
  Wand2,
  RefreshCw,
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
} from 'lucide-react'
import { toast } from '@/components/ui/toaster'

interface MiaSuggestion {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  action: () => void
  loading?: boolean
}

interface MiaPanelProps {
  isOpen: boolean
  onClose: () => void
  // Content context for "Improve This" and "Repurpose"
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
  const [copied, setCopied] = useState(false)

  // Get context-aware suggestions based on current route
  const getSuggestions = (): MiaSuggestion[] => {
    // Dashboard suggestions
    if (pathname === '/studio' || pathname === '/studio/') {
      return [
        {
          id: 'dashboard-1',
          title: 'Create a content series',
          description: 'Turn your top performing topic into a 5-post series',
          icon: TrendingUp,
          action: () => {
            router.push('/studio/content/new?mode=series')
            toast.success('Series mode activated')
          },
        },
        {
          id: 'dashboard-2',
          title: 'Review pending approvals',
          description: '3 items waiting for your review',
          icon: FileText,
          action: () => {
            router.push('/studio/approvals')
          },
        },
        {
          id: 'dashboard-3',
          title: 'Generate this week\'s content',
          description: 'Create content for all your channels at once',
          icon: Zap,
          action: () => {
            router.push('/studio/content/new?mode=batch')
            toast.success('Batch generation mode')
          },
        },
      ]
    }

    // Content/New suggestions
    if (pathname.includes('/content/new')) {
      return [
        {
          id: 'new-1',
          title: 'Suggest 3 viral hooks',
          description: 'AI-generated attention-grabbing openers',
          icon: Lightbulb,
          action: async () => {
            setLoading('new-1')
            // Simulate AI generation
            await new Promise((r) => setTimeout(r, 1500))
            toast.success('Generated 3 hook options', {
              description: 'Scroll down to see suggestions',
            })
            setLoading(null)
          },
        },
        {
          id: 'new-2',
          title: 'Add proof points',
          description: 'Insert statistics and credibility markers',
          icon: Target,
          action: async () => {
            setLoading('new-2')
            await new Promise((r) => setTimeout(r, 1200))
            toast.success('Added 2 proof points')
            setLoading(null)
          },
        },
        {
          id: 'new-3',
          title: 'Generate CTA options',
          description: '3 call-to-action variants for your audience',
          icon: Zap,
          action: async () => {
            setLoading('new-3')
            await new Promise((r) => setTimeout(r, 1000))
            toast.success('Generated CTA options')
            setLoading(null)
          },
        },
      ]
    }

    // Approvals suggestions
    if (pathname.includes('/approvals')) {
      return [
        {
          id: 'approvals-1',
          title: 'Summarize pending items',
          description: 'Quick overview of what needs review',
          icon: MessageSquare,
          action: async () => {
            setLoading('approvals-1')
            await new Promise((r) => setTimeout(r, 1000))
            toast.info('3 posts pending: 2 LinkedIn, 1 X thread', {
              description: 'Oldest is 2 days ago',
            })
            setLoading(null)
          },
        },
        {
          id: 'approvals-2',
          title: 'Suggest approval order',
          description: 'Prioritize by urgency and engagement potential',
          icon: TrendingUp,
          action: async () => {
            setLoading('approvals-2')
            await new Promise((r) => setTimeout(r, 800))
            toast.success('Recommended: LinkedIn post first (time-sensitive)')
            setLoading(null)
          },
        },
        {
          id: 'approvals-3',
          title: 'Batch approve low-risk',
          description: 'Auto-approve items matching brand guidelines',
          icon: Check,
          action: async () => {
            setLoading('approvals-3')
            await new Promise((r) => setTimeout(r, 1500))
            toast.success('1 item auto-approved', {
              description: 'Met all brand voice criteria',
            })
            setLoading(null)
          },
        },
      ]
    }

    // Default suggestions
    return [
      {
        id: 'default-1',
        title: 'Start creating content',
        description: 'Open the content creator with AI assistance',
        icon: Edit3,
        action: () => router.push('/studio/content/new'),
      },
      {
        id: 'default-2',
        title: 'View your calendar',
        description: 'See scheduled posts and plan ahead',
        icon: FileText,
        action: () => router.push('/studio/content/calendar'),
      },
      {
        id: 'default-3',
        title: 'Check analytics',
        description: 'See how your content is performing',
        icon: TrendingUp,
        action: () => router.push('/studio/analytics'),
      },
    ]
  }

  // Improve This actions
  const improveActions = currentContent
    ? [
        {
          id: 'improve-hook',
          label: 'Tighten hook',
          action: async () => {
            setLoading('improve-hook')
            await new Promise((r) => setTimeout(r, 1500))
            toast.success('Hook improved!', {
              description: 'Revision saved as draft',
            })
            setLoading(null)
          },
        },
        {
          id: 'improve-executive',
          label: 'Make it more executive',
          action: async () => {
            setLoading('improve-executive')
            await new Promise((r) => setTimeout(r, 1500))
            toast.success('Tone adjusted for executives')
            setLoading(null)
          },
        },
        {
          id: 'improve-proof',
          label: 'Add proof',
          action: async () => {
            setLoading('improve-proof')
            await new Promise((r) => setTimeout(r, 1200))
            toast.success('Added credibility markers')
            setLoading(null)
          },
        },
        {
          id: 'improve-shorten',
          label: 'Shorten by 30%',
          action: async () => {
            setLoading('improve-shorten')
            await new Promise((r) => setTimeout(r, 1000))
            toast.success('Reduced by 32%', {
              description: '145 → 98 words',
            })
            setLoading(null)
          },
        },
      ]
    : []

  // Repurpose actions
  const repurposeActions = currentContent
    ? [
        { id: 'repurpose-linkedin', label: 'LinkedIn post', channel: 'linkedin' },
        { id: 'repurpose-x', label: 'X thread', channel: 'x' },
        { id: 'repurpose-email', label: 'Email', channel: 'email' },
        { id: 'repurpose-video', label: 'Short video script', channel: 'video' },
      ]
    : []

  const handleRepurpose = async (channel: string) => {
    setLoading(`repurpose-${channel}`)
    await new Promise((r) => setTimeout(r, 2000))
    toast.success(`Created ${channel} version`, {
      description: 'Saved to drafts',
    })
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
              {/* Recommended Next */}
              <section>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Recommended Next
                </h3>
                <div className="space-y-2">
                  {suggestions.map((suggestion) => {
                    const Icon = suggestion.icon
                    const isLoading = loading === suggestion.id
                    return (
                      <button
                        key={suggestion.id}
                        onClick={suggestion.action}
                        disabled={isLoading}
                        className="w-full p-3 bg-slate-50 hover:bg-purple-50 rounded-xl transition-colors group text-left disabled:opacity-50"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover:bg-purple-100 transition-colors">
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
                            ) : (
                              <Icon className="w-4 h-4 text-purple-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 text-sm">
                              {suggestion.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {suggestion.description}
                            </p>
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
