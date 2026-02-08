'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CheckCircle,
  Circle,
  Sparkles,
  Settings,
  MessageSquare,
  Zap,
  ArrowRight,
  X,
  AlertCircle,
  Loader2,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface OnboardingStep {
  id: string
  title: string
  description: string
  completed: boolean
  href: string
  order: number
}

interface ReadinessData {
  success: boolean
  readiness: {
    authConfigured: boolean
    aiConfigured: boolean
    databaseConnected: boolean
    inngestConnected: boolean
    workspaceExists: boolean
    brandVoiceConfigured: boolean
    platformConnected: boolean
    overallReady: boolean
    overallScore: number
    checks: Array<{
      name: string
      status: 'ready' | 'pending' | 'error'
      message: string
      required: boolean
    }>
    timestamp: string
  }
  onboarding: {
    steps: OnboardingStep[]
    completedCount: number
    totalCount: number
    percentComplete: number
  }
}

const DISMISS_KEY = 'lyfye-onboarding-dismissed'

export function OnboardingChecklist() {
  const [dismissed, setDismissed] = useState(true) // Default true to avoid flash
  const [data, setData] = useState<ReadinessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if onboarding was dismissed
    const wasDismissed = localStorage.getItem(DISMISS_KEY) === 'true'
    setDismissed(wasDismissed)

    // Fetch readiness status
    fetchReadiness()
  }, [])

  const fetchReadiness = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/system/readiness?onboarding=true')

      if (!res.ok) {
        throw new Error('Failed to fetch readiness status')
      }

      const result = await res.json()
      setData(result)
    } catch (err) {
      console.error('[OnboardingChecklist] Error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem(DISMISS_KEY, 'true')
  }

  const handleReset = () => {
    setDismissed(false)
    localStorage.removeItem(DISMISS_KEY)
  }

  // Show loading state
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Checking system readiness...</span>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to check system status. Please refresh.</span>
        </div>
      </div>
    )
  }

  // No data
  if (!data || !data.onboarding) {
    return null
  }

  const { readiness, onboarding } = data
  const { steps, completedCount, totalCount, percentComplete } = onboarding

  // All complete - show success badge only
  if (percentComplete === 100) {
    if (dismissed) return null

    return (
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800">System Ready</p>
              <p className="text-sm text-emerald-600">All onboarding steps completed</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  // Don't show if dismissed
  if (dismissed) {
    return (
      <button
        onClick={handleReset}
        className="text-sm text-slate-500 hover:text-purple-600 underline"
      >
        Show setup guide
      </button>
    )
  }

  // Icon mapping
  const getIcon = (stepId: string) => {
    switch (stepId) {
      case 'ai-provider':
        return Sparkles
      case 'brand-voice':
        return MessageSquare
      case 'first-content':
        return Zap
      case 'connect-channel':
        return Settings
      default:
        return Circle
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header with System Status */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-900">Get Started with Lyfye</h2>
            <span
              className={cn(
                'px-2 py-0.5 text-xs font-medium rounded-full',
                readiness.overallReady
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              )}
            >
              {readiness.overallReady ? 'Ready' : 'Setup Required'}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Complete these steps to unlock the full power of AI content creation
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">
            {completedCount} of {totalCount} completed
          </span>
          <span className="text-sm text-slate-500">{percentComplete}%</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              percentComplete === 100
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-purple-500 to-pink-500'
            )}
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      <div className="divide-y divide-slate-100">
        {steps.map((step) => {
          const Icon = getIcon(step.id)
          return (
            <Link
              key={step.id}
              href={step.href}
              className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group"
            >
              <div className="flex-shrink-0">
                {step.completed ? (
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                ) : (
                  <Circle className="w-6 h-6 text-slate-300 group-hover:text-purple-400 transition-colors" />
                )}
              </div>
              <div className="flex-shrink-0">
                <div
                  className={cn(
                    'p-2 rounded-lg',
                    step.completed
                      ? 'bg-emerald-50'
                      : 'bg-slate-100 group-hover:bg-purple-50'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4',
                      step.completed
                        ? 'text-emerald-500'
                        : 'text-slate-400 group-hover:text-purple-500'
                    )}
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'font-medium',
                    step.completed
                      ? 'text-slate-400 line-through'
                      : 'text-slate-900 group-hover:text-purple-700'
                  )}
                >
                  {step.title}
                </p>
                <p className="text-sm text-slate-500 truncate">{step.description}</p>
              </div>
              {!step.completed && (
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-purple-500 transition-colors" />
              )}
            </Link>
          )
        })}
      </div>

      {/* System Checks Summary */}
      <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>System Score: {readiness.overallScore}%</span>
          <Link
            href="/studio/settings"
            className="text-purple-600 hover:text-purple-700 hover:underline"
          >
            View system status
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact readiness badge for headers/sidebars
 */
export function ReadinessBadge() {
  const [data, setData] = useState<ReadinessData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/system/readiness')
      .then((res) => res.json())
      .then((result) => setData(result))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) {
    return null
  }

  const { readiness } = data

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        readiness.overallReady
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-amber-100 text-amber-700'
      )}
    >
      <div
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          readiness.overallReady ? 'bg-emerald-500' : 'bg-amber-500'
        )}
      />
      {readiness.overallReady ? 'Ready' : 'Setup'}
    </div>
  )
}
