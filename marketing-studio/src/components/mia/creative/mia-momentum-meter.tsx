'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { MomentumScore } from '@/lib/studio/mia-creative-types'

interface MiaMomentumMeterProps {
  score: MomentumScore | null
}

interface DimensionConfig {
  key: keyof Omit<MomentumScore, 'overall'>
  label: string
  color: string
  bgColor: string
  textColor: string
}

const DIMENSIONS: DimensionConfig[] = [
  { key: 'hook', label: 'Hook', color: 'bg-purple-500', bgColor: 'bg-purple-100', textColor: 'text-purple-700' },
  { key: 'clarity', label: 'Clarity', color: 'bg-blue-500', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  { key: 'cta', label: 'CTA', color: 'bg-pink-500', bgColor: 'bg-pink-100', textColor: 'text-pink-700' },
  { key: 'seo', label: 'SEO', color: 'bg-green-500', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  { key: 'platformFit', label: 'Platform', color: 'bg-amber-500', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
]

export function MiaMomentumMeter({ score }: MiaMomentumMeterProps) {
  const prevScoreRef = useRef<MomentumScore | null>(null)
  const [deltas, setDeltas] = useState<Record<string, number>>({})

  useEffect(() => {
    if (score && prevScoreRef.current) {
      const newDeltas: Record<string, number> = {}
      for (const dim of DIMENSIONS) {
        const diff = score[dim.key] - (prevScoreRef.current[dim.key] || 0)
        if (diff !== 0) newDeltas[dim.key] = diff
      }
      const overallDiff = score.overall - (prevScoreRef.current.overall || 0)
      if (overallDiff !== 0) newDeltas['overall'] = overallDiff

      if (Object.keys(newDeltas).length > 0) {
        setDeltas(newDeltas)
        const timer = setTimeout(() => setDeltas({}), 2000)
        return () => clearTimeout(timer)
      }
    }
    prevScoreRef.current = score
  }, [score])

  if (!score) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="flex items-center gap-4">
        {/* Dimension bars */}
        <div className="flex-1 flex items-center gap-3">
          {DIMENSIONS.map((dim) => {
            const value = score[dim.key]
            const delta = deltas[dim.key]
            return (
              <div key={dim.key} className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{dim.label}</span>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-bold ${dim.textColor}`}>{value}</span>
                    <AnimatePresence>
                      {delta !== undefined && delta !== 0 && (
                        <motion.span
                          initial={{ opacity: 0, y: -5, scale: 0.8 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -5 }}
                          className={`text-[10px] font-bold ${delta > 0 ? 'text-green-600' : 'text-red-500'}`}
                        >
                          {delta > 0 ? '+' : ''}{delta}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className={`h-1.5 rounded-full ${dim.bgColor} overflow-hidden`}>
                  <motion.div
                    className={`h-full rounded-full ${dim.color}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Overall score circle */}
        <div className="flex-shrink-0 relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-sm font-bold text-white">{score.overall}</span>
          </div>
          <AnimatePresence>
            {deltas['overall'] !== undefined && deltas['overall'] !== 0 && (
              <motion.span
                initial={{ opacity: 0, y: -5, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5 }}
                className={`absolute -top-2 -right-2 text-[10px] font-bold px-1 rounded ${
                  deltas['overall'] > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {deltas['overall'] > 0 ? '+' : ''}{deltas['overall']}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
