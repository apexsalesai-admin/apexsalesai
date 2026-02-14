'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, ExternalLink, Lightbulb, Sparkles, MessageSquare } from 'lucide-react'
import type { AngleCard } from '@/lib/studio/mia-creative-types'

interface MiaAnglePickerProps {
  angles: AngleCard[]
  isLoading: boolean
  onSelect: (angle: AngleCard) => void
  onRefreshAngles: () => void
}

export function MiaAnglePicker({ angles, isLoading, onSelect, onRefreshAngles }: MiaAnglePickerProps) {
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customAngleText, setCustomAngleText] = useState('')

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <p className="text-slate-500">Researching angles...</p>
      </div>
    )
  }

  if (angles.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        No angles found. Try a different topic.
      </div>
    )
  }

  const handleUseCustomAngle = () => {
    if (!customAngleText.trim()) return
    const customAngle: AngleCard = {
      id: 'custom',
      title: customAngleText.trim(),
      description: customAngleText.trim(),
      rationale: 'User-provided custom angle',
      sources: [],
    }
    onSelect(customAngle)
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-slate-900">Choose your angle</h3>
        <p className="text-slate-500 mt-1">I found 3 approaches — pick the one that resonates</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {angles.map((angle, i) => (
          <motion.button
            key={angle.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15, duration: 0.4 }}
            onClick={() => onSelect(angle)}
            className="group p-5 rounded-2xl border-2 border-slate-200 hover:border-purple-400 hover:ring-2 hover:ring-purple-100 transition-all text-left bg-white"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center flex-shrink-0 group-hover:from-purple-200 group-hover:to-pink-200 transition-colors">
                <Lightbulb className="w-4 h-4 text-purple-600" />
              </div>
              <h4 className="font-semibold text-slate-900 text-sm leading-tight">{angle.title}</h4>
            </div>

            <p className="text-sm text-slate-600 mb-3">{angle.description}</p>

            <p className="text-xs text-slate-400 italic mb-3">{angle.rationale}</p>

            {angle.sources.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {angle.sources.slice(0, 2).map((source, si) => (
                  <span
                    key={si}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {source.title.slice(0, 25)}{source.title.length > 25 ? '...' : ''}
                  </span>
                ))}
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* None of these — refresh or custom angle */}
      <div className="border-t border-slate-200 pt-5">
        <p className="text-sm text-slate-400 text-center mb-3">None of these quite right?</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onRefreshAngles}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Generate 3 more
          </button>
          <button
            onClick={() => setShowCustomInput(!showCustomInput)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            I have my own angle
          </button>
        </div>

        {showCustomInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 max-w-md mx-auto space-y-3"
          >
            <textarea
              value={customAngleText}
              onChange={(e) => setCustomAngleText(e.target.value)}
              placeholder="Describe your angle in a sentence or two..."
              className="w-full min-h-[80px] p-3 rounded-lg border border-slate-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none text-sm text-slate-800 resize-y"
            />
            <button
              onClick={handleUseCustomAngle}
              disabled={!customAngleText.trim()}
              className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Use this angle
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
