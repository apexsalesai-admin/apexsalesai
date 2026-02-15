'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Sparkles, Check, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VoiceSelector } from './voice-selector'
import { IndustrySelector } from './industry-selector'
import { StrategySelector } from './strategy-selector'
import { ProfileSummaryCard } from './profile-summary-card'
import {
  createDefaultProfile,
  INDUSTRY_OPTIONS,
  type CreatorProfile,
  type VoicePresetKey,
  type IndustryKey,
  type StrategyGoalKey,
} from '@/lib/studio/creator-profile'

interface OnboardingProps {
  userId: string
  onComplete: (profile: CreatorProfile) => void
  onSkip: () => void
}

const STEPS = [
  { key: 'role', title: 'What do you do?', mia: "Let's start with the basics — tell me about your role and company." },
  { key: 'industry', title: 'Your industry', mia: 'What industry are you in? This helps me tailor content for compliance and audience expectations.' },
  { key: 'audience', title: 'Your audience', mia: "Who are you writing for? Understanding your audience helps me hit the right tone." },
  { key: 'voice', title: 'Your voice', mia: 'How do you want to sound? Pick a preset or build your own custom voice.' },
  { key: 'strategy', title: 'Your strategy', mia: "Last one — what's your content goal? I'll suggest the best channels and content mix." },
]

export function CreatorProfileOnboarding({ userId, onComplete, onSkip }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const defaults = createDefaultProfile(userId)
  const [draft, setDraft] = useState(defaults)

  const canAdvance = useCallback(() => {
    switch (step) {
      case 0: return true // role/company optional
      case 1: return !!draft.industry
      case 2: return !!draft.audienceRole
      case 3: return !!draft.voicePreset
      case 4: return !!draft.primaryGoal
      default: return true
    }
  }, [step, draft])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/studio/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const data = await res.json()
      if (data.profile) {
        onComplete(data.profile)
      }
    } catch (error) {
      console.error('Failed to save profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const isSummary = step === STEPS.length

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-slate-400 mb-2">
          <span>Step {Math.min(step + 1, STEPS.length)} of {STEPS.length}</span>
          <button onClick={onSkip} className="flex items-center gap-1 text-slate-400 hover:text-slate-600 transition-colors">
            <SkipForward className="w-3 h-3" /> Set up later
          </button>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
            animate={{ width: `${((step + 1) / (STEPS.length + 1)) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Mia avatar + speech bubble */}
      {!isSummary && (
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-700 max-w-md">
            {STEPS[step]?.mia}
          </div>
        </div>
      )}

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Your Role</label>
                <input
                  type="text"
                  placeholder="e.g. VP of Marketing"
                  value={draft.role}
                  onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Company</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp"
                  value={draft.company}
                  onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Brand Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme"
                  value={draft.brandName}
                  onChange={(e) => setDraft((d) => ({ ...d, brandName: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Profile Name</label>
                <input
                  type="text"
                  placeholder="e.g. My Main Profile"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <IndustrySelector
              value={draft.industry as IndustryKey}
              audienceRole={draft.audienceRole}
              audienceSeniority={draft.audienceSeniority}
              onChange={(industry, audienceRole, audienceSeniority) => {
                const ind = INDUSTRY_OPTIONS[industry]
                setDraft((d) => ({
                  ...d,
                  industry,
                  audienceRole,
                  audienceSeniority,
                  complianceLevel: ind?.regulated ? 'light' : 'none',
                }))
              }}
            />
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Audience Role</label>
                <input
                  type="text"
                  value={draft.audienceRole}
                  onChange={(e) => setDraft((d) => ({ ...d, audienceRole: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Audience Seniority</label>
                <div className="flex flex-wrap gap-2">
                  {['IC', 'Senior IC', 'Manager', 'Director', 'VP', 'C-Suite', 'Owner', 'Founder'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setDraft((d) => ({ ...d, audienceSeniority: s }))}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs border transition-all',
                        draft.audienceSeniority === s
                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Fact-Check Sensitivity</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setDraft((d) => ({ ...d, factCheckSensitivity: level }))}
                      className={cn(
                        'px-4 py-2 rounded-lg border text-xs font-medium transition-all capitalize',
                        draft.factCheckSensitivity === level
                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <VoiceSelector
              value={draft.voicePreset as VoicePresetKey}
              customVoice={draft.voiceCustom}
              onChange={(preset, custom) => setDraft((d) => ({ ...d, voicePreset: preset, voiceCustom: custom ?? null }))}
            />
          )}

          {step === 4 && (
            <StrategySelector
              primaryGoal={draft.primaryGoal as StrategyGoalKey}
              secondaryGoal={draft.secondaryGoal as StrategyGoalKey | null}
              preferredChannels={draft.preferredChannels}
              onChange={(primary, secondary, channels) =>
                setDraft((d) => ({ ...d, primaryGoal: primary, secondaryGoal: secondary, preferredChannels: channels }))
              }
            />
          )}

          {/* Summary step */}
          {isSummary && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-700 max-w-md">
                  Here&apos;s your creator profile. Everything look good?
                </div>
              </div>
              <ProfileSummaryCard
                profile={{ ...draft, id: 'preview', createdAt: '', updatedAt: '' } as CreatorProfile}
                mode="onboarding"
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between mt-8 pt-4 border-t">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            step === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-100'
          )}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {isSummary ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Check className="w-4 h-4" /> Looks good!
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance()}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-all',
              canAdvance()
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            )}
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
