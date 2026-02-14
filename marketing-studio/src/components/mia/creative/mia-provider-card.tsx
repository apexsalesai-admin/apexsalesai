'use client'

import { motion } from 'framer-motion'
import { Sparkles, Check, Ban } from 'lucide-react'
import type { ScoredProvider } from '@/lib/studio/video-scoring'

interface MiaProviderCardProps {
  scored: ScoredProvider
  isRecommended: boolean
  isSelected: boolean
  onSelect: () => void
  showScoreBreakdown: boolean
}

export function MiaProviderCard({
  scored,
  isRecommended,
  isSelected,
  onSelect,
  showScoreBreakdown,
}: MiaProviderCardProps) {
  const { provider, totalScore, qualityContribution, latencyContribution, fitContribution, estimatedCost, testRenderCost, disqualified, disqualifyReason, reason } = scored

  return (
    <motion.button
      onClick={disqualified ? undefined : onSelect}
      disabled={disqualified}
      className={`relative w-full p-5 rounded-2xl border-2 transition-all text-left ${
        disqualified
          ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
          : isSelected
            ? 'border-purple-500 ring-2 ring-purple-200 bg-purple-50/50'
            : isRecommended
              ? 'border-purple-300 ring-2 ring-purple-100 bg-white shadow-lg shadow-purple-100/50'
              : 'border-slate-200 hover:border-purple-400 hover:ring-2 hover:ring-purple-100 bg-white'
      }`}
    >
      {/* Badges */}
      {isRecommended && !disqualified && (
        <div className="absolute -top-3 left-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-bold flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          {"Mia's Pick"}
        </div>
      )}
      {isSelected && !disqualified && (
        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center">
          <Check className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      {disqualified && (
        <div className="absolute -top-3 left-4 px-2.5 py-0.5 rounded-full bg-slate-500 text-white text-[10px] font-bold flex items-center gap-1">
          <Ban className="w-3 h-3" />
          Over budget
        </div>
      )}

      {/* Row 1: Icon + name + category */}
      <div className="flex items-center gap-2 mb-2 mt-1">
        <span className="text-lg">{provider.icon}</span>
        <h4 className={`font-semibold text-sm ${disqualified ? 'text-slate-400' : 'text-slate-900'}`}>
          {provider.name}
        </h4>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ${
          disqualified ? 'bg-slate-100 text-slate-400' : 'bg-purple-100 text-purple-700'
        }`}>
          {provider.category}
        </span>
      </div>

      {/* Row 2: Quality + Latency bars */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-slate-400">Quality</span>
            <span className="text-[10px] font-bold text-slate-600">{provider.qualityScore}</span>
          </div>
          <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-purple-500" style={{ width: `${provider.qualityScore}%` }} />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-slate-400">Speed</span>
            <span className="text-[10px] font-bold text-slate-600">{provider.latencyScore}</span>
          </div>
          <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500" style={{ width: `${provider.latencyScore}%` }} />
          </div>
        </div>
      </div>

      {/* Row 3: Cost */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className={`text-sm font-bold ${disqualified ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
          ${estimatedCost.toFixed(2)}
        </span>
        {testRenderCost > 0 && (
          <span className="text-[10px] text-slate-400">
            test: ${testRenderCost.toFixed(2)}
          </span>
        )}
      </div>

      {/* Row 4: Score breakdown (manual mode) */}
      {showScoreBreakdown && (
        <div className="flex items-center gap-3 text-[10px] text-slate-400 mb-1">
          <span>Score: <strong className="text-slate-600">{totalScore}</strong></span>
          <span>Q:{qualityContribution}</span>
          <span>S:{latencyContribution}</span>
          <span>F:{fitContribution}</span>
        </div>
      )}

      {/* Row 5: Tagline / Reason */}
      <p className={`text-[11px] leading-relaxed ${disqualified ? 'text-slate-400' : 'text-slate-500'}`}>
        {disqualified ? disqualifyReason : reason || provider.tagline}
      </p>
    </motion.button>
  )
}
