'use client'

import { motion } from 'framer-motion'
import { Loader2, ExternalLink, Lightbulb } from 'lucide-react'
import type { AngleCard } from '@/lib/studio/mia-creative-types'

interface MiaAnglePickerProps {
  angles: AngleCard[]
  isLoading: boolean
  onSelect: (angle: AngleCard) => void
}

export function MiaAnglePicker({ angles, isLoading, onSelect }: MiaAnglePickerProps) {
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
    </div>
  )
}
