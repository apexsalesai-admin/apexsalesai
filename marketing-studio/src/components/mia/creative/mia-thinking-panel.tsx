'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Sparkles } from 'lucide-react'
import type { ThinkingEntry, MiaCreativePhase } from '@/lib/studio/mia-creative-types'

const PHASE_LABELS: Record<MiaCreativePhase, string> = {
  greeting: 'Getting Started',
  angles: 'Researching',
  building: 'Building',
  polishing: 'Polishing',
  done: 'Complete',
}

interface MiaThinkingPanelProps {
  entries: ThinkingEntry[]
  currentPhase: MiaCreativePhase
}

export function MiaThinkingPanel({ entries, currentPhase }: MiaThinkingPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [entries.length])

  return (
    <div className="sticky top-8 h-[calc(100vh-12rem)] flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 px-5 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm">Mia&apos;s Thinking</h3>
          <p className="text-white/70 text-xs">{PHASE_LABELS[currentPhase]}</p>
        </div>
      </div>

      {/* Entries */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Sparkles className="w-6 h-6 mb-2 opacity-50" />
            <p className="text-xs text-center">Mia&apos;s reasoning will appear here as she works...</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {entries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i === entries.length - 1 ? 0.1 : 0, duration: 0.3 }}
                className="rounded-lg bg-slate-50 p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-purple-600">{entry.label}</span>
                  <span className="text-xs text-slate-300">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">{entry.detail}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
