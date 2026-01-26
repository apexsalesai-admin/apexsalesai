'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, Check, Info } from 'lucide-react'
import { toast } from '@/components/ui/toaster'

interface BrandVoice {
  brandName: string
  tone: string
  forbiddenPhrases: string
  ctaStyle: string
  targetAudience: string
  industryContext: string
}

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', description: 'Formal, authoritative, expert' },
  { value: 'conversational', label: 'Conversational', description: 'Friendly, approachable, casual' },
  { value: 'bold', label: 'Bold & Direct', description: 'Confident, assertive, action-oriented' },
  { value: 'empathetic', label: 'Empathetic', description: 'Understanding, supportive, warm' },
  { value: 'educational', label: 'Educational', description: 'Informative, clear, teaching-focused' },
  { value: 'inspirational', label: 'Inspirational', description: 'Motivating, uplifting, visionary' },
]

const CTA_STYLES = [
  { value: 'direct', label: 'Direct', example: 'Get started now' },
  { value: 'soft', label: 'Soft', example: 'Learn more' },
  { value: 'question', label: 'Question', example: 'Ready to transform your business?' },
  { value: 'benefit', label: 'Benefit-focused', example: 'Unlock 2x productivity' },
  { value: 'urgency', label: 'Urgency', example: 'Limited spots available' },
]

const STORAGE_KEY = 'lyfye-brand-voice'

export default function BrandVoiceSettingsPage() {
  const [settings, setSettings] = useState<BrandVoice>({
    brandName: '',
    tone: 'professional',
    forbiddenPhrases: '',
    ctaStyle: 'direct',
    targetAudience: '',
    industryContext: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setSettings(parsed)
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

    // TODO: Save to database when available
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

        {/* Tone */}
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Voice & Tone</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TONE_OPTIONS.map((tone) => (
              <button
                key={tone.value}
                onClick={() => updateField('tone', tone.value)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  settings.tone === tone.value
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-slate-200 hover:border-purple-300 hover:bg-slate-50'
                }`}
              >
                <p className="font-medium text-slate-900">{tone.label}</p>
                <p className="text-xs text-slate-500 mt-1">{tone.description}</p>
              </button>
            ))}
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
                  <p className="text-sm text-slate-500">Example: "{cta.example}"</p>
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
