'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Video, Sparkles, SkipForward, Loader2, ChevronDown, ChevronUp, Film, Settings } from 'lucide-react'
import type { VideoRecommendationState } from '@/lib/studio/mia-creative-types'
import { getProvider } from '@/lib/shared/video-providers'
import type { BudgetBand, QualityTier } from '@/lib/studio/video-scoring'
import { MiaProviderCard } from './mia-provider-card'
import { MiaVideoPreviewPlayer } from './mia-video-preview-player'
import { MiaCostGate } from './mia-cost-gate'

const BUDGET_OPTIONS: { value: BudgetBand; label: string }[] = [
  { value: '$0-$5', label: '$0-$5' },
  { value: '$5-$25', label: '$5-$25' },
  { value: '$25-$100', label: '$25-$100' },
  { value: 'unlimited', label: 'Unlimited' },
]

const TIER_OPTIONS: { value: QualityTier; label: string }[] = [
  { value: 'fast', label: 'Fast' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'premium', label: 'Premium' },
]

interface MiaVideoOfferProps {
  videoState: VideoRecommendationState
  contentSummary: string
  channels: string[]
  goal: string
  onFetchRecommendation: (budget: BudgetBand, tier: QualityTier, duration: number) => void
  onRequestTestRender: (providerId: string, prompt: string) => void
  onConfirmFullRender: (providerId: string) => void
  onSkip: () => void
  onUpdateVideoState: (partial: Partial<VideoRecommendationState>) => void
}

