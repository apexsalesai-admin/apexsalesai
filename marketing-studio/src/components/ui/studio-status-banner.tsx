'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Settings, X } from 'lucide-react'

interface AIStatus {
  configured: boolean
  providers: {
    anthropic: boolean
    openai: boolean
  }
}

const DISMISS_KEY = 'lyfye-ai-banner-dismissed'

/**
 * Studio Status Banner
 *
 * PRODUCTION RULES:
 * - Demo mode banner NEVER shows in production
 * - AI configuration warning shows in all environments
 */
export function StudioStatusBanner() {
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null)
  const [dismissed, setDismissed] = useState(true) // Default to true to avoid flash

  // Check if we're in a production environment (client-side)
  const isProductionDomain = typeof window !== 'undefined' && (
    window.location.hostname === 'studio.lyfye.com' ||
    window.location.hostname.endsWith('.vercel.app')
  )

  // Demo mode is NEVER allowed in production
  const isDemoAllowed = !isProductionDomain && process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

  useEffect(() => {
    // Check if user has dismissed the banner this session
    const wasDismissed = sessionStorage.getItem(DISMISS_KEY) === 'true'
    setDismissed(wasDismissed)

    // Check AI configuration status
    fetch('/api/ai/status')
      .then(res => res.json())
      .then(data => {
        // Handle the actual API response format
        const anyConfigured = data.data?.anyConfigured ||
          data.data?.providers?.some((p: { configured: boolean }) => p.configured) ||
          false

        setAiStatus({
          configured: anyConfigured,
          providers: {
            anthropic: data.data?.providers?.find((p: { id: string; configured: boolean }) => p.id === 'anthropic')?.configured || false,
            openai: data.data?.providers?.find((p: { id: string; configured: boolean }) => p.id === 'openai')?.configured || false,
          }
        })
      })
      .catch(() => {
        // If API fails, assume not configured
        setAiStatus({ configured: false, providers: { anthropic: false, openai: false } })
      })
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem(DISMISS_KEY, 'true')
  }

  // Don't show AI warning if dismissed or still loading
  const showAIWarning = aiStatus && !aiStatus.configured && !dismissed

  return (
    <>
      {/* Demo Mode Banner - ONLY in non-production local development */}
      {isDemoAllowed && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-1.5 text-center text-xs font-medium flex items-center justify-center gap-2">
          <span>🧪 Local Demo Mode</span>
          <span className="opacity-75">— Not available in production</span>
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
              onClick={handleDismiss}
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
