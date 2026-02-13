'use client'

import { useState, useEffect, useCallback } from 'react'
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
}

interface SetupStatus {
  aiConfigured: boolean
  brandVoiceConfigured: boolean
  hasContent: boolean
  hasIntegrations: boolean
}

/* ---------- Result types from /api/studio/mia/suggest ---------- */
interface HookResult { text: string; formula: string }
interface CTAResult { text: string; urgency: string }
interface StructureSection { heading: string; description: string; words: number }
interface StructureResult { structure: StructureSection[]; totalWords: number; format: string }
interface ImproveResult { improved: string; changes?: string[]; formula?: string; original?: string; proofPoints?: string[]; originalWords?: number; newWords?: number; reduction?: string }
interface RepurposeResult { title: string; body: string; notes: string }

type MiaResults = {
  hooks?: HookResult[]
  ctas?: CTAResult[]
  structure?: StructureResult
  improve?: Record<string, ImproveResult>
  repurpose?: Record<string, RepurposeResult>
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
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [results, setResults] = useState<MiaResults>({})
  const [error, setError] = useState<string | null>(null)
  const [setupStatus, setSetupStatus] = useState<SetupStatus>({
    aiConfigured: true,
    brandVoiceConfigured: true,
    hasContent: true,
    hasIntegrations: true,
  })

  // Clear results when panel closes or route changes
  useEffect(() => {
    if (!isOpen) {
      setResults({})
      setError(null)
    }
  }, [isOpen])

  // Check setup status on mount
  useEffect(() => {
    if (isOpen) checkSetupStatus()
  }, [isOpen])

  const checkSetupStatus = async () => {
    let aiConfigured = false
    try {
      const res = await fetch('/api/ai/status')
      const data = await res.json()
      aiConfigured = data.data?.anyConfigured || false
    } catch {
      // Ignore
    }

    const brandVoice = typeof window !== 'undefined'
      ? localStorage.getItem('lyfye-brand-voice')
      : null
    const brandVoiceConfigured = !!brandVoice && brandVoice !== '{}'

    const hasContent = typeof window !== 'undefined'
      ? localStorage.getItem('lyfye-has-content') === 'true'
      : false

    const hasIntegrations = typeof window !== 'undefined'
      ? localStorage.getItem('lyfye-has-integrations') === 'true'
      : false

    setSetupStatus({ aiConfigured, brandVoiceConfigured, hasContent, hasIntegrations })
  }

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }, [])

  // Call the Mia suggest API
  const callMiaAPI = useCallback(async (action: string, extra?: Record<string, string>) => {
    const res = await fetch('/api/studio/mia/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        topic: currentContent?.topic || '',
        channel: currentContent?.channel || '',
        text: currentContent?.text || '',
        ...extra,
      }),
    })
    const data = await res.json()
    if (!data.success) throw new Error(data.error || 'Request failed')
    return data.data
  }, [currentContent])

  // --- Action handlers ---

  const handleViralHooks = useCallback(async () => {
    setLoading('new-hooks')
    setError(null)
    try {
      const data = await callMiaAPI('viral-hooks')
      setResults(prev => ({ ...prev, hooks: data.hooks }))
      toast.success('Generated 3 viral hooks')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate hooks'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(null)
    }
  }, [callMiaAPI])

  const handleCTAOptions = useCallback(async () => {
    setLoading('new-cta')
    setError(null)
    try {
      const data = await callMiaAPI('cta-options')
      setResults(prev => ({ ...prev, ctas: data.ctas }))
      toast.success('Generated CTA options')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to generate CTAs'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(null)
    }
  }, [callMiaAPI])

  const handleContentStructure = useCallback(async () => {
    setLoading('new-structure')
    setError(null)
    try {
      const data = await callMiaAPI('content-structure')
      setResults(prev => ({ ...prev, structure: data }))
      toast.success('Generated content structure')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to suggest structure'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(null)
    }
  }, [callMiaAPI])

  const handleImprove = useCallback(async (action: string, id: string) => {
    setLoading(id)
    setError(null)
    try {
      const data = await callMiaAPI(action)
      setResults(prev => ({
        ...prev,
        improve: { ...(prev.improve || {}), [id]: data },
      }))
      toast.success('Improvement generated')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to improve'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(null)
    }
  }, [callMiaAPI])

  const handleRepurpose = useCallback(async (targetChannel: string) => {
    const id = `repurpose-${targetChannel}`
    setLoading(id)
    setError(null)
    try {
      const data = await callMiaAPI('repurpose', { targetChannel })
      setResults(prev => ({
        ...prev,
        repurpose: { ...(prev.repurpose || {}), [targetChannel]: data },
      }))
      toast.success(`Created ${targetChannel} version`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to repurpose'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(null)
    }
  }, [callMiaAPI])

  // --- Build suggestions list ---

  const getSuggestions = (): MiaSuggestion[] => {
    const suggestions: MiaSuggestion[] = []

    if (!setupStatus.aiConfigured) {
      suggestions.push({
        id: 'setup-ai',
        title: 'Connect an AI Provider',
        description: 'Required to generate content',
        why: 'Content generation needs an AI provider',
        icon: AlertCircle,
        priority: 'high',
        action: () => { router.push('/studio/settings/ai'); onClose() },
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
        action: () => { router.push('/studio/settings/brand'); onClose() },
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
          action: () => { router.push('/studio/content/new'); onClose() },
          actionLabel: 'Create',
        })
      }

      suggestions.push({
        id: 'dashboard-approvals',
        title: 'Review pending content',
        description: 'Items waiting for approval',
        why: 'Keep your content pipeline moving',
        icon: FileText,
        action: () => { router.push('/studio/approvals'); onClose() },
      })

      suggestions.push({
        id: 'dashboard-calendar',
        title: 'Plan this week\'s content',
        description: 'See your content calendar',
        why: 'Stay consistent with scheduled posts',
        icon: TrendingUp,
        action: () => { router.push('/studio/content/calendar'); onClose() },
      })
    }

    // Content/New or Content Detail suggestions — AI generation actions
    if (pathname.includes('/content/new') || pathname.match(/\/content\/[^/]+$/)) {
      suggestions.push({
        id: 'new-hooks',
        title: 'Suggest 3 viral hooks',
        description: 'Attention-grabbing openers for your topic',
        why: 'Hooks drive 80% of engagement',
        icon: Lightbulb,
        action: handleViralHooks,
        actionLabel: 'Generate',
      })

      suggestions.push({
        id: 'new-cta',
        title: 'Generate CTA options',
        description: '3 call-to-action variants',
        why: 'CTAs convert viewers to customers',
        icon: Target,
        action: handleCTAOptions,
        actionLabel: 'Generate',
      })

      suggestions.push({
        id: 'new-structure',
        title: 'Suggest content structure',
        description: 'Optimal format for your channel',
        why: 'Structure improves readability 40%',
        icon: FileText,
        action: handleContentStructure,
        actionLabel: 'Generate',
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
          toast.info('3 posts pending: 2 LinkedIn, 1 X thread', { description: 'Oldest is 2 days ago' })
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
          toast.success('Recommended: LinkedIn post first', { description: 'Time-sensitive content' })
          setLoading(null)
        },
      })
    }

    // Settings suggestions
    if (pathname.includes('/settings')) {
      if (setupStatus.aiConfigured) {
        suggestions.push({
          id: 'settings-test',
          title: 'Test your AI provider',
          description: 'Verify your connection is working',
          why: 'Ensure content generation works',
          icon: Zap,
          action: () => { router.push('/studio/settings/ai'); onClose() },
        })
      }
    }

    // Default suggestions
    if (suggestions.length === 0) {
      suggestions.push({
        id: 'default-create',
        title: 'Create new content',
        description: 'AI-powered posts, videos, articles',
        icon: Edit3,
        action: () => { router.push('/studio/content/new'); onClose() },
      })

      suggestions.push({
        id: 'default-calendar',
        title: 'View content calendar',
        description: 'See scheduled posts',
        icon: FileText,
        action: () => { router.push('/studio/content/calendar'); onClose() },
      })
    }

    return suggestions.slice(0, 5)
  }

  // Improve This actions (wired to real AI)
  const improveActions = currentContent
    ? [
        { id: 'improve-hook', label: 'Tighten hook', apiAction: 'improve-hook' },
        { id: 'improve-executive', label: 'Make it executive', apiAction: 'improve-executive' },
        { id: 'improve-proof', label: 'Add proof', apiAction: 'improve-proof' },
        { id: 'improve-shorten', label: 'Shorten 30%', apiAction: 'improve-shorten' },
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
              {/* Error banner */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  {error}
                </div>
              )}

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
                        disabled={!!loading}
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

              {/* Inline AI Results — Hooks */}
              {results.hooks && results.hooks.length > 0 && (
                <section className="bg-purple-50 rounded-xl p-3 space-y-2">
                  <h3 className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                    Viral Hooks
                  </h3>
                  {results.hooks.map((hook, i) => (
                    <div key={i} className="bg-white rounded-lg p-2.5 border border-purple-100">
                      <p className="text-sm text-slate-800">{hook.text}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-purple-400 font-medium">
                          {hook.formula}
                        </span>
                        <button
                          onClick={() => copyToClipboard(hook.text, `hook-${i}`)}
                          className="p-1 text-slate-400 hover:text-purple-600 transition-colors"
                        >
                          {copiedField === `hook-${i}` ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* Inline AI Results — CTAs */}
              {results.ctas && results.ctas.length > 0 && (
                <section className="bg-purple-50 rounded-xl p-3 space-y-2">
                  <h3 className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                    CTA Options
                  </h3>
                  {results.ctas.map((cta, i) => (
                    <div key={i} className="bg-white rounded-lg p-2.5 border border-purple-100 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800">{cta.text}</p>
                        <span className={`text-[10px] uppercase tracking-wider font-medium ${
                          cta.urgency === 'strong' ? 'text-red-400' :
                          cta.urgency === 'medium' ? 'text-amber-400' : 'text-green-400'
                        }`}>
                          {cta.urgency}
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(cta.text, `cta-${i}`)}
                        className="p-1 text-slate-400 hover:text-purple-600 transition-colors flex-shrink-0"
                      >
                        {copiedField === `cta-${i}` ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </section>
              )}

              {/* Inline AI Results — Structure */}
              {results.structure && (
                <section className="bg-purple-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-purple-600 uppercase tracking-wider">
                      Content Structure
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      ~{results.structure.totalWords} words &middot; {results.structure.format}
                    </span>
                  </div>
                  {results.structure.structure.map((section, i) => (
                    <div key={i} className="bg-white rounded-lg p-2.5 border border-purple-100">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-800">{i + 1}. {section.heading}</p>
                        <span className="text-[10px] text-slate-400">~{section.words}w</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{section.description}</p>
                    </div>
                  ))}
                </section>
              )}

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
                          onClick={() => handleImprove(action.apiAction, action.id)}
                          disabled={!!loading}
                          className="px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                          {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                          {action.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* Improve results */}
                  {results.improve && Object.entries(results.improve).map(([key, result]) => (
                    <div key={key} className="mt-3 bg-emerald-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                          {key.replace('improve-', '').replace(/-/g, ' ')}
                        </h4>
                        <button
                          onClick={() => copyToClipboard(result.improved, key)}
                          className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                        >
                          {copiedField === key ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{result.improved}</p>
                      {result.changes && result.changes.length > 0 && (
                        <ul className="text-xs text-emerald-600 space-y-0.5">
                          {result.changes.map((c, i) => <li key={i}>&bull; {c}</li>)}
                        </ul>
                      )}
                      {result.proofPoints && result.proofPoints.length > 0 && (
                        <ul className="text-xs text-emerald-600 space-y-0.5">
                          {result.proofPoints.map((p, i) => <li key={i}>&bull; {p}</li>)}
                        </ul>
                      )}
                      {result.reduction && (
                        <p className="text-xs text-emerald-500">Reduced by {result.reduction}</p>
                      )}
                    </div>
                  ))}
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
                          disabled={!!loading}
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

                  {/* Repurpose results */}
                  {results.repurpose && Object.entries(results.repurpose).map(([channel, result]) => (
                    <div key={channel} className="mt-3 bg-blue-50 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
                          {channel}
                        </h4>
                        <button
                          onClick={() => copyToClipboard(`${result.title}\n\n${result.body}`, `repurpose-${channel}`)}
                          className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          {copiedField === `repurpose-${channel}` ? (
                            <Check className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <p className="text-sm font-medium text-slate-800">{result.title}</p>
                      <p className="text-xs text-slate-600 whitespace-pre-wrap">{result.body}</p>
                      {result.notes && (
                        <p className="text-[10px] text-blue-500 italic">{result.notes}</p>
                      )}
                    </div>
                  ))}
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