export function MiaVideoOffer({
  videoState,
  contentSummary,
  channels,
  goal,
  onFetchRecommendation,
  onRequestTestRender,
  onConfirmFullRender,
  onSkip,
  onUpdateVideoState,
}: MiaVideoOfferProps) {
  const [costGateAction, setCostGateAction] = useState<'test-render' | 'full-render' | null>(null)
  const [showAllProviders, setShowAllProviders] = useState(false)

  const {
    mode,
    budgetBand,
    qualityTier,
    durationSeconds,
    recommendation,
    selectedProviderId,
    isLoadingRecommendation,
    testRenderStatus,
    testRenderVideoUrl,
    testRenderProgress,
    testRenderError,
  } = videoState

  // Auto-fetch recommendation on mount and when controls change
  useEffect(() => {
    onFetchRecommendation(budgetBand, qualityTier, durationSeconds)
  }, [budgetBand, qualityTier, durationSeconds]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedProvider = recommendation?.ranking.find(s => s.provider.id === selectedProviderId)
  const recommendedProvider = recommendation?.recommended

  const handleTestRenderClick = () => {
    if (!selectedProviderId) return
    setCostGateAction('test-render')
  }

  const handleFullRenderClick = () => {
    if (!selectedProviderId) return
    setCostGateAction('full-render')
  }

  const handleCostConfirm = () => {
    if (!selectedProviderId) return
    if (costGateAction === 'test-render') {
      setCostGateAction(null)
      onRequestTestRender(selectedProviderId, contentSummary)
    } else if (costGateAction === 'full-render') {
      setCostGateAction(null)
      onConfirmFullRender(selectedProviderId)
    }
  }

  const handleRetryTestRender = () => {
    onUpdateVideoState({
      testRenderStatus: 'idle',
      testRenderVideoUrl: null,
      testRenderError: null,
      testRenderProgress: 0,
    })
  }

  const costGateProvider = selectedProvider || recommendedProvider
  const testCost = costGateProvider?.testRenderCost || 0
  const fullCost = costGateProvider?.estimatedCost || 0

  // No providers available
  if (!isLoadingRecommendation && recommendation && recommendation.ranking.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 mb-3">
            <Video className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">No video providers available</h3>
          <p className="text-slate-500 mt-1">Configure API keys in Settings to enable video rendering.</p>
        </div>
        <div className="text-center">
          <button
            onClick={onSkip}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
            Continue without video
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 mb-3">
          <Video className="w-7 h-7 text-purple-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">{"Let's bring your content to life"}</h3>
        <p className="text-slate-500 mt-1">Mia will recommend the best video provider</p>
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => { onUpdateVideoState({ mode: 'auto' }); setShowAllProviders(false) }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'auto'
              ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-200'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Auto
        </button>
        <button
          onClick={() => onUpdateVideoState({ mode: 'manual' })}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'manual'
              ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-200'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          Manual
        </button>
      </div>

      {/* Controls Row */}
      <div className="flex flex-wrap items-center justify-center gap-4 bg-slate-50 rounded-xl p-4">
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Budget</label>
          <div className="flex gap-1">
            {BUDGET_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => onUpdateVideoState({ budgetBand: opt.value })}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  budgetBand === opt.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-slate-500 border border-slate-200 hover:border-purple-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Quality</label>
          <div className="flex gap-1">
            {TIER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => onUpdateVideoState({ qualityTier: opt.value })}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  qualityTier === opt.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-slate-500 border border-slate-200 hover:border-purple-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Duration</label>
          {(() => {
            const providerMeta = selectedProviderId ? getProvider(selectedProviderId) : null
            const allowed = providerMeta?.allowedDurations
            if (allowed && allowed.length > 0) {
              // Discrete buttons (e.g. Sora: 4/8/12)
              return (
                <div className="flex gap-1">
                  {allowed.map(d => (
                    <button
                      key={d}
                      onClick={() => onUpdateVideoState({ durationSeconds: d })}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                        durationSeconds === d
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-slate-500 border border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      {d}s
                    </button>
                  ))}
                </div>
              )
            }
            // Continuous slider with provider-specific range
            const minD = providerMeta?.minDurationSeconds || 4
            const maxD = providerMeta?.maxDurationSeconds || 40
            return (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={minD}
                  max={maxD}
                  value={durationSeconds}
                  onChange={e => onUpdateVideoState({ durationSeconds: Number(e.target.value) })}
                  className="w-24 accent-purple-600"
                />
                <span className="text-xs font-medium text-slate-700 w-8">{durationSeconds}s</span>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Loading */}
      {isLoadingRecommendation && (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
          <p className="text-sm text-slate-500">Finding the best provider...</p>
        </div>
      )}

      {/* Recommendation Display */}
      {!isLoadingRecommendation && recommendation && (
        <>
          {/* AUTO MODE: Single recommended card */}
          {mode === 'auto' && recommendedProvider && (
            <div className="max-w-md mx-auto space-y-3">
              <MiaProviderCard
                scored={recommendedProvider}
                isRecommended
                isSelected={selectedProviderId === recommendedProvider.provider.id}
                onSelect={() => onUpdateVideoState({ selectedProviderId: recommendedProvider.provider.id })}
                showScoreBreakdown={false}
              />

              {recommendation.fallbackUsed && (
                <p className="text-xs text-amber-600 text-center">
                  All providers exceed your budget — showing best available option.
                </p>
              )}

              {/* See all options toggle */}
              {recommendation.ranking.length > 1 && (
                <button
                  onClick={() => setShowAllProviders(!showAllProviders)}
                  className="flex items-center gap-1 mx-auto text-xs text-purple-600 hover:text-purple-700 transition-colors"
                >
                  {showAllProviders ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showAllProviders ? 'Hide options' : 'See all options'}
                </button>
              )}

              {showAllProviders && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3"
                >
                  {recommendation.ranking
                    .filter(s => s.provider.id !== recommendedProvider.provider.id)
                    .map(scored => (
                      <MiaProviderCard
                        key={scored.provider.id}
                        scored={scored}
                        isRecommended={false}
                        isSelected={selectedProviderId === scored.provider.id}
                        onSelect={() => onUpdateVideoState({ selectedProviderId: scored.provider.id })}
                        showScoreBreakdown
                      />
                    ))}
                </motion.div>
              )}
            </div>
          )}

          {/* MANUAL MODE: Full ranked grid */}
          {mode === 'manual' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {recommendation.ranking.map(scored => (
                <MiaProviderCard
                  key={scored.provider.id}
                  scored={scored}
                  isRecommended={scored === recommendedProvider}
                  isSelected={selectedProviderId === scored.provider.id}
                  onSelect={() => onUpdateVideoState({ selectedProviderId: scored.provider.id })}
                  showScoreBreakdown
                />
              ))}
            </div>
          )}

          {/* Test Render Preview Player */}
          {(testRenderStatus === 'rendering' || testRenderStatus === 'polling' || testRenderStatus === 'complete' || testRenderStatus === 'error') && (
            <div className="max-w-lg mx-auto">
              <MiaVideoPreviewPlayer
                videoUrl={testRenderVideoUrl}
                isLoading={testRenderStatus === 'rendering' || testRenderStatus === 'polling'}
                progress={testRenderProgress}
                providerName={selectedProvider?.provider.name || ''}
                durationSeconds={durationSeconds}
                cost={selectedProvider?.estimatedCost || 0}
                onRetry={handleRetryTestRender}
                error={testRenderError}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {/* Test render button — only if no test done yet */}
            {testRenderStatus === 'idle' && selectedProviderId && (
              <button
                onClick={handleTestRenderClick}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/25"
              >
                <Film className="w-4 h-4" />
                Run 10s Test Render — ${testCost.toFixed(2)}
              </button>
            )}

            {/* Full render button — after test render complete */}
            {testRenderStatus === 'complete' && selectedProviderId && (
              <>
                <button
                  onClick={handleFullRenderClick}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/25"
                >
                  <Sparkles className="w-4 h-4" />
                  Use this provider — Render full video
                </button>
                <button
                  onClick={handleRetryTestRender}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Try another
                </button>
              </>
            )}

            {/* Skip button — always available */}
            <button
              onClick={onSkip}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm hover:bg-slate-50 transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Skip Video
            </button>
          </div>
        </>
      )}

      {/* Cost Gate Modal */}
      <MiaCostGate
        action={costGateAction || 'test-render'}
        providerName={costGateProvider?.provider.name || ''}
        estimatedCost={costGateAction === 'test-render' ? testCost : fullCost}
        durationSeconds={costGateAction === 'test-render' ? 10 : durationSeconds}
        testRenderCredit={videoState.testRenderCostPaid || 0}
        onConfirm={handleCostConfirm}
        onCancel={() => setCostGateAction(null)}
        isVisible={costGateAction !== null}
      />
    </div>
  )
}
