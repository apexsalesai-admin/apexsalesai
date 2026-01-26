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
} from 'lucide-react'

interface ChecklistItem {
  id: string
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  completed: boolean
}

const DISMISS_KEY = 'lyfye-onboarding-dismissed'

export function OnboardingChecklist() {
  const [dismissed, setDismissed] = useState(true) // Default true to avoid flash
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if onboarding was dismissed
    const wasDismissed = localStorage.getItem(DISMISS_KEY) === 'true'
    setDismissed(wasDismissed)

    // Fetch configuration status
    checkSetup()
  }, [])

  const checkSetup = async () => {
    setLoading(true)

    // Check AI provider status
    let aiConfigured = false
    try {
      const res = await fetch('/api/ai/status')
      const data = await res.json()
      aiConfigured = data.data?.anyConfigured || false
    } catch {
      // Ignore
    }

    // Check brand voice (localStorage)
    const brandVoice = localStorage.getItem('lyfye-brand-voice')
    const brandConfigured = !!brandVoice && brandVoice !== '{}'

    // Check if user has created any content (mock for now)
    const contentCreated = localStorage.getItem('lyfye-has-content') === 'true'

    // Check integrations
    const integrationsConnected = localStorage.getItem('lyfye-has-integrations') === 'true'

    const items: ChecklistItem[] = [
      {
        id: 'ai',
        title: 'Connect an AI Provider',
        description: 'Add your Anthropic or OpenAI API key to enable content generation',
        href: '/studio/settings/ai',
        icon: Sparkles,
        completed: aiConfigured,
      },
      {
        id: 'brand',
        title: 'Set up your Brand Voice',
        description: 'Define your tone, audience, and content preferences',
        href: '/studio/settings/brand',
        icon: MessageSquare,
        completed: brandConfigured,
      },
      {
        id: 'content',
        title: 'Create your first content',
        description: 'Generate AI-powered posts, videos, or articles',
        href: '/studio/content/new',
        icon: Zap,
        completed: contentCreated,
      },
      {
        id: 'integrations',
        title: 'Connect a channel',
        description: 'Link LinkedIn, YouTube, TikTok, or X for direct publishing',
        href: '/studio/integrations',
        icon: Settings,
        completed: integrationsConnected,
      },
    ]

    setChecklist(items)
    setLoading(false)
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem(DISMISS_KEY, 'true')
  }

  const completedCount = checklist.filter((item) => item.completed).length
  const allComplete = completedCount === checklist.length

  // Don't show if dismissed or all complete
  if (dismissed || allComplete || loading) {
    return null
  }

  const progress = (completedCount / checklist.length) * 100

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Get Started with Lyfye</h2>
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
            {completedCount} of {checklist.length} completed
          </span>
          <span className="text-sm text-slate-500">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      <div className="divide-y divide-slate-100">
        {checklist.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group"
            >
              <div className="flex-shrink-0">
                {item.completed ? (
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                ) : (
                  <Circle className="w-6 h-6 text-slate-300 group-hover:text-purple-400 transition-colors" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium ${
                    item.completed
                      ? 'text-slate-400 line-through'
                      : 'text-slate-900 group-hover:text-purple-700'
                  }`}
                >
                  {item.title}
                </p>
                <p className="text-sm text-slate-500 truncate">{item.description}</p>
              </div>
              {!item.completed && (
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-purple-500 transition-colors" />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
