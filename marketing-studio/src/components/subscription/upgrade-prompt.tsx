'use client'

import { Lock, Sparkles } from 'lucide-react'
import Link from 'next/link'

interface UpgradePromptProps {
  feature: string
  description?: string
  compact?: boolean
}

export function UpgradePrompt({
  feature,
  description,
  compact = false,
}: UpgradePromptProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
        <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span className="text-sm text-amber-800">
          {feature} requires a paid plan.
        </span>
        <Link
          href="/studio/pricing"
          className="ml-auto text-sm font-medium text-purple-600 hover:text-purple-700"
        >
          Upgrade
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-6">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 mb-6 shadow-2xl shadow-purple-500/30">
        <Sparkles className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">
        Unlock {feature}
      </h2>
      <p className="text-slate-500 max-w-md mb-8">
        {description ||
          `${feature} is available on Pro and Enterprise plans. Upgrade to access this feature and more.`}
      </p>
      <Link
        href="/studio/pricing"
        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/25"
      >
        View Plans
      </Link>
    </div>
  )
}
