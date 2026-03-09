'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Image as ImageIcon, Sparkles, Loader2, Download, Save, RefreshCw } from 'lucide-react'
import { CreationWorkspace, type WorkspaceStep } from '@/components/studio/creation-workspace'
import { saveGeneratedAsset, redirectAfterSave } from '@/lib/studio/save-generated-asset'
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

export default function CreateImagePage() {
  const router = useRouter()
  const [step, setStep] = useState(0)

  // Step 0: Concept
  const [concept, setConcept] = useState('')

  // Step 1: Style
  const [selectedStyle, setSelectedStyle] = useState('illustration')
  const [selectedSize, setSelectedSize] = useState('1024x1024')

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

  const handleGeneratePrompt = async () => {
    setIsGeneratingPrompt(true)
    setError('')

    try {
      // Call research API to get visual angles
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

      // Call generate-section to create a DALL-E prompt
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

  const handleGenerateImage = async () => {
    setIsGeneratingImage(true)
    setError('')

    try {
      const promptToUse = generatedPrompt || `${selectedStyle} style: ${concept}`

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
      contentType: 'POST',
      aiTopic: concept,
    })

    if (result.success) {
      redirectAfterSave(router, result.contentId)
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
              onClick={handleGenerateImage}
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
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={generatedImageUrl}
                  alt={concept}
                  className="w-full"
                />
              </div>

              {revisedPrompt && (
                <p className="text-xs text-slate-500">
                  <span className="font-medium">DALL-E revised prompt:</span> {revisedPrompt}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setGeneratedImageUrl('')
                    handleGenerateImage()
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  <RefreshCw className="w-4 h-4" /> Regenerate
                </button>
                <a
                  href={generatedImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Save */}
      {step === 3 && (
        <div className="space-y-6">
          {generatedImageUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 max-w-md mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={generatedImageUrl} alt={concept} className="w-full" />
            </div>
          )}

          <div className="p-6 bg-white rounded-xl border border-slate-200 text-center">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Your image is ready</h3>
            <p className="text-sm text-slate-500 mb-6">Save to your Library, download, or use in a post</p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save to Library
              </button>
              <a
                href={generatedImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center justify-center gap-2 px-6 py-3 text-slate-600 bg-white border border-slate-200 rounded-xl font-medium hover:bg-slate-50"
              >
                <Download className="w-4 h-4" /> Download Image
              </a>
            </div>
          </div>
        </div>
      )}
    </CreationWorkspace>
  )
}
