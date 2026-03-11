'use client'

import { useState } from 'react'
import { Wand2, RefreshCw, Loader2 } from 'lucide-react'

interface ImageRefinePanelProps {
  currentPrompt: string
  onRegenerate: (newPrompt: string) => Promise<void>
  isGenerating: boolean
}

const STYLE_PRESETS = [
  { label: 'Photorealistic', append: 'photorealistic, professional photography, sharp detail' },
  { label: 'Illustration', append: 'digital illustration, clean lines, vibrant colors' },
  { label: 'Digital Art', append: 'digital art, painterly, concept art style' },
  { label: 'Watercolor', append: 'watercolor painting, soft edges, artistic, textured paper' },
  { label: 'Cinematic', append: 'cinematic photography, dramatic lighting, film quality' },
  { label: 'Minimalist', append: 'minimalist, clean, simple shapes, white space' },
]

export function ImageRefinePanel({
  currentPrompt,
  onRegenerate,
  isGenerating,
}: ImageRefinePanelProps) {
  const [feedback, setFeedback] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('')

  const handleStyleChange = async (styleAppend: string) => {
    setSelectedStyle(styleAppend)
    const base = currentPrompt.replace(
      /, (photorealistic|digital illustration|digital art|watercolor painting|cinematic photography|minimalist)[^,]*/gi,
      ''
    )
    await onRegenerate(`${base.trim()}, ${styleAppend}`)
  }

  const handleFeedback = async () => {
    if (!feedback.trim()) return
    const refined = `${currentPrompt}. Refinement: ${feedback.trim()}`
    setFeedback('')
    await onRegenerate(refined)
  }

  const handleVariation = async () => {
    const seed = Math.floor(Math.random() * 10000)
    await onRegenerate(`${currentPrompt} [variation ${seed}]`)
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 space-y-4">
      <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-semibold text-slate-800">Refine with Mia</span>
        </div>

        {/* Style presets */}
        <div className="mb-4">
          <p className="text-xs text-slate-500 mb-2">Adjust style</p>
          <div className="flex flex-wrap gap-2">
            {STYLE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleStyleChange(preset.append)}
                disabled={isGenerating}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors disabled:opacity-50 ${
                  selectedStyle === preset.append
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'border-slate-300 text-slate-600 hover:border-purple-400 hover:text-purple-600 bg-white'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Free-form feedback */}
        <div className="mb-3">
          <p className="text-xs text-slate-500 mb-2">Tell Mia what to change</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFeedback()}
              placeholder="e.g. make the lighting warmer, add more detail"
              disabled={isGenerating}
              className="flex-1 text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:opacity-50"
            />
            <button
              onClick={handleFeedback}
              disabled={isGenerating || !feedback.trim()}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Apply
            </button>
          </div>
        </div>

        {/* Variation button */}
        <button
          onClick={handleVariation}
          disabled={isGenerating}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-purple-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try a variation
        </button>
      </div>
    </div>
  )
}
