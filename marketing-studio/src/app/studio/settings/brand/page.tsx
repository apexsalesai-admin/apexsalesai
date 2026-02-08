'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, Check, Info } from 'lucide-react'
import { toast } from '@/components/ui/toaster'

interface BrandVoice {
  brandName: string
  tones: string[]
  forbiddenPhrases: string
  ctaStyle: string
  targetAudience: string
  industryContext: string
  industry: string
}

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', description: 'Formal, authoritative, expert' },
  { value: 'conversational', label: 'Conversational', description: 'Friendly, approachable, casual' },
  { value: 'bold', label: 'Bold & Direct', description: 'Confident, assertive, action-oriented' },
  { value: 'empathetic', label: 'Empathetic', description: 'Understanding, supportive, warm' },
  { value: 'educational', label: 'Educational', description: 'Informative, clear, teaching-focused' },
  { value: 'inspirational', label: 'Inspirational', description: 'Motivating, uplifting, visionary' },
  { value: 'witty', label: 'Witty', description: 'Clever, humorous, sharp' },
  { value: 'factual', label: 'Factual', description: 'Data-driven, precise, evidence-based' },
  { value: 'technical', label: 'Technical', description: 'Detailed, domain-specific, expert-level' },
  { value: 'casual', label: 'Casual', description: 'Relaxed, informal, everyday tone' },
  { value: 'authoritative', label: 'Authoritative', description: 'Commanding, definitive, trustworthy' },
  { value: 'analytical', label: 'Analytical', description: 'Logical, structured, breakdown-oriented' },
  { value: 'entertaining', label: 'Entertaining', description: 'Engaging, fun, story-driven' },
  { value: 'compassionate', label: 'Compassionate', description: 'Caring, gentle, human-centered' },
]

const CTA_STYLES = [
  { value: 'direct', label: 'Direct', example: 'Get started now' },
  { value: 'soft', label: 'Soft', example: 'Learn more' },
  { value: 'question', label: 'Question', example: 'Ready to transform your business?' },
  { value: 'benefit', label: 'Benefit-focused', example: 'Unlock 2x productivity' },
  { value: 'urgency', label: 'Urgency', example: 'Limited spots available' },
]

const INDUSTRY_PRESETS: Record<string, { label: string; defaultTones: string[]; audience: string }> = {
  saas: {
    label: 'SaaS / Software',
    defaultTones: ['professional', 'educational'],
    audience: 'B2B decision-makers, CTOs, product managers, and engineering leaders evaluating software solutions',
  },
  fintech: {
    label: 'FinTech / Finance',
    defaultTones: ['authoritative', 'factual'],
    audience: 'CFOs, financial analysts, compliance officers, and fintech-savvy business leaders',
  },
  healthcare: {
    label: 'Healthcare / MedTech',
    defaultTones: ['compassionate', 'factual'],
    audience: 'Healthcare administrators, clinicians, medical device evaluators, and health-system CIOs',
  },
  ecommerce: {
    label: 'E-Commerce / Retail',
    defaultTones: ['conversational', 'entertaining'],
    audience: 'Online shoppers, brand-conscious consumers, and e-commerce business owners',
  },
  consulting: {
    label: 'Consulting / Professional Services',
    defaultTones: ['authoritative', 'analytical'],
    audience: 'C-suite executives, board members, and senior managers seeking strategic advisory',
  },
  education: {
    label: 'Education / EdTech',
    defaultTones: ['educational', 'inspirational'],
    audience: 'Educators, school administrators, L&D professionals, and lifelong learners',
  },
  creative: {
    label: 'Creative / Agency',
    defaultTones: ['bold', 'witty'],
    audience: 'Marketing directors, brand managers, and creative professionals seeking innovative ideas',
  },
  cybersecurity: {
    label: 'Cybersecurity',
    defaultTones: ['technical', 'authoritative'],
    audience: 'CISOs, security engineers, IT directors, and compliance teams protecting enterprise infrastructure',
  },
  sustainability: {
    label: 'Sustainability / CleanTech',
    defaultTones: ['inspirational', 'factual'],
    audience: 'Sustainability officers, impact investors, environmentally conscious business leaders',
  },
}

const MAX_TONES = 3
const STORAGE_KEY = 'lyfye-brand-voice'

