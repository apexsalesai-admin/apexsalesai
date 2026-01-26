'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Sparkles, Settings, X } from 'lucide-react'

interface AIStatus {
  configured: boolean
  providers: {
    anthropic: boolean
    openai: boolean
  }
}

export function StudioStatusBanner() {
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

  useEffect(() => {
    // Check AI configuration status
    fetch('/api/ai/status')
      .then(res => res.json())
      .then(data => {
        setAiStatus({
          configured: data.anthropic?.configured || data.openai?.configured || false,
          providers: {
            anthropic: data.anthropic?.configured || false,
            openai: data.openai?.configured || false,
          }
        })
      })
      .catch(() => {
        // If API fails, assume not configured
        setAiStatus({ configured: false, providers: { anthropic: false, openai: false } })
      })
  }, [])

  // Don't show AI warning if dismissed or still loading
  const showAIWarning = aiStatus && !aiStatus.configured && !dismissed

  return (
    <>
      {/* Demo Mode Banner - subtle indicator */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-1.5 text-center text-xs font-medium flex items-center justify-center gap-2">
          <Sparkles className="w-3 h-3" />
          <span>Demo Mode</span>
          <span className="opacity-75">— Using mock data</span>
        </div>
      )}

      {/* AI Not Configured Banner */}
      {showAIWarning && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <span className="text-sm font-medium text-amber-900">
                AI Not Configured
              </span>
              <span className="text-sm text-amber-700 ml-2">
                — Add your API keys to enable content generation
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/studio/settings/ai"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Go to AI Settings
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-lg transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
