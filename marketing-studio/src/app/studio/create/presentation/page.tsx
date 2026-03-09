'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Presentation, Sparkles, Loader2, Check } from 'lucide-react'
import { CreationWorkspace, type WorkspaceStep } from '@/components/studio/creation-workspace'
import { saveGeneratedAsset, redirectAfterSave } from '@/lib/studio/save-generated-asset'
import { cn } from '@/lib/utils'

const STEPS: WorkspaceStep[] = [
  { label: 'Topic' },
  { label: 'Outline' },
  { label: 'Generate' },
  { label: 'Edit' },
  { label: 'Save' },
]

const FORMATS = [
  { id: 'pitch', label: 'Pitch Deck', description: 'Investor or sales pitch' },
  { id: 'report', label: 'Report', description: 'Quarterly review, analysis' },
  { id: 'training', label: 'Training', description: 'Internal education' },
  { id: 'keynote', label: 'Keynote', description: 'Conference or event talk' },
]

interface AngleCard {
  id: string
  title: string
  description: string
  rationale: string
  sources: { title: string; url: string; snippet: string }[]
}

export default function CreatePresentationPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  // Step 0: Topic
  const [topic, setTopic] = useState('')
  const [format, setFormat] = useState('pitch')
  const [audience, setAudience] = useState('')

  // Step 1: Outline
  const [isResearching, setIsResearching] = useState(false)
  const [outlines, setOutlines] = useState<AngleCard[]>([])
  const [selectedOutline, setSelectedOutline] = useState<AngleCard | null>(null)

  // Step 2: Generate
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState('')

  // Step 3: Edit
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
          topic: `${format} presentation: ${topic}`,
          channels: ['LINKEDIN'],
          contentType: 'article',
          goal: `${format} presentation for ${audience || 'business audience'}`,
        }),
      })

      if (!res.ok) throw new Error('Research failed')
      const data = await res.json()
      if (!data.success || !data.angles?.length) throw new Error('No outlines generated')
      setOutlines(data.angles)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Outline generation failed')
    } finally {
      setIsResearching(false)
    }
  }, [topic, format, audience])

  const handleGenerate = useCallback(async () => {
    if (!selectedOutline) return
    setIsGenerating(true)
    setError('')

    try {
      // Generate a comprehensive slide outline using article structure
      const sectionDefs = [
        { type: 'headline', title: 'Title & Opening Slides' },
        { type: 'body', title: 'Core Slides' },
        { type: 'conclusion', title: 'Closing & CTA Slides' },
      ]

      const previousSections: { type: string; content: string }[] = []
      const parts: string[] = []

      for (const sectionDef of sectionDefs) {
        const res = await fetch('/api/studio/mia/generate-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: `${format} presentation: ${topic}`,
            contentType: 'article',
            sectionType: sectionDef.type,
            channels: ['LINKEDIN'],
            angle: {
              id: selectedOutline.id,
              title: selectedOutline.title,
              description: selectedOutline.description,
              rationale: selectedOutline.rationale,
              sources: selectedOutline.sources || [],
            },
            previousSections,
            rejectedVersions: [],
            goal: `Generate a ${format} presentation outline with slide-by-slide content. Each slide should have a title and 3-4 bullet points. Target ${audience || 'business audience'}.`,
          }),
        })

        if (!res.ok) throw new Error(`Failed to generate ${sectionDef.title}`)
        const data = await res.json()
        const content = data.content || ''
        previousSections.push({ type: sectionDef.type, content })
        parts.push(content)
      }

      setGeneratedContent(parts.join('\n\n'))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }, [selectedOutline, topic, format, audience])

  const handleRefine = useCallback(async (instruction: string) => {
    if (!selectedOutline) return
    setIsRefining(true)
    setError('')

    try {
      const res = await fetch('/api/studio/mia/generate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revise',
          sectionType: 'body',
          existingContent: generatedContent,
          userDirection: instruction,
          topic: `${format} presentation: ${topic}`,
          angle: { title: selectedOutline.title, description: selectedOutline.description },
          channels: ['LINKEDIN'],
          contentType: 'article',
          goal: `${format} presentation for ${audience || 'business audience'}`,
        }),
      })

      if (!res.ok) throw new Error('Refinement failed')
      const data = await res.json()
      if (data.content) setGeneratedContent(data.content)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Refinement failed')
    } finally {
      setIsRefining(false)
    }
  }, [selectedOutline, generatedContent, topic, format, audience])

  const handleSave = async () => {
    setIsSaving(true)
    setError('')

    const result = await saveGeneratedAsset({
      title: `${format.charAt(0).toUpperCase() + format.slice(1)}: ${topic}`,
      body: generatedContent,
      contentType: 'ARTICLE',
      aiTopic: topic,
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
      if (selectedOutline) {
        setStep(2)
        await handleGenerate()
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
      case 1: return selectedOutline !== null
      case 2: return generatedContent.length > 0
      case 3: return generatedContent.length > 0
      case 4: return generatedContent.length > 0
      default: return false
    }
  }

  return (
    <CreationWorkspace
      title="Create Presentation"
      subtitle="Build slide decks, pitch presentations, and reports"
      icon={Presentation}
      iconColor="bg-indigo-500"
      steps={STEPS}
      currentStep={step}
      onBack={handleBack}
      onNext={handleNext}
      canGoNext={canGoNext()}
      isProcessing={isResearching || isGenerating || isRefining || isSaving}
      processingLabel={
        isResearching ? 'Mia is creating outlines...' :
        isGenerating ? 'Mia is building slides...' :
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
              Presentation topic
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Q1 2026 Revenue Growth Strategy"
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="p-6 bg-white rounded-xl border border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-3">Format</label>
              <div className="space-y-2">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={cn(
                      'w-full p-3 rounded-lg border text-left transition-colors',
                      format === f.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <span className="block text-sm font-medium text-slate-900">{f.label}</span>
                    <span className="block text-xs text-slate-500">{f.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 bg-white rounded-xl border border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Target audience (optional)
              </label>
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g., C-suite executives, investors"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: Outline */}
      {step === 1 && (
        <div className="space-y-6">
          {isResearching && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mr-3" />
              <span className="text-slate-600">Mia is creating presentation outlines...</span>
            </div>
          )}

          {!isResearching && outlines.length > 0 && (
            <>
              <p className="text-sm text-slate-600">Choose an outline approach:</p>
              <div className="space-y-4">
                {outlines.map((outline) => (
                  <button
                    key={outline.id}
                    onClick={() => setSelectedOutline(outline)}
                    className={cn(
                      'w-full p-6 rounded-xl border text-left transition-all',
                      selectedOutline?.id === outline.id
                        ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-slate-900 mb-1">{outline.title}</h3>
                        <p className="text-sm text-slate-600 mb-2">{outline.description}</p>
                        <p className="text-xs text-slate-500 italic">{outline.rationale}</p>
                      </div>
                      {selectedOutline?.id === outline.id && (
                        <Check className="w-5 h-5 text-indigo-500 flex-shrink-0 ml-3" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 2: Generate */}
      {step === 2 && (
        <div className="space-y-6">
          {isGenerating && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mr-3" />
              <span className="text-slate-600">Mia is building your presentation...</span>
            </div>
          )}

          {!isGenerating && generatedContent && (
            <div className="p-6 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-medium text-slate-700">Slide content generated</h3>
              </div>
              <div className="text-sm text-slate-600 whitespace-pre-wrap">{generatedContent}</div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Edit */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-700">Edit your presentation</h3>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span className="text-xs text-slate-500">Ask Mia:</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {['More concise', 'Add data points', 'Simpler language', 'More slides', 'Add transitions'].map((instruction) => (
                <button
                  key={instruction}
                  onClick={() => handleRefine(instruction)}
                  disabled={isRefining}
                  className="px-3 py-1.5 text-xs font-medium border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 disabled:opacity-50"
                >
                  {instruction}
                </button>
              ))}
            </div>

            <textarea
              value={generatedContent}
              onChange={(e) => setGeneratedContent(e.target.value)}
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
            <h3 className="text-sm font-medium text-slate-700 mb-3">Presentation preview</h3>
            <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap">
              {generatedContent}
            </div>
          </div>
        </div>
      )}
    </CreationWorkspace>
  )
}
