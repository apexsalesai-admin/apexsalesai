'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, Sparkles, Loader2, Check } from 'lucide-react'
import { CreationWorkspace, type WorkspaceStep } from '@/components/studio/creation-workspace'
import { saveGeneratedAsset, redirectAfterSave } from '@/lib/studio/save-generated-asset'
import { cn } from '@/lib/utils'

const STEPS: WorkspaceStep[] = [
  { label: 'Topic' },
  { label: 'Research' },
  { label: 'Draft' },
  { label: 'Edit' },
  { label: 'Save' },
]

const TONES = ['Professional', 'Conversational', 'Authoritative', 'Friendly', 'Technical']
const AUDIENCES = ['Business leaders', 'Marketers', 'Developers', 'Entrepreneurs', 'General audience']

interface AngleCard {
  id: string
  title: string
  description: string
  rationale: string
  sources: { title: string; url: string; snippet: string }[]
}

interface GeneratedSection {
  type: string
  title: string
  content: string
  loading: boolean
}

export default function CreateArticlePage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  // Step 0: Topic
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('Professional')
  const [audience, setAudience] = useState('Business leaders')

  // Step 1: Research
  const [isResearching, setIsResearching] = useState(false)
  const [angles, setAngles] = useState<AngleCard[]>([])
  const [selectedAngle, setSelectedAngle] = useState<AngleCard | null>(null)

  // Step 2: Draft
  const [sections, setSections] = useState<GeneratedSection[]>([])
  const [isDrafting, setIsDrafting] = useState(false)

  // Step 3: Edit
  const [assembledArticle, setAssembledArticle] = useState('')
  const [isRefining, setIsRefining] = useState(false)

  // Step 4: Save
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const handleResearch = useCallback(async () => {
    setIsResearching(true)
    setError('')

    try {
      const res = await fetch('/api/studio/mia/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          channels: ['LINKEDIN'],
          contentType: 'article',
          goal: `${tone} article for ${audience}`,
        }),
      })

      if (!res.ok) throw new Error('Research failed')
      const data = await res.json()

      if (!data.success || !data.angles?.length) throw new Error('No angles generated')
      setAngles(data.angles)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Research failed')
    } finally {
      setIsResearching(false)
    }
  }, [topic, tone, audience])

  const handleDraft = useCallback(async () => {
    if (!selectedAngle) return
    setIsDrafting(true)
    setError('')

    const sectionDefs = [
      { type: 'headline', title: 'Headline & Introduction' },
      { type: 'body', title: 'Key Arguments & Evidence' },
      { type: 'conclusion', title: 'Conclusion & Call to Action' },
    ]

    const newSections: GeneratedSection[] = sectionDefs.map(s => ({
      type: s.type,
      title: s.title,
      content: '',
      loading: true,
    }))
    setSections(newSections)

    try {
      const previousSections: { type: string; content: string }[] = []

      for (let i = 0; i < sectionDefs.length; i++) {
        const res = await fetch('/api/studio/mia/generate-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            contentType: 'article',
            sectionType: sectionDefs[i].type,
            channels: ['LINKEDIN'],
            angle: {
              id: selectedAngle.id,
              title: selectedAngle.title,
              description: selectedAngle.description,
              rationale: selectedAngle.rationale,
              sources: selectedAngle.sources || [],
            },
            previousSections,
            rejectedVersions: [],
            goal: `${tone} article for ${audience}`,
          }),
        })

        if (!res.ok) throw new Error(`Failed to generate ${sectionDefs[i].title}`)
        const data = await res.json()

        const content = data.content || ''
        previousSections.push({ type: sectionDefs[i].type, content })

        setSections(prev => prev.map((s, idx) =>
          idx === i ? { ...s, content, loading: false } : s
        ))
      }

      // Assemble article
      const assembled = newSections.map((_, i) => previousSections[i]?.content || '').join('\n\n')
      setAssembledArticle(assembled)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Draft generation failed')
    } finally {
      setIsDrafting(false)
    }
  }, [selectedAngle, topic, tone, audience])

  const handleRefine = useCallback(async (instruction: string) => {
    if (!selectedAngle) return
    setIsRefining(true)
    setError('')

    try {
      const res = await fetch('/api/studio/mia/generate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revise',
          sectionType: 'body',
          existingContent: assembledArticle,
          userDirection: instruction,
          topic,
          angle: {
            id: selectedAngle.id,
            title: selectedAngle.title,
            description: selectedAngle.description,
            rationale: selectedAngle.rationale,
            sources: selectedAngle.sources || [],
          },
          channels: ['LINKEDIN'],
          contentType: 'article',
          goal: `${tone} article for ${audience}`,
        }),
      })

      if (!res.ok) throw new Error('Refinement failed')
      const data = await res.json()

      if (data.content) {
        setAssembledArticle(data.content)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Refinement failed')
    } finally {
      setIsRefining(false)
    }
  }, [selectedAngle, assembledArticle, topic, tone, audience])

  const handleSave = async () => {
    setIsSaving(true)
    setError('')

    const firstLine = assembledArticle.split('\n')[0]?.trim() || topic

    const result = await saveGeneratedAsset({
      title: firstLine,
      body: assembledArticle,
      contentType: 'ARTICLE',
      aiTopic: topic,
      aiTone: tone.toUpperCase(),
    })

    if (result.success) {
      redirectAfterSave(router, result.contentId)
    } else {
      setError(result.error || 'Save failed')
    }
    setIsSaving(false)
  }

  const handleNext = async () => {
    if (step === 0) {
      setStep(1)
      await handleResearch()
    } else if (step === 1) {
      if (selectedAngle) {
        setStep(2)
        await handleDraft()
      }
    } else if (step === 2) {
      setStep(3)
    } else if (step === 3) {
      setStep(4)
    } else if (step === 4) {
      await handleSave()
    }
  }

  const handleBack = () => {
    if (step === 0) {
      router.push('/studio/create')
    } else {
      setStep(step - 1)
    }
  }

  const canGoNext = () => {
    switch (step) {
      case 0: return topic.trim().length > 0
      case 1: return selectedAngle !== null
      case 2: return sections.every(s => !s.loading && s.content.length > 0)
      case 3: return assembledArticle.trim().length > 0
      case 4: return assembledArticle.trim().length > 0
      default: return false
    }
  }

  return (
    <CreationWorkspace
      title="Create Article"
      subtitle="Write long-form thought leadership, blog posts, and reports"
      icon={BookOpen}
      iconColor="bg-emerald-500"
      steps={STEPS}
      currentStep={step}
      onBack={handleBack}
      onNext={handleNext}
      canGoNext={canGoNext()}
      isProcessing={isResearching || isDrafting || isRefining || isSaving}
      processingLabel={
        isResearching ? 'Mia is researching...' :
        isDrafting ? 'Mia is drafting...' :
        isRefining ? 'Mia is refining...' :
        isSaving ? 'Saving...' : undefined
      }
    >
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* STEP 0: Topic */}
      {step === 0 && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              What do you want to write about?
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., How AI is transforming B2B sales in 2026"
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="p-6 bg-white rounded-xl border border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-3">Tone</label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                      tone === t
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 bg-white rounded-xl border border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-3">Target Audience</label>
              <div className="flex flex-wrap gap-2">
                {AUDIENCES.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAudience(a)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                      audience === a
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: Research */}
      {step === 1 && (
        <div className="space-y-6">
          {isResearching && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mr-3" />
              <span className="text-slate-600">Mia is researching article angles...</span>
            </div>
          )}

          {!isResearching && angles.length > 0 && (
            <>
              <p className="text-sm text-slate-600">Choose an angle for your article:</p>
              <div className="space-y-4">
                {angles.map((angle) => (
                  <button
                    key={angle.id}
                    onClick={() => setSelectedAngle(angle)}
                    className={cn(
                      'w-full p-6 rounded-xl border text-left transition-all',
                      selectedAngle?.id === angle.id
                        ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-slate-900 mb-1">{angle.title}</h3>
                        <p className="text-sm text-slate-600 mb-2">{angle.description}</p>
                        <p className="text-xs text-slate-500 italic">{angle.rationale}</p>
                      </div>
                      {selectedAngle?.id === angle.id && (
                        <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 ml-3" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 2: Draft */}
      {step === 2 && (
        <div className="space-y-4">
          {sections.map((section, i) => (
            <div key={i} className="p-6 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                {section.loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                ) : (
                  <Check className="w-4 h-4 text-emerald-500" />
                )}
                <h3 className="text-sm font-medium text-slate-700">{section.title}</h3>
              </div>
              {section.loading ? (
                <div className="h-16 bg-slate-50 rounded-lg animate-pulse" />
              ) : (
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{section.content}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* STEP 3: Edit */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-700">Edit your article</h3>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-slate-500">Ask Mia to refine:</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {['Make shorter', 'Add statistics', 'Stronger opening', 'More conversational', 'Add subheadings'].map((instruction) => (
                <button
                  key={instruction}
                  onClick={() => handleRefine(instruction)}
                  disabled={isRefining}
                  className="px-3 py-1.5 text-xs font-medium border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-50 disabled:opacity-50"
                >
                  {instruction}
                </button>
              ))}
            </div>

            <textarea
              value={assembledArticle}
              onChange={(e) => setAssembledArticle(e.target.value)}
              rows={20}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm text-slate-900 font-mono resize-y"
            />
          </div>
        </div>
      )}

      {/* STEP 4: Save */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Article preview</h3>
            <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap">
              {assembledArticle}
            </div>
          </div>
        </div>
      )}
    </CreationWorkspace>
  )
}
