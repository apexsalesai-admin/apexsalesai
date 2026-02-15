'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Sliders } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  VOICE_PRESETS,
  type VoicePresetKey,
  type VoicePreset,
} from '@/lib/studio/creator-profile'

interface VoiceSelectorProps {
  value: VoicePresetKey
  customVoice?: {
    tone: number
    persuasion: 'logic' | 'emotion' | 'authority' | 'scarcity'
    energy: number
    humor: number
    formality: number
  } | null
  onChange: (preset: VoicePresetKey, custom?: VoiceSelectorProps['customVoice']) => void
}

const PERSUASION_OPTIONS = [
  { value: 'logic' as const, label: 'Logic', description: 'Data & reasoning' },
  { value: 'emotion' as const, label: 'Emotion', description: 'Stories & feeling' },
  { value: 'authority' as const, label: 'Authority', description: 'Expertise & trust' },
  { value: 'scarcity' as const, label: 'Scarcity', description: 'Urgency & FOMO' },
]

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-slate-500 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function SliderInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-400">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-purple-500"
      />
    </div>
  )
}

function getPreviewSentence(custom: NonNullable<VoiceSelectorProps['customVoice']>): string {
  if (custom.energy > 70 && custom.humor > 50) return "Buckle up — this one's a banger and you're going to love it."
  if (custom.formality > 70 && custom.tone > 60) return 'Our analysis reveals a significant opportunity for strategic alignment in Q3.'
  if (custom.energy > 70) return "This changes everything. And the best part? You can start today."
  if (custom.humor > 50) return "Plot twist: your content strategy doesn't need to be boring."
  if (custom.formality > 60) return 'We recommend a structured approach to content distribution across key channels.'
  return "Here's what we've learned from working with hundreds of teams like yours."
}

export function VoiceSelector({ value, customVoice, onChange }: VoiceSelectorProps) {
  const [showCustom, setShowCustom] = useState(value === 'minimalist' && !!customVoice)
  const [custom, setCustom] = useState(
    customVoice || { tone: 60, persuasion: 'logic' as const, energy: 50, humor: 20, formality: 60 }
  )

  const presets = Object.values(VOICE_PRESETS)

  const handlePresetSelect = (key: VoicePresetKey) => {
    setShowCustom(false)
    onChange(key, null)
  }

  const handleCustomToggle = () => {
    setShowCustom(true)
    onChange(value, custom)
  }

  const handleCustomChange = (patch: Partial<typeof custom>) => {
    const updated = { ...custom, ...patch }
    setCustom(updated)
    onChange(value, updated)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {presets.map((preset) => (
          <motion.button
            key={preset.key}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handlePresetSelect(preset.key)}
            className={cn(
              'relative p-4 rounded-xl border-2 text-left transition-all',
              value === preset.key && !showCustom
                ? 'border-purple-500 bg-purple-50 shadow-md'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            )}
          >
            {value === preset.key && !showCustom && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
            <div className="font-semibold text-sm text-slate-900">{preset.name}</div>
            <div className="text-xs text-slate-500 mt-0.5">{preset.tagline}</div>
            <div className="mt-3 space-y-1">
              <ScoreBar label="Tone" value={preset.scores.tone} />
              <ScoreBar label="Energy" value={preset.scores.energy} />
            </div>
            <div className="mt-3 text-xs text-slate-400 italic leading-relaxed line-clamp-2">
              &ldquo;{preset.exampleOpener}&rdquo;
            </div>
          </motion.button>
        ))}

        {/* Custom voice card */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleCustomToggle}
          className={cn(
            'relative p-4 rounded-xl border-2 border-dashed text-left transition-all',
            showCustom
              ? 'border-purple-500 bg-purple-50 shadow-md'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50'
          )}
        >
          {showCustom && (
            <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}
          <Sliders className="w-5 h-5 text-purple-500 mb-2" />
          <div className="font-semibold text-sm text-slate-900">Custom</div>
          <div className="text-xs text-slate-500 mt-0.5">Fine-tune your voice with sliders</div>
        </motion.button>
      </div>

      {/* Custom sliders panel */}
      {showCustom && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="border rounded-xl p-5 bg-white space-y-4"
        >
          <SliderInput label="Tone (casual → formal)" value={custom.tone} onChange={(v) => handleCustomChange({ tone: v })} />
          <SliderInput label="Energy (calm → intense)" value={custom.energy} onChange={(v) => handleCustomChange({ energy: v })} />
          <SliderInput label="Humor (serious → playful)" value={custom.humor} onChange={(v) => handleCustomChange({ humor: v })} />
          <SliderInput label="Formality (relaxed → corporate)" value={custom.formality} onChange={(v) => handleCustomChange({ formality: v })} />

          <div className="space-y-2">
            <span className="text-xs text-slate-600">Persuasion style</span>
            <div className="grid grid-cols-2 gap-2">
              {PERSUASION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleCustomChange({ persuasion: opt.value })}
                  className={cn(
                    'p-2 rounded-lg border text-xs text-left transition-all',
                    custom.persuasion === opt.value
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  )}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-slate-400">{opt.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t">
            <div className="text-xs text-slate-500 mb-1">Preview</div>
            <div className="text-sm text-slate-700 italic">
              &ldquo;{getPreviewSentence(custom)}&rdquo;
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