export default function BrandVoiceSettingsPage() {
  const [settings, setSettings] = useState<BrandVoice>({
    brandName: '',
    tones: ['professional'],
    forbiddenPhrases: '',
    ctaStyle: 'direct',
    targetAudience: '',
    industryContext: '',
    industry: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load settings from localStorage on mount (backward-compatible)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Backward compat: old format had single `tone` string
        const tones = parsed.tones
          ? parsed.tones
          : parsed.tone
            ? [parsed.tone]
            : ['professional']
        setSettings({
          brandName: parsed.brandName || '',
          tones,
          forbiddenPhrases: parsed.forbiddenPhrases || '',
          ctaStyle: parsed.ctaStyle || 'direct',
          targetAudience: parsed.targetAudience || '',
          industryContext: parsed.industryContext || '',
          industry: parsed.industry || '',
        })
      } catch (e) {
        console.error('Failed to parse stored brand voice:', e)
      }
    }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))

    // TODO: Save to database when workspace context is available
    // await fetch('/api/settings/brand', {
    //   method: 'POST',
    //   body: JSON.stringify(settings),
    // })

    // Simulate API delay
    await new Promise((r) => setTimeout(r, 500))

    setSaving(false)
    setSaved(true)
    toast.success('Brand voice saved', {
      description: 'Your settings will be applied to all generated content',
    })

    // Reset saved indicator after 3 seconds
    setTimeout(() => setSaved(false), 3000)
  }

  const updateField = <K extends keyof BrandVoice>(field: K, value: BrandVoice[K]) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const toggleTone = (toneValue: string) => {
    setSettings((prev) => {
      const current = prev.tones
      if (current.includes(toneValue)) {
        // Don't allow deselecting the last tone
        if (current.length <= 1) return prev
        return { ...prev, tones: current.filter((t) => t !== toneValue) }
      }
      // Don't allow more than MAX_TONES
      if (current.length >= MAX_TONES) return prev
      return { ...prev, tones: [...current, toneValue] }
    })
    setSaved(false)
  }

  const applyIndustryPreset = (industryKey: string) => {
    const preset = INDUSTRY_PRESETS[industryKey]
    if (!preset) return

    setSettings((prev) => ({
      ...prev,
      industry: industryKey,
      tones: preset.defaultTones,
      targetAudience: prev.targetAudience || preset.audience,
    }))
    setSaved(false)
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/studio/settings"
          className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Settings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Brand Voice</h1>
            <p className="text-slate-600 mt-1">
              Define your brand's tone and style for AI-generated content
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Brand Name */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Brand Identity</h2>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Brand / Company Name
            </label>
            <input
              type="text"
              value={settings.brandName}
              onChange={(e) => updateField('brandName', e.target.value)}
              placeholder="e.g., Acme Corp"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Used to personalize content and maintain brand consistency
            </p>
          </div>
        </section>

        {/* Industry / Role Selector */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-1">Industry</h2>
          <p className="text-sm text-slate-500 mb-4">
            Select your industry for smart tone defaults and audience suggestions
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(INDUSTRY_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => applyIndustryPreset(key)}
                className={`p-3 rounded-lg border-2 text-left transition-all text-sm ${
                  settings.industry === key
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                }`}
              >
                <p className="font-medium text-slate-900">{preset.label}</p>
              </button>
            ))}
          </div>
          {settings.industry && INDUSTRY_PRESETS[settings.industry] && (
            <p className="text-xs text-purple-600 mt-3">
              Defaults applied: {INDUSTRY_PRESETS[settings.industry].defaultTones
                .map((t) => TONE_OPTIONS.find((o) => o.value === t)?.label || t)
                .join(', ')}
            </p>
          )}
        </section>

        {/* Voice & Tone (multi-select) */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-slate-900">Voice & Tone</h2>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              settings.tones.length >= MAX_TONES
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {settings.tones.length}/{MAX_TONES} selected
            </span>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Choose 1-3 tones that define your brand voice
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TONE_OPTIONS.map((tone) => {
              const isSelected = settings.tones.includes(tone.value)
              const isDisabled = !isSelected && settings.tones.length >= MAX_TONES
              return (
                <button
                  key={tone.value}
                  onClick={() => toggleTone(tone.value)}
                  disabled={isDisabled}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50'
                      : isDisabled
                        ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                        : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900">{tone.label}</p>
                    {isSelected && <Check className="w-4 h-4 text-purple-600 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{tone.description}</p>
                </button>
              )
            })}
          </div>
        </section>

        {/* CTA Style */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Call-to-Action Style</h2>
          <div className="space-y-2">
            {CTA_STYLES.map((cta) => (
              <button
                key={cta.value}
                onClick={() => updateField('ctaStyle', cta.value)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all flex items-center justify-between ${
                  settings.ctaStyle === cta.value
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-slate-200 hover:border-purple-300'
                }`}
              >
                <div>
                  <p className="font-medium text-slate-900">{cta.label}</p>
                  <p className="text-sm text-slate-500">Example: &quot;{cta.example}&quot;</p>
                </div>
                {settings.ctaStyle === cta.value && (
                  <Check className="w-5 h-5 text-purple-600" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Target Audience */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Target Audience (ICP)</h2>
          <div>
            <textarea
              value={settings.targetAudience}
              onChange={(e) => updateField('targetAudience', e.target.value)}
              placeholder="e.g., B2B SaaS founders, Series A-C, 50-200 employees, focused on growth and efficiency"
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Describe your ideal customer profile. This helps Mia tailor content to resonate with your audience.
            </p>
          </div>
        </section>

        {/* Industry Context */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Industry Context</h2>
          <div>
            <textarea
              value={settings.industryContext}
              onChange={(e) => updateField('industryContext', e.target.value)}
              placeholder="e.g., Enterprise software, AI/ML, cybersecurity. Competitors: Acme, BigCorp. Key trends: AI automation, compliance requirements."
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
            />
          </div>
        </section>

        {/* Forbidden Phrases */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Forbidden Phrases</h2>
          <div>
            <textarea
              value={settings.forbiddenPhrases}
              onChange={(e) => updateField('forbiddenPhrases', e.target.value)}
              placeholder="e.g., game-changer, synergy, leverage, disrupt, revolutionary, cutting-edge"
              rows={3}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none resize-none"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Comma-separated list of words or phrases that should never appear in your content
            </p>
          </div>
        </section>

        {/* Info box */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 font-medium">How this is used</p>
            <p className="text-sm text-blue-700 mt-1">
              These settings are automatically applied when generating content with Mia.
              Your brand voice influences hooks, body copy, CTAs, and overall messaging style.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
