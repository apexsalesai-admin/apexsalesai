'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Check, Sparkles, Wand2 } from 'lucide-react'
import { useMiaCreativeSession } from '@/hooks/useMiaCreativeSession'
import { MiaGreeting } from './mia-greeting'
import { MiaAnglePicker } from './mia-angle-picker'
import { MiaSectionBuilder } from './mia-section-builder'
import { MiaThinkingPanel } from './mia-thinking-panel'
import { MiaVideoOffer } from './mia-video-offer'
import { MiaMomentumMeter } from './mia-momentum-meter'
import type { MiaCreativeResult, FixSuggestion, VideoRecommendationState } from '@/lib/studio/mia-creative-types'

interface MiaCreativeSessionProps {
  channels: string[]
  contentType: string
  goal?: string
  onComplete: (result: MiaCreativeResult) => void
  onSwitchToManual: () => void
}

export function MiaCreativeSession({
  channels,
  contentType,
  goal,
  onComplete,
  onSwitchToManual,
}: MiaCreativeSessionProps) {
  const {
    state,
    dispatch,
    fetchGreeting,
    fetchAngles,
    refreshAngles,
    selectAngle,
    generateSection,
    acceptSection,
    retrySection,
    editSection,
    reviewEditedSection,
    scoreContent,
    fetchPolishSuggestions,
    applyFix,
    completeSession,
    selectVideoProvider,
    fetchRecommendation,
    requestTestRender,
    confirmFullRender,
    refineAngles,
    reviseSection,
    assistSection,
  } = useMiaCreativeSession({ channels, contentType, goal, onComplete })

  // Assemble content summary for video prompt generation
  const contentSummary = useMemo(() => {
    return state.sections
      .filter(s => s.accepted && s.content)
      .map(s => s.content)
      .join('\n\n')
  }, [state.sections])

  // Update video state via dispatch
  const updateVideoState = useCallback(
    (partial: Partial<VideoRecommendationState>) => {
      dispatch({ type: 'SET_VIDEO_STATE', videoState: partial })
    },
    [dispatch]
  )

  // Skip video — proceed without a provider
  const handleSkipVideo = useCallback(() => {
    selectVideoProvider(undefined)
  }, [selectVideoProvider])

  // Auto-fetch polish suggestions when entering polishing phase
  useEffect(() => {
    if (state.phase === 'polishing' && state.fixes.length === 0 && !state.isLoading) {
      fetchPolishSuggestions()
    }
  }, [state.phase, state.fixes.length, state.isLoading, fetchPolishSuggestions])

  const handleRetrySection = useCallback(
    (index: number) => {
      retrySection(index)
      // Trigger re-generation after retry
      setTimeout(() => generateSection(index), 100)
    },
    [retrySection, generateSection]
  )

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Session header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">Mia Creative Session</h2>
            <p className="text-xs text-slate-500">AI-guided content creation</p>
          </div>
        </div>
        <button
          onClick={onSwitchToManual}
          className="text-sm text-slate-500 hover:text-purple-600 transition-colors underline underline-offset-2"
        >
          Switch to manual editor
        </button>
      </div>

      {/* Error banner */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {state.error}
        </div>
      )}

      {/* Two-column layout: content + thinking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3: content area */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {/* Phase 0: Greeting */}
            {state.phase === 'greeting' && (
              <motion.div key="greeting" exit={{ opacity: 0, y: -10 }}>
                <MiaGreeting
                  greeting={state.greeting}
                  isLoading={state.isLoading}
                  onSubmitTopic={fetchAngles}
                  onFetchGreeting={fetchGreeting}
                />
              </motion.div>
            )}

            {/* Phase 1: Angle picker */}
            {state.phase === 'angles' && (
              <motion.div key="angles" exit={{ opacity: 0, y: -10 }}>
                <MiaAnglePicker
                  angles={state.angles}
                  isLoading={state.isLoading}
                  onSelect={selectAngle}
                  onRefreshAngles={refreshAngles}
                  onRefineAngles={refineAngles}
                />
              </motion.div>
            )}

            {/* Phase 2: Section building */}
            {state.phase === 'building' && (
              <motion.div key="building" exit={{ opacity: 0, y: -10 }} className="space-y-4">
                <MiaMomentumMeter score={state.momentum} />
                <MiaSectionBuilder
                  sections={state.sections}
                  currentSectionIndex={state.currentSectionIndex}
                  isLoading={state.isLoading}
                  onAccept={acceptSection}
                  onRetry={handleRetrySection}
                  onEdit={editSection}
                  onGenerate={generateSection}
                  onEditAndReview={reviewEditedSection}
                  onReviseSection={reviseSection}
                  onAssistSection={assistSection}
                />
              </motion.div>
            )}

            {/* Phase 3: Polishing */}
            {state.phase === 'polishing' && (
              <motion.div
                key="polishing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <MiaMomentumMeter score={state.momentum} />
                <PolishingPhase
                  fixes={state.fixes}
                  isLoading={state.isLoading}
                  onApplyFix={applyFix}
                  onComplete={completeSession}
                />
              </motion.div>
            )}

            {/* Phase 3.5: Video offer */}
            {state.phase === 'video-offer' && state.videoState && (
              <motion.div
                key="video-offer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <MiaVideoOffer
                  videoState={state.videoState}
                  contentSummary={contentSummary}
                  channels={channels}
                  goal={goal || 'awareness'}
                  onFetchRecommendation={fetchRecommendation}
                  onRequestTestRender={requestTestRender}
                  onConfirmFullRender={confirmFullRender}
                  onSkip={handleSkipVideo}
                  onUpdateVideoState={updateVideoState}
                />
              </motion.div>
            )}

            {/* Phase 4: Done */}
            {state.phase === 'done' && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-100 mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Content ready!</h3>
                <p className="text-slate-500 mt-2">Moving to preview...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right 1/3: thinking panel */}
        <div className="hidden lg:block">
          <MiaThinkingPanel entries={state.thinking} currentPhase={state.phase} />
        </div>
      </div>
    </div>
  )
}

