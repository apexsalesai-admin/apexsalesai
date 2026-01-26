'use client'

import { motion } from 'framer-motion'
import { Sparkles, Loader2, RefreshCw, X } from 'lucide-react'
import { useState, useEffect } from 'react'

interface GeneratingCardProps {
  topic: string
  channel?: string
  onRetry?: () => void
  onCancel?: () => void
  status: 'generating' | 'success' | 'error'
  errorMessage?: string
}

export function GeneratingCard({
  topic,
  channel,
  onRetry,
  onCancel,
  status,
  errorMessage,
}: GeneratingCardProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (status !== 'generating') return

    const interval = setInterval(() => {
      setElapsed((e) => e + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [status])

  const getEstimate = () => {
    if (elapsed < 5) return 'Starting up...'
    if (elapsed < 15) return 'Crafting your content...'
    if (elapsed < 30) return 'Adding finishing touches...'
    return 'Almost there...'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`rounded-2xl border-2 p-6 ${
        status === 'error'
          ? 'border-red-300 bg-red-50'
          : status === 'success'
            ? 'border-emerald-300 bg-emerald-50'
            : 'border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              status === 'error'
                ? 'bg-red-100'
                : status === 'success'
                  ? 'bg-emerald-100'
                  : 'bg-gradient-to-br from-purple-500 to-pink-500'
            }`}
          >
            {status === 'generating' ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : status === 'error' ? (
              <X className="w-6 h-6 text-red-600" />
            ) : (
              <Sparkles className="w-6 h-6 text-emerald-600" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900">
                {status === 'generating'
                  ? 'Mia is creating...'
                  : status === 'error'
                    ? 'Generation failed'
                    : 'Content ready!'}
              </h3>
              {channel && (
                <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                  {channel}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 mt-1 line-clamp-2">{topic}</p>

            {status === 'generating' && (
              <div className="mt-3">
                <div className="flex items-center gap-2 text-sm text-purple-600">
                  <span>{getEstimate()}</span>
                  <span className="text-slate-400">({elapsed}s)</span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 bg-purple-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                    initial={{ width: '0%' }}
                    animate={{ width: elapsed < 30 ? `${Math.min(elapsed * 3, 90)}%` : '95%' }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}

            {status === 'error' && errorMessage && (
              <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {status === 'error' && onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          )}
          {status === 'generating' && onCancel && (
            <button
              onClick={onCancel}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
