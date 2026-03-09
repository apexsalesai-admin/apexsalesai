'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Megaphone, Sparkles, Loader2, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { CreationWorkspace, type WorkspaceStep } from '@/components/studio/creation-workspace'
import { saveGeneratedAsset, redirectAfterSave } from '@/lib/studio/save-generated-asset'
import { cn } from '@/lib/utils'

const STEPS: WorkspaceStep[] = [
  { label: 'Goal' },
  { label: 'Strategy' },
  { label: 'Generate' },
  { label: 'Review' },
  { label: 'Save' },
]

const PLATFORMS = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'twitter', label: 'X / Twitter' },
  { id: 'email', label: 'Email' },
  { id: 'blog', label: 'Blog' },
]

interface AngleCard {
  id: string
  title: string
  description: string
  rationale: string
  sources: { title: string; url: string; snippet: string }[]
}

interface CampaignPiece {
  type: string
  title: string
  platform: string
  content: string
  loading: boolean
  expanded: boolean
}

export default function CreateCampaignPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  // Step 0: Goal
  const [objective, setObjective] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['linkedin', 'email'])

  // Step 1: Strategy
  const [isResearching, setIsResearching] = useState(false)
  const [strategies, setStrategies] = useState<AngleCard[]>([])
  const [selectedStrategy, setSelectedStrategy] = useState<AngleCard | null>(null)

  // Step 2: Generate
  const [pieces, setPieces] = useState<CampaignPiece[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  // Step 4: Save
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const handleResearch = useCallback(async () => {
    setIsResearching(true)
    setError('')

    try {
      const res = await fetch('/api/studio/mia/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: objective,
          channels: ['LINKEDIN'],
          contentType: 'campaign',
          goal: `Campaign for ${targetAudience} across ${selectedPlatforms.join(', ')}`,
        }),
      })

      if (!res.ok) throw new Error('Research failed')
      const data = await res.json()
      if (!data.success || !data.angles?.length) throw new Error('No strategies generated')
      setStrategies(data.angles)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Strategy research failed')
    } finally {
      setIsResearching(false)
    }
  }, [objective, targetAudience, selectedPlatforms])

  const handleGenerate = useCallback(async () => {
    if (!selectedStrategy) return
    setIsGenerating(true)
    setError('')

    const sectionDefs = [
      { type: 'strategy_overview', title: 'LinkedIn Post', platform: 'LinkedIn' },
      { type: 'channel_plan', title: 'X/Twitter Thread', platform: 'X' },
      { type: 'messaging_framework', title: 'Email Draft', platform: 'Email' },
      { type: 'body', title: 'Blog Summary', platform: 'Blog' },
    ]

    const newPieces: CampaignPiece[] = sectionDefs.map(s => ({
      type: s.type,
      title: s.title,
      platform: s.platform,
      content: '',
      loading: true,
      expanded: true,
    }))
    setPieces(newPieces)

    try {
      const previousSections: { type: string; content: string }[] = []

      for (let i = 0; i < sectionDefs.length; i++) {
        const res = await fetch('/api/studio/mia/generate-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: objective,
            contentType: 'campaign',
            sectionType: sectionDefs[i].type,
            channels: ['LINKEDIN'],
            angle: {
              id: selectedStrategy.id,
              title: selectedStrategy.title,
              description: selectedStrategy.description,
              rationale: selectedStrategy.rationale,
              sources: selectedStrategy.sources || [],
            },
            previousSections,
            rejectedVersions: [],
            goal: `Campaign for ${targetAudience}`,
          }),
        })

        if (!res.ok) throw new Error(`Failed to generate ${sectionDefs[i].title}`)
        const data = await res.json()

        const content = data.content || ''
        previousSections.push({ type: sectionDefs[i].type, content })

        setPieces(prev => prev.map((p, idx) =>
          idx === i ? { ...p, content, loading: false } : p
        ))
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setIsGenerating(false)
    }
  }, [selectedStrategy, objective, targetAudience])

  const toggleExpand = (index: number) => {
    setPieces(prev => prev.map((p, i) =>
      i === index ? { ...p, expanded: !p.expanded } : p
    ))
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError('')

    const allContent = pieces.map(p => `--- ${p.title} (${p.platform}) ---\n\n${p.content}`).join('\n\n\n')

    const result = await saveGeneratedAsset({
      title: `Campaign: ${objective}`,
      body: allContent,
      contentType: 'POST',
      aiTopic: objective,
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
      if (selectedStrategy) {
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
      case 0: return objective.trim().length > 0 && selectedPlatforms.length > 0
      case 1: return selectedStrategy !== null
      case 2: return pieces.every(p => !p.loading && p.content.length > 0)
      case 3: return pieces.some(p => p.content.length > 0)
      case 4: return pieces.some(p => p.content.length > 0)
      default: return false
    }
  }

  const PLATFORM_COLORS: Record<string, string> = {
    LinkedIn: 'bg-blue-100 text-blue-700',
    X: 'bg-slate-100 text-slate-700',
    Email: 'bg-amber-100 text-amber-700',
    Blog: 'bg-emerald-100 text-emerald-700',
  }

  return (
    <CreationWorkspace
      title="Create Campaign"
      subtitle="Generate a coordinated multi-channel content campaign"
      icon={Megaphone}
      iconColor="bg-purple-500"
      steps={STEPS}
      currentStep={step}
      onBack={handleBack}
      onNext={handleNext}
      canGoNext={canGoNext()}
      isProcessing={isResearching || isGenerating || isSaving}
      processingLabel={
        isResearching ? 'Mia is strategizing...' :
        isGenerating ? 'Mia is generating campaign assets...' :
        isSaving ? 'Saving...' : undefined
      }
    >
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* STEP 0: Goal */}
      {step === 0 && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Campaign objective
            </label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="e.g., Launch our new AI-powered analytics dashboard and drive 500 signups in 30 days"
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y"
            />
          </div>

          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Target audience
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., B2B SaaS founders and marketing leaders"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-3">Platforms</label>
            <div className="flex flex-wrap gap-3">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  className={cn(
                    'px-4 py-2 rounded-xl border text-sm font-medium transition-colors',
                    selectedPlatforms.includes(platform.id)
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  )}
                >
                  {platform.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: Strategy */}
      {step === 1 && (
        <div className="space-y-6">
          {isResearching && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500 mr-3" />
              <span className="text-slate-600">Mia is developing campaign strategies...</span>
            </div>
          )}

          {!isResearching && strategies.length > 0 && (
            <>
              <p className="text-sm text-slate-600">Choose a campaign strategy:</p>
              <div className="space-y-4">
                {strategies.map((strategy) => (
                  <button
                    key={strategy.id}
                    onClick={() => setSelectedStrategy(strategy)}
                    className={cn(
                      'w-full p-6 rounded-xl border text-left transition-all',
                      selectedStrategy?.id === strategy.id
                        ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-slate-900 mb-1">{strategy.title}</h3>
                        <p className="text-sm text-slate-600 mb-2">{strategy.description}</p>
                        <p className="text-xs text-slate-500 italic">{strategy.rationale}</p>
                      </div>
                      {selectedStrategy?.id === strategy.id && (
                        <Check className="w-5 h-5 text-purple-500 flex-shrink-0 ml-3" />
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
        <div className="space-y-4">
          {pieces.map((piece, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleExpand(i)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  {piece.loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                  ) : (
                    <Check className="w-4 h-4 text-emerald-500" />
                  )}
                  <span className="text-sm font-medium text-slate-900">{piece.title}</span>
                  <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', PLATFORM_COLORS[piece.platform] || 'bg-slate-100 text-slate-600')}>
                    {piece.platform}
                  </span>
                </div>
                {piece.expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {piece.expanded && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  {piece.loading ? (
                    <div className="h-16 bg-slate-50 rounded-lg animate-pulse mt-3" />
                  ) : (
                    <p className="text-sm text-slate-600 whitespace-pre-wrap mt-3">{piece.content}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* STEP 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          {pieces.map((piece, i) => (
            <div key={i} className="p-6 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm font-medium text-slate-900">{piece.title}</span>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', PLATFORM_COLORS[piece.platform] || 'bg-slate-100 text-slate-600')}>
                  {piece.platform}
                </span>
              </div>
              <textarea
                value={piece.content}
                onChange={(e) => {
                  const newContent = e.target.value
                  setPieces(prev => prev.map((p, idx) =>
                    idx === i ? { ...p, content: newContent } : p
                  ))
                }}
                rows={6}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 resize-y"
              />
            </div>
          ))}
        </div>
      )}

      {/* STEP 4: Save */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-xl border border-slate-200 text-center">
            <Sparkles className="w-8 h-8 text-purple-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Campaign ready</h3>
            <p className="text-sm text-slate-500 mb-4">
              {pieces.length} content pieces across {new Set(pieces.map(p => p.platform)).size} platforms
            </p>
          </div>

          <div className="space-y-3">
            {pieces.map((piece, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-slate-700">{piece.title}</span>
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium ml-auto', PLATFORM_COLORS[piece.platform] || 'bg-slate-100 text-slate-600')}>
                  {piece.platform}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </CreationWorkspace>
  )
}
