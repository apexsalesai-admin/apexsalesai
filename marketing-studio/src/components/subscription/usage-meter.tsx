'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface UsageData {
  tier: string
  used: number
  limit: number
}

export function UsageMeter() {
  const [data, setData] = useState<UsageData | null>(null)

  useEffect(() => {
    fetch('/api/stripe/usage')
      .then((r) => r.json())
      .then((d) => {
        if (d.tier) setData(d)
      })
      .catch(() => {})
  }, [])

  if (!data || data.limit === -1) return null

  const pct = Math.min(100, Math.round((data.used / data.limit) * 100))
  const isWarning = pct >= 80
  const isMaxed = pct >= 100

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span>
          {data.used} / {data.limit} pieces
        </span>
        <span className="capitalize">{data.tier}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isMaxed
              ? 'bg-red-500'
              : isWarning
                ? 'bg-amber-500'
                : 'bg-purple-500'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isMaxed && (
        <Link
          href="/studio/pricing"
          className="block text-xs text-purple-600 font-medium mt-1 hover:text-purple-700"
        >
          Upgrade for more
        </Link>
      )}
    </div>
  )
}
