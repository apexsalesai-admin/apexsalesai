'use client'

import { useState } from 'react'
import { useOnboarding } from '@/hooks/use-onboarding'
import { ArrowLeft, ArrowRight, Plus, X, AlertTriangle } from 'lucide-react'
import type { OnboardingGuardrailsData } from '@/types'

const VOICE_TONE_OPTIONS = [
  'Professional',
  'Friendly',
  'Authoritative',
  'Casual',
  'Inspirational',
  'Educational',
  'Humorous',
  'Empathetic',
]

const CTA_STYLE_OPTIONS = [
  { value: 'action-oriented', label: 'Action-Oriented', example: 'Start your free trial today' },
  { value: 'soft-sell', label: 'Soft Sell', example: 'Learn more about our solution' },
  { value: 'value-focused', label: 'Value-Focused', example: 'See how teams save 10 hours/week' },
  { value: 'urgency', label: 'Urgency-Based', example: 'Limited time offer - Act now' },
]

export function Step2Guardrails() {
  const { steps, setGuardrailsData, nextStep, prevStep } = useOnboarding()

  const [data, setData] = useState<OnboardingGuardrailsData>({
    voiceTone: steps.guardrails?.voiceTone ?? [],
    bannedClaims: steps.guardrails?.bannedClaims ?? [],
    complianceRules: steps.guardrails?.complianceRules ?? [],
    doNotSayList: steps.guardrails?.doNotSayList ?? [],
    ctaStyle: steps.guardrails?.ctaStyle ?? null,
    ctaExamples: steps.guardrails?.ctaExamples ?? [],
  })

  const [newBannedClaim, setNewBannedClaim] = useState('')
  const [newComplianceRule, setNewComplianceRule] = useState('')
  const [newDoNotSay, setNewDoNotSay] = useState('')

  const toggleVoiceTone = (tone: string) => {
    setData(prev => ({
      ...prev,
      voiceTone: prev.voiceTone.includes(tone)
        ? prev.voiceTone.filter(t => t !== tone)
        : [...prev.voiceTone, tone],
    }))
  }

  const addItem = (
    field: 'bannedClaims' | 'complianceRules' | 'doNotSayList',
    value: string,
    setValue: (v: string) => void
  ) => {
    if (value.trim()) {
      setData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()],
      }))
      setValue('')
    }
  }

  const removeItem = (
    field: 'bannedClaims' | 'complianceRules' | 'doNotSayList',
    index: number
  ) => {
    setData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }))
  }

  const handleContinue = () => {
    setGuardrailsData(data)
    nextStep()
  }

  const handleBack = () => {
    setGuardrailsData(data)
    prevStep()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Brand Guardrails</h2>
        <p className="text-slate-600 mt-1">
          Define your brand voice, compliance rules, and content restrictions.
          These guardrails ensure AI-generated content stays on-brand.
        </p>
      </div>

      {/* Voice Tone */}
      <div className="space-y-3">
        <label className="label">Voice Tone (select all that apply)</label>
        <div className="flex flex-wrap gap-2">
          {VOICE_TONE_OPTIONS.map((tone) => (
            <button
              key={tone}
              onClick={() => toggleVoiceTone(tone)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                data.voiceTone.includes(tone)
                  ? 'bg-apex-primary text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tone}
            </button>
          ))}
        </div>
      </div>

      {/* CTA Style */}
      <div className="space-y-3">
        <label className="label">CTA Style</label>
        <div className="grid gap-3 sm:grid-cols-2">
          {CTA_STYLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setData(prev => ({ ...prev, ctaStyle: option.value }))}
              className={`text-left p-3 rounded-lg border transition-colors ${
                data.ctaStyle === option.value
                  ? 'border-apex-primary bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <p className="font-medium text-slate-900">{option.label}</p>
              <p className="text-sm text-slate-500 mt-1">e.g., &quot;{option.example}&quot;</p>
            </button>
          ))}
        </div>
      </div>

      {/* Banned Claims */}
      <div className="space-y-3">
        <label className="label flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Banned Claims</span>
        </label>
        <p className="text-sm text-slate-500">
          Claims that should never be made in content (e.g., &quot;guaranteed results&quot;, &quot;100% success rate&quot;)
        </p>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newBannedClaim}
            onChange={(e) => setNewBannedClaim(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem('bannedClaims', newBannedClaim, setNewBannedClaim)}
            placeholder="Add a banned claim..."
            className="input flex-1"
          />
          <button
            onClick={() => addItem('bannedClaims', newBannedClaim, setNewBannedClaim)}
            className="btn-secondary"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.bannedClaims.map((claim, index) => (
            <span
              key={index}
              className="inline-flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-800 rounded text-sm"
            >
              <span>{claim}</span>
              <button onClick={() => removeItem('bannedClaims', index)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Compliance Rules */}
      <div className="space-y-3">
        <label className="label">Compliance Rules</label>
        <p className="text-sm text-slate-500">
          Regulatory or legal requirements (e.g., &quot;Must include disclaimer for financial advice&quot;)
        </p>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newComplianceRule}
            onChange={(e) => setNewComplianceRule(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem('complianceRules', newComplianceRule, setNewComplianceRule)}
            placeholder="Add a compliance rule..."
            className="input flex-1"
          />
          <button
            onClick={() => addItem('complianceRules', newComplianceRule, setNewComplianceRule)}
            className="btn-secondary"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.complianceRules.map((rule, index) => (
            <span
              key={index}
              className="inline-flex items-center space-x-1 px-2 py-1 bg-amber-100 text-amber-800 rounded text-sm"
            >
              <span>{rule}</span>
              <button onClick={() => removeItem('complianceRules', index)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Do Not Say List */}
      <div className="space-y-3">
        <label className="label">Do Not Say List</label>
        <p className="text-sm text-slate-500">
          Words or phrases to avoid (e.g., competitor names, outdated terminology)
        </p>
        <div className="flex space-x-2">
          <input
            type="text"
            value={newDoNotSay}
            onChange={(e) => setNewDoNotSay(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem('doNotSayList', newDoNotSay, setNewDoNotSay)}
            placeholder="Add a word or phrase..."
            className="input flex-1"
          />
          <button
            onClick={() => addItem('doNotSayList', newDoNotSay, setNewDoNotSay)}
            className="btn-secondary"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.doNotSayList.map((item, index) => (
            <span
              key={index}
              className="inline-flex items-center space-x-1 px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm"
            >
              <span>{item}</span>
              <button onClick={() => removeItem('doNotSayList', index)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4 border-t">
        <button
          onClick={handleBack}
          className="btn-secondary flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button
          onClick={handleContinue}
          className="btn-primary flex items-center space-x-2"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
