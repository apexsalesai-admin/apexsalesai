/**
 * Mia Context Hint (P21)
 *
 * A subtle, dismissible hint from Mia that appears contextually
 * on key screens (Dashboard, Integrations, Content Editor).
 */

'use client'

import { useState } from 'react'
import { X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MiaContextHintProps {
  /** Unique key used to persist dismissal in localStorage */
  hintKey: string
  /** The hint message from Mia */
  message: string
  /** Optional action button */
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  /** Visual variant */
  variant?: 'default' | 'success' | 'warning'
}

export function MiaContextHint({ hintKey, message, action, variant = 'default' }: MiaContextHintProps) {
  const storageKey = `mia-hint-dismissed:${hintKey}`
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(storageKey) === 'true'
  })

  if (dismissed) return null

  const dismiss = () => {
    setDismissed(true)
    localStorage.setItem(storageKey, 'true')
  }

  const variantClasses = {
    default: 'bg-gradient-to-r from-purple-50 to-fuchsia-50 border-purple-200',
    success: 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200',
    warning: 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200',
  }

  const iconClasses = {
    default: 'text-purple-500',
    success: 'text-emerald-500',
    warning: 'text-amber-500',
  }

  return (
    <div className={cn('flex items-start gap-3 p-3 rounded-xl border', variantClasses[variant])}>
      <Sparkles className={cn('w-4 h-4 mt-0.5 flex-shrink-0', iconClasses[variant])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700">
          <span className="font-semibold text-slate-900">Mia: </span>
          {message}
        </p>
        {action && (
          <div className="mt-1.5">
            {action.href ? (
              <a
                href={action.href}
                className="text-xs font-medium text-purple-600 hover:text-purple-700 hover:underline"
              >
                {action.label} &rarr;
              </a>
            ) : (
              <button
                onClick={action.onClick}
                className="text-xs font-medium text-purple-600 hover:text-purple-700 hover:underline"
              >
                {action.label} &rarr;
              </button>
            )}
          </div>
        )}
      </div>
      <button
        onClick={dismiss}
        className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors flex-shrink-0"
        aria-label="Dismiss hint"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
