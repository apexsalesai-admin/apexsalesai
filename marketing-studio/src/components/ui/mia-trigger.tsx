'use client'

import { Sparkles } from 'lucide-react'
import { useMia } from '@/components/providers/mia-provider'

export function MiaTrigger() {
  const { toggle } = useMia()

  return (
    <button
      onClick={toggle}
      className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
    >
      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
      <span className="text-xs font-medium text-emerald-700">Mia Online</span>
      <Sparkles className="w-3 h-3 text-emerald-600" />
    </button>
  )
}
