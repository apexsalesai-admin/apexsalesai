'use client'

import { motion } from 'framer-motion'
import { MiaSectionBlock } from './mia-section-block'
import type { SectionDraft } from '@/lib/studio/mia-creative-types'

interface MiaSectionBuilderProps {
  sections: SectionDraft[]
  currentSectionIndex: number
  isLoading: boolean
  onAccept: (index: number) => void
  onRetry: (index: number) => void
  onEdit: (index: number, content: string) => void
  onGenerate: (index: number) => void
  onEditAndReview?: (index: number, content: string) => Promise<string | null>
}

export function MiaSectionBuilder({
  sections,
  currentSectionIndex,
  isLoading,
  onAccept,
  onRetry,
  onEdit,
  onGenerate,
  onEditAndReview,
}: MiaSectionBuilderProps) {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center mb-2"
      >
        <h3 className="text-xl font-bold text-slate-900">Building your content</h3>
        <p className="text-slate-500 mt-1">
          {sections.filter((s) => s.accepted).length} of 3 sections complete
        </p>
      </motion.div>

      <div className="space-y-4">
        {sections.map((section, i) => (
          <MiaSectionBlock
            key={section.type}
            section={section}
            index={i}
            isActive={i === currentSectionIndex}
            isGenerating={isLoading && i === currentSectionIndex}
            onAccept={() => onAccept(i)}
            onRetry={() => onRetry(i)}
            onEdit={(content) => onEdit(i, content)}
            onGenerate={() => onGenerate(i)}
            onEditAndReview={onEditAndReview ? (content) => onEditAndReview(i, content) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
