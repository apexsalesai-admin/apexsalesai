'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Image as ImageIcon, Sparkles, Loader2, Download, Save, RefreshCw, Link2, Send, PenLine } from 'lucide-react'
import { CreationWorkspace, type WorkspaceStep } from '@/components/studio/creation-workspace'
import { saveGeneratedAsset } from '@/lib/studio/save-generated-asset'
import { ImageRefinePanel } from '@/components/studio/image-refine-panel'
import { cn } from '@/lib/utils'

const STEPS: WorkspaceStep[] = [
  { label: 'Concept' },
  { label: 'Style' },
  { label: 'Generate' },
  { label: 'Save' },
]

const STYLE_PRESETS = [
  { id: 'photorealistic', label: 'Photorealistic', description: 'Lifelike photography style' },
  { id: 'illustration', label: 'Illustration', description: 'Digital art and illustration' },
  { id: 'minimalist', label: 'Minimalist', description: 'Clean, simple, modern' },
  { id: 'corporate', label: 'Corporate', description: 'Professional business imagery' },
  { id: 'abstract', label: 'Abstract', description: 'Artistic and conceptual' },
  { id: 'childrens', label: "Children's Book", description: 'Warm, friendly illustration style' },
]

const SIZE_OPTIONS = [
  { id: '1024x1024', label: 'Square (1:1)', description: 'Instagram, profile images' },
  { id: '1792x1024', label: 'Landscape (16:9)', description: 'Blog headers, banners' },
  { id: '1024x1792', label: 'Portrait (9:16)', description: 'Stories, mobile' },
]

const IMAGE_PROVIDERS = [
  { id: 'dalle', label: 'DALL-E 3', badge: 'OpenAI', available: true },
  { id: 'leonardo', label: 'Leonardo AI', badge: 'Standard', available: false },
]

