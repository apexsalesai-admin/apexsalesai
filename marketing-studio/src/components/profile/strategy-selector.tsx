'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STRATEGY_GOALS, type StrategyGoalKey } from '@/lib/studio/creator-profile'

interface StrategySelectorProps {
  primaryGoal: StrategyGoalKey
  secondaryGoal?: StrategyGoalKey | null
  preferredChannels: string[]
  onChange: (primary: StrategyGoalKey, secondary: StrategyGoalKey | null, channels: string[]) => void
}

const CHANNEL_ICONS: Record<string, string> = {
  linkedin: '💼', twitter: '🐦', blog: '📝', youtube: '🎬',
  instagram: '📸', reddit: '🤖', producthunt: '🚀', tiktok: '🎵',
}

export function StrategySelector({ primaryGoal, secondaryGoal, preferredChannels, onChange }: StrategySelectorProps) {
  const goals = Object.values(STRATEGY_GOALS)
  const primaryData = STRATEGY_GOALS[primaryGoal]

  const handlePrimarySelect = (key: StrategyGoalKey) => {
    const goal = STRATEGY_GOALS[key]
    const newSecondary = secondaryGoal === key ? null : (secondaryGoal ?? null)
    onChange(key, newSecondary, goal.suggestedChannels)
  }

  const handleSecondarySelect = (key: StrategyGoalKey) => {
    if (key === primaryGoal) return
    const next = secondaryGoal === key ? null : key
    onChange(primaryGoal, next, preferredChannels)
  }

  const toggleChannel = (ch: string) => {
    const next = preferredChannels.includes(ch)
      ? preferredChannels.filter((c) => c !== ch)
      : [...preferredChannels, ch]
    onChange(primaryGoal, secondaryGoal ?? null, next)
  }

  return (
    <div className="space-y-5">
      {/* Primary goal */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">Primary Goal <span className="text-red-400">*</span></label>
        <div className="grid grid-cols-2 gap-2.5">
          {goals.map((goal) => (
            <motion.button
              key={goal.key}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handlePrimarySelect(goal.key)}
              className={cn(
                'relative p-3 rounded-xl border-2 text-left transition-all',
                primaryGoal === goal.key
                  ? 'border-purple-500 bg-purple-50 shadow-md'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              )}
            >
              {primaryGoal === goal.key && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              <div className="font-medium text-sm text-slate-900">{goal.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">{goal.description}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Secondary goal (optional) */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">Secondary Goal <span className="text-slate-400">(optional)</span></label>
        <div className="flex flex-wrap gap-2">
          {goals
            .filter((g) => g.key !== primaryGoal)
            .map((goal) => (
              <button
                key={goal.key}
                onClick={() => handleSecondarySelect(goal.key)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs border transition-all',
                  secondaryGoal === goal.key
                    ? 'bg-purple-100 border-purple-300 text-purple-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                )}
              >
                {goal.name}
              </button>
            ))}
        </div>
      </div>

      {/* Suggested channels */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">Preferred Channels</label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(CHANNEL_ICONS).map(([ch, icon]) => {
            const isSuggested = primaryData?.suggestedChannels.includes(ch)
            return (
              <button
                key={ch}
                onClick={() => toggleChannel(ch)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all',
                  preferredChannels.includes(ch)
                    ? 'bg-purple-100 border-purple-300 text-purple-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300',
                  isSuggested && !preferredChannels.includes(ch) && 'border-purple-200'
                )}
              >
                <span>{icon}</span>
                <span className="capitalize">{ch}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* CTA style preview */}
      {primaryData && (
        <div className="p-3 bg-slate-50 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">Suggested CTA style</div>
          <div className="text-sm text-slate-700 font-medium">{primaryData.ctaStyle}</div>
        </div>
      )}
    </div>
  )
}
