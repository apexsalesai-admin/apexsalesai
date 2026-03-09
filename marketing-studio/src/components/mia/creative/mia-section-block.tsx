'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, RefreshCw, PenTool, Check, Loader2, ChevronDown, ChevronUp, Sparkles, Send } from 'lucide-react'
import type { SectionDraft, SectionType } from '@/lib/studio/mia-creative-types'

const SECTION_LABELS: Partial<Record<SectionType, string>> = {
  hook: 'Opening Hook',
  body: 'Main Body',
  cta: 'Call to Action',
  headline: 'Headline',
  introduction: 'Introduction',
  conclusion: 'Conclusion',
  subject_line: 'Subject Line',
  preview_text: 'Preview Text',
  visual_concept: 'Visual Concept',
  prompt_variations: 'DALL-E Prompts',
  strategy_overview: 'Strategy Overview',
  channel_plan: 'Channel Plan',
  messaging_framework: 'Messaging Framework',
}

const SECTION_DESCRIPTIONS: Partial<Record<SectionType, string>> = {
  hook: 'The first thing your audience sees — make it count',
  body: 'Where you deliver value and build your argument',
  cta: 'Drive action with a clear next step',
  headline: 'The title that draws readers in',
  introduction: 'Set the stage and hook your readers',
  conclusion: 'Wrap up with key takeaways and next steps',
  subject_line: 'The make-or-break line that drives opens',
  preview_text: 'The supporting text visible in the inbox',
  visual_concept: 'The creative direction for your image',
  prompt_variations: 'Detailed prompts for AI image generation',
  strategy_overview: 'Your campaign blueprint and objectives',
  channel_plan: 'Platform-specific content strategy',
  messaging_framework: 'Core messages and tone guidelines',
}

interface MiaSectionBlockProps {
  section: SectionDraft
  index: number
  isActive: boolean
  isGenerating: boolean
  onAccept: () => void
  onRetry: () => void
  onEdit: (content: string) => void
  onGenerate: () => void
  onEditAndReview?: (content: string) => Promise<string | null>
  onRevise?: (direction: string) => void
  onAssist?: (currentContent: string, request: string) => void
}

