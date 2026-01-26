'use client'

import { Sparkles } from 'lucide-react'

export function DemoModeBanner() {
  // Check if demo mode via environment or header
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

  if (!isDemoMode) return null

  return (
    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
      <Sparkles className="w-4 h-4" />
      <span>Demo Mode</span>
      <span className="opacity-75">— Data will not be saved</span>
    </div>
  )
}