export default function CreateImagePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialPrompt = searchParams.get('prompt') || ''
  const [step, setStep] = useState(0)

  // Step 0: Concept
  const [concept, setConcept] = useState(initialPrompt)

  // Step 1: Style
  const [selectedStyle, setSelectedStyle] = useState('illustration')
  const [selectedSize, setSelectedSize] = useState('1024x1024')
  const [imageProvider, setImageProvider] = useState('dalle')

  // Step 2: Generate
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false)
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [generatedImageUrl, setGeneratedImageUrl] = useState('')
  const [revisedPrompt, setRevisedPrompt] = useState('')

  // Step 3: Save
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const handleDownload = async () => {
    if (!generatedImageUrl) return
    try {
      const response = await fetch(generatedImageUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lyfye-image-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      window.open(generatedImageUrl, '_blank')
    }
  }

  const handleCopyLink = async () => {
    if (!generatedImageUrl) return
    await navigator.clipboard.writeText(generatedImageUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleGeneratePrompt = async () => {
    setIsGeneratingPrompt(true)
    setError('')

    try {
      const researchRes = await fetch('/api/studio/mia/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: concept,
          channels: ['LINKEDIN'],
          contentType: 'image',
          goal: `${selectedStyle} style image`,
        }),
      })

      if (!researchRes.ok) throw new Error('Research failed')
      const researchData = await researchRes.json()
      const firstAngle = researchData.angles?.[0]

      if (!firstAngle) throw new Error('No visual concepts generated')

      const generateRes = await fetch('/api/studio/mia/generate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: concept,
          contentType: 'image',
          sectionType: 'visual_concept',
          channels: ['LINKEDIN'],
          angle: {
            id: firstAngle.id || 'angle-1',
            title: firstAngle.title,
            description: firstAngle.description,
            rationale: firstAngle.rationale || '',
            sources: [],
          },
          previousSections: [],
          rejectedVersions: [],
          goal: `Create a ${selectedStyle} style image: ${concept}`,
        }),
      })

      if (!generateRes.ok) throw new Error('Prompt generation failed')
      const generateData = await generateRes.json()

      const prompt = generateData.content || ''
      if (!prompt) throw new Error('Empty prompt generated')

      setGeneratedPrompt(prompt)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate prompt'
      setError(message)
    } finally {
      setIsGeneratingPrompt(false)
    }
  }

  const handleGenerateImage = async (promptOverride?: string) => {
    setIsGeneratingImage(true)
    setError('')

    try {
      const promptToUse = promptOverride || generatedPrompt || `${selectedStyle} style: ${concept}`

      const res = await fetch('/api/studio/mia/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse.substring(0, 4000),
          size: selectedSize,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Image generation failed (${res.status})`)
      }

      const data = await res.json()
      if (!data.url) throw new Error('No image URL returned')

      setGeneratedImageUrl(data.url)
      setRevisedPrompt(data.revisedPrompt || '')
      if (promptOverride) setGeneratedPrompt(promptOverride)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Image generation failed'
      setError(message)
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError('')

    const result = await saveGeneratedAsset({
      title: concept,
      body: generatedPrompt || concept,
      contentType: 'IMAGE',
      aiTopic: concept,
      mediaUrls: generatedImageUrl ? [generatedImageUrl] : [],
    })

    if (result.success && result.contentId) {
      router.push(`/studio/image/${result.contentId}`)
    } else {
      setError(result.error || 'Save failed')
    }
    setIsSaving(false)
  }

  const handleNext = async () => {
    if (step === 1) {
      await handleGeneratePrompt()
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    } else if (step === 3) {
      await handleSave()
    } else {
      setStep(step + 1)
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
      case 0: return concept.trim().length > 0
      case 1: return selectedStyle.length > 0
      case 2: return generatedImageUrl.length > 0
      case 3: return generatedImageUrl.length > 0
      default: return false
    }
  }

  return (
    <CreationWorkspace
      title="Create Image"
      subtitle="Generate AI images, illustrations, and visual assets with DALL-E"
      icon={ImageIcon}
      iconColor="bg-pink-500"
      steps={STEPS}
      currentStep={step}
      onBack={handleBack}
      onNext={handleNext}
      canGoNext={canGoNext()}
      isProcessing={isGeneratingPrompt || isGeneratingImage || isSaving}
      processingLabel={
        isGeneratingPrompt ? 'Mia is crafting your prompt...' :
        isGeneratingImage ? 'DALL-E is generating...' :
        isSaving ? 'Saving...' : undefined
      }
    >
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* STEP 0: Concept */}
      {step === 0 && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Describe the image you want to create
            </label>
            <textarea
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="e.g., A father teaching his kids to build a snowman in a winter wonderland, children's book illustration style"
              rows={4}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-y"
            />
            <p className="mt-2 text-xs text-slate-400">
              Be specific about subjects, composition, mood, and colors. Mia will optimize your description for DALL-E.
            </p>
          </div>
        </div>
      )}

      {/* STEP 1: Style */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <h3 className="text-sm font-medium text-slate-700 mb-4">Choose a visual style</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {STYLE_PRESETS.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={cn(
                    'p-4 rounded-xl border text-left transition-colors',
                    selectedStyle === style.id
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <span className="block text-sm font-medium text-slate-900">{style.label}</span>
                  <span className="block text-xs text-slate-500 mt-1">{style.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <h3 className="text-sm font-medium text-slate-700 mb-4">Choose image size</h3>
            <div className="grid grid-cols-3 gap-3">
              {SIZE_OPTIONS.map((size) => (
                <button
                  key={size.id}
                  onClick={() => setSelectedSize(size.id)}
                  className={cn(
                    'p-3 rounded-xl border text-center transition-colors',
                    selectedSize === size.id
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <span className="block text-sm font-medium text-slate-900">{size.label}</span>
                  <span className="block text-xs text-slate-500 mt-1">{size.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Provider Selector */}
          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Generation Engine</h3>
            <div className="flex gap-3">
              {IMAGE_PROVIDERS.map(p => (
                <button
                  key={p.id}
                  onClick={() => p.available && setImageProvider(p.id)}
                  className={cn(
                    'px-4 py-3 rounded-xl border text-sm font-medium transition-colors',
                    imageProvider === p.id && p.available
                      ? 'border-pink-500 bg-pink-50 text-pink-700'
                      : 'border-slate-200 text-slate-500',
                    !p.available && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {p.label}
                  {!p.available && (
                    <span className="ml-2 text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                      Coming Soon
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Generate */}
      {step === 2 && (
        <div className="space-y-6">
          {generatedPrompt && (
            <div className="p-6 bg-white rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-500" />
                  <span className="text-sm font-medium text-pink-700">Mia&apos;s Optimized Prompt</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPrompt)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  {copied ? 'Copied!' : 'Copy prompt'}
                </button>
              </div>
              <textarea
                value={generatedPrompt}
                onChange={(e) => setGeneratedPrompt(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 resize-y"
              />
            </div>
          )}

          {!generatedImageUrl && (
            <button
              onClick={() => handleGenerateImage()}
              disabled={isGeneratingImage || !generatedPrompt}
              className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGeneratingImage ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> DALL-E is generating your image...</>
              ) : (
                <><Sparkles className="w-5 h-5" /> Generate Image with DALL-E</>
              )}
            </button>
          )}

          {generatedImageUrl && (
            <div className="space-y-4">
              <div
                className="relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-lg mx-auto"
                style={{ maxWidth: selectedSize === '1792x1024' ? '800px' : '600px' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={generatedImageUrl}
                  alt={concept}
                  className="w-full h-auto block"
                />
              </div>

              {revisedPrompt && (
                <p className="text-xs text-slate-500 text-center">
                  <span className="font-medium">DALL-E revised prompt:</span> {revisedPrompt}
                </p>
              )}

              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setGeneratedImageUrl('')
                    handleGenerateImage()
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  <RefreshCw className="w-4 h-4" /> Regenerate
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>

              {/* Mia Refinement Panel */}
              <ImageRefinePanel
                currentPrompt={generatedPrompt}
                onRegenerate={async (newPrompt) => {
                  await handleGenerateImage(newPrompt)
                }}
                isGenerating={isGeneratingImage}
              />
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Save */}
      {step === 3 && (
        <div className="space-y-6">
          {generatedImageUrl && (
            <div
              className="rounded-2xl overflow-hidden border border-slate-200 mx-auto"
              style={{ maxWidth: selectedSize === '1792x1024' ? '800px' : '600px' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={generatedImageUrl} alt={concept} className="w-full h-auto block" />
            </div>
          )}

          <div className="p-6 bg-white rounded-xl border border-slate-200 text-center">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Your image is ready</h3>
            <p className="text-sm text-slate-500 mb-6">Save to your Library, download, or use in a post</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-2 px-4 py-4 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <Link2 className="w-5 h-5" />
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <button
                onClick={handleDownload}
                className="flex flex-col items-center gap-2 px-4 py-4 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <Download className="w-5 h-5" />
                Download
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex flex-col items-center gap-2 px-4 py-4 text-sm font-medium text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save to Library
              </button>
              <button
                onClick={() => {
                  const params = new URLSearchParams()
                  if (generatedImageUrl) params.set('imageUrl', generatedImageUrl)
                  if (concept) params.set('topic', concept)
                  router.push(`/studio/content/new?${params.toString()}`)
                }}
                className="flex flex-col items-center gap-2 px-4 py-4 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <PenLine className="w-5 h-5" />
                Add to Post
              </button>
            </div>
          </div>
        </div>
      )}
    </CreationWorkspace>
  )
}