export function MiaSectionBlock({
  section,
  index,
  isActive,
  isGenerating,
  onAccept,
  onRetry,
  onEdit,
  onGenerate,
  onEditAndReview,
  onRevise,
  onAssist,
}: MiaSectionBlockProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(section.content)
  const [collapsed, setCollapsed] = useState(false)
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)
  const [reviseInput, setReviseInput] = useState('')
  const [assistInput, setAssistInput] = useState('')
  const [pendingAssist, setPendingAssist] = useState(false)

  // Sync editValue when an assist completes (content changes from parent)
  useEffect(() => {
    if (isEditing && pendingAssist && !section.isAssisting && section.content) {
      setEditValue(section.content)
      setPendingAssist(false)
    }
  }, [section.content, section.isAssisting, pendingAssist, isEditing])

  const handleAssist = (content: string, request: string) => {
    setPendingAssist(true)
    onAssist?.(content, request)
  }

  const label = SECTION_LABELS[section.type] || section.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const description = SECTION_DESCRIPTIONS[section.type] || 'Build this section of your content'

  // Auto-generate when becoming active with no content
  if (isActive && !section.content && !isGenerating) {
    // Use a timeout to avoid calling during render
    setTimeout(onGenerate, 0)
  }

  const handleSaveEdit = () => {
    onEdit(editValue)
    setIsEditing(false)
  }

  const handleSaveAndReview = async () => {
    if (!onEditAndReview) {
      handleSaveEdit()
      return
    }
    onEdit(editValue)
    setIsEditing(false)
    setIsReviewing(true)
    const feedback = await onEditAndReview(editValue)
    setReviewFeedback(feedback || null)
    setIsReviewing(false)
  }

  const handleCancelEdit = () => {
    setEditValue(section.content)
    setIsEditing(false)
  }

  // Collapsed accepted section
  if (section.accepted && collapsed) {
    return (
      <motion.div
        layout
        className="rounded-xl border border-green-200 bg-green-50/50 p-4"
      >
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            <span className="font-medium text-green-800 text-sm">{label}</span>
            <span className="text-xs text-green-600">v{section.version}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-green-500" />
        </button>
      </motion.div>
    )
  }

  // Accepted but expanded
  if (section.accepted) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-green-200 bg-green-50/50 p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600" />
            <span className="font-medium text-green-800">{label}</span>
            <span className="text-xs text-green-500 bg-green-100 px-2 py-0.5 rounded-full">v{section.version}</span>
          </div>
          <button onClick={() => setCollapsed(true)} className="text-green-400 hover:text-green-600">
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-slate-700 whitespace-pre-wrap">{section.content}</p>
      </motion.div>
    )
  }

  // Active section being built
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border-2 p-6 transition-colors ${
        isActive ? 'border-purple-300 bg-white shadow-lg shadow-purple-100/50' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="font-semibold text-slate-900">{label}</h4>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
        {section.version > 0 && (
          <span className="text-xs text-purple-500 bg-purple-50 px-2 py-0.5 rounded-full">v{section.version}</span>
        )}
      </div>

      {isGenerating ? (
        <div className="flex items-center gap-3 py-8 justify-center">
          <div className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 border border-purple-100 rounded-full">
            <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
            <span className="text-sm text-purple-600 font-medium">Mia is writing</span>
            <span className="flex gap-0.5 ml-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </div>
        </div>
      ) : section.content ? (
        <div className="space-y-4">
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full min-h-[120px] p-3 rounded-lg border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none text-sm text-slate-800 resize-y"
              />

              {/* ─── Mia Assist Bar ─── */}
              {onAssist && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '✨ Finish this thought', request: 'Finish the incomplete or trailing thought naturally' },
                      { label: '📊 Add a stat', request: 'Add a relevant statistic or data point where it fits best' },
                      { label: '💪 Make it punchier', request: 'Make the language more impactful and direct without changing the structure' },
                      { label: '✂️ Shorten', request: 'Make this more concise while keeping the core message' },
                    ].map((action) => (
                      <button
                        key={action.label}
                        onClick={() => {
                          if (!section.isAssisting) {
                            handleAssist(editValue, action.request)
                          }
                        }}
                        disabled={section.isAssisting}
                        className="px-2.5 py-1 text-[11px] font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 disabled:opacity-40 transition-all"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl">
                    <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                    <input
                      type="text"
                      value={assistInput}
                      onChange={(e) => setAssistInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && assistInput.trim() && !section.isAssisting) {
                          handleAssist(editValue, assistInput.trim())
                          setAssistInput('')
                        }
                      }}
                      placeholder="Ask Mia to help... (e.g. 'finish the last sentence', 'add ROI data')"
                      className="flex-1 bg-transparent border-none outline-none text-xs text-slate-700 placeholder-slate-400"
                      disabled={section.isAssisting}
                    />
                    <button
                      onClick={() => {
                        if (assistInput.trim() && !section.isAssisting) {
                          handleAssist(editValue, assistInput.trim())
                          setAssistInput('')
                        }
                      }}
                      disabled={!assistInput.trim() || section.isAssisting}
                      className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 disabled:opacity-40 transition-all shrink-0"
                    >
                      {section.isAssisting ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Working...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3" />
                          Ask Mia
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  Save
                </button>
                {onEditAndReview && (
                  <button
                    onClick={handleSaveAndReview}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
                  >
                    <Sparkles className="w-3 h-3" />
                    Save &amp; let Mia review
                  </button>
                )}
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{section.content}</p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={onAccept}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium hover:from-purple-700 hover:to-pink-700 transition-all shadow-sm"
                >
                  <Heart className="w-3.5 h-3.5" />
                  Love it
                </button>
                <button
                  onClick={onRetry}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Try another
                </button>
                <button
                  onClick={() => {
                    setEditValue(section.content)
                    setIsEditing(true)
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  Edit
                </button>
              </div>

              {/* Conversational revision input */}
              {onRevise && !section.isRevising && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <input
                    type="text"
                    value={reviseInput}
                    onChange={(e) => setReviseInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && reviseInput.trim()) {
                        onRevise(reviseInput.trim())
                        setReviseInput('')
                      }
                    }}
                    placeholder="Tell Mia how to improve this..."
                    className="flex-1 bg-transparent border-none outline-none text-xs text-slate-700 placeholder-slate-400"
                  />
                  <button
                    onClick={() => {
                      if (reviseInput.trim()) {
                        onRevise(reviseInput.trim())
                        setReviseInput('')
                      }
                    }}
                    disabled={!reviseInput.trim()}
                    className="flex items-center gap-1 px-2.5 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 disabled:opacity-40 transition-all shrink-0"
                  >
                    <Send className="w-3 h-3" />
                    Revise
                  </button>
                </div>
              )}
              {section.isRevising && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2.5 bg-purple-50 border border-purple-100 rounded-xl">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
                  <span className="text-xs text-purple-600 font-medium">Mia is revising</span>
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              )}
            </>
          )}

          {/* Mia review feedback */}
          <AnimatePresence>
            {isReviewing && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-xs text-purple-500"
              >
                <Loader2 className="w-3 h-3 animate-spin" />
                Mia is reviewing your edit...
              </motion.div>
            )}
            {reviewFeedback && !isReviewing && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 px-3 py-2 rounded-lg bg-purple-50 border border-purple-200"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-purple-700">{reviewFeedback}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : !isActive ? (
        <div className="py-6 text-center text-sm text-slate-400">
          Step {index + 1} of 3 — waiting for previous section
        </div>
      ) : null}
    </motion.div>
  )
}
