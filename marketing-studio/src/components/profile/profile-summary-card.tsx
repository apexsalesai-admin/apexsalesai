'use client'

import { Pencil, Trash2, ArrowRightLeft, Shield, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VOICE_PRESETS, INDUSTRY_OPTIONS, STRATEGY_GOALS, type CreatorProfile } from '@/lib/studio/creator-profile'

interface ProfileSummaryCardProps {
  profile: CreatorProfile
  mode: 'settings' | 'content-creator' | 'onboarding'
  isActive?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onSwitch?: () => void
}

export function ProfileSummaryCard({
  profile,
  mode,
  isActive,
  onEdit,
  onDelete,
  onSwitch,
}: ProfileSummaryCardProps) {
  const voice = VOICE_PRESETS[profile.voicePreset]
  const industry = INDUSTRY_OPTIONS[profile.industry]
  const goal = STRATEGY_GOALS[profile.primaryGoal]

  return (
    <div
      className={cn(
        'relative p-4 rounded-xl border-2 bg-white transition-all',
        isActive ? 'border-purple-500 shadow-md' : 'border-slate-200'
      )}
    >
      {/* Active badge */}
      {isActive && (
        <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-purple-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wide">
          Active
        </div>
      )}

      {/* Default badge */}
      {profile.isDefault && (
        <div className="absolute -top-2.5 right-4 px-2 py-0.5 bg-slate-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wide">
          Default
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 text-sm truncate">{profile.name}</h3>
          {profile.role && profile.company && (
            <div className="text-xs text-slate-500 mt-0.5">{profile.role} at {profile.company}</div>
          )}
        </div>

        {/* Action buttons */}
        {mode === 'settings' && (
          <div className="flex gap-1 shrink-0">
            {onEdit && (
              <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
        {mode === 'content-creator' && onSwitch && (
          <button
            onClick={onSwitch}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-600 text-xs font-medium hover:bg-purple-100 transition-colors"
          >
            <ArrowRightLeft className="w-3 h-3" />
            Switch
          </button>
        )}
      </div>

      {/* Details row */}
      <div className="flex flex-wrap gap-2 mt-3">
        {voice && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-medium">
            {voice.name}
          </span>
        )}
        {industry && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium">
            {industry.icon} {industry.name}
            {industry.regulated && <Shield className="w-2.5 h-2.5" />}
          </span>
        )}
        {goal && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-medium">
            {goal.name}
          </span>
        )}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 text-[10px] font-medium">
          {profile.audienceRole}
        </span>
        <span className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
          profile.factCheckSensitivity === 'high' ? 'bg-red-50 text-red-700' :
          profile.factCheckSensitivity === 'medium' ? 'bg-amber-50 text-amber-700' :
          'bg-slate-50 text-slate-600'
        )}>
          <CheckCircle2 className="w-2.5 h-2.5" />
          Fact-check: {profile.factCheckSensitivity}
        </span>
      </div>

      {/* Channel icons */}
      {profile.preferredChannels.length > 0 && (
        <div className="flex gap-1.5 mt-2 text-xs text-slate-400">
          {profile.preferredChannels.map((ch) => (
            <span key={ch} className="capitalize">{ch}</span>
          ))}
        </div>
      )}
    </div>
  )
}