// ─── Polishing sub-component ─────────────────────────────────────────────────

function PolishingPhase({
  fixes,
  isLoading,
  onApplyFix,
  onComplete,
}: {
  fixes: FixSuggestion[]
  isLoading: boolean
  onApplyFix: (fixId: string) => void
  onComplete: () => void
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <p className="text-slate-500">Reviewing your draft...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-slate-900">Final polish</h3>
        <p className="text-slate-500 mt-1">
          {fixes.length > 0
            ? `I found ${fixes.length} suggestion${fixes.length === 1 ? '' : 's'} to make it even better`
            : 'Your content looks great!'}
        </p>
      </div>

      {fixes.length > 0 && (
        <div className="space-y-3">
          {fixes.map((fix) => (
            <motion.div
              key={fix.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border p-4 ${
                fix.applied ? 'border-green-200 bg-green-50/50' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 capitalize">
                      {fix.category}
                    </span>
                    {fix.applied && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Applied
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 mb-2">{fix.description}</p>
                  {!fix.applied && fix.currentText && (
                    <div className="text-xs space-y-1">
                      <p className="text-slate-400 line-through">{fix.currentText}</p>
                      <p className="text-purple-700 font-medium">{fix.suggestedText}</p>
                    </div>
                  )}
                </div>
                {!fix.applied && (
                  <button
                    onClick={() => onApplyFix(fix.id)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 text-xs font-medium hover:bg-purple-200 transition-colors"
                  >
                    <Wand2 className="w-3 h-3" />
                    Fix
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="text-center pt-4">
        <button
          onClick={onComplete}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/25"
        >
          <Check className="w-4 h-4" />
          Looks great — continue to preview
        </button>
      </div>
    </div>
  )
}
