'use client'

import { motion } from 'framer-motion'
import { Loader2, AlertCircle, RefreshCw, Play } from 'lucide-react'

interface MiaVideoPreviewPlayerProps {
  videoUrl: string | null
  isLoading: boolean
  progress: number
  providerName: string
  durationSeconds: number
  cost: number
  onRetry: () => void
  error: string | null
}

export function MiaVideoPreviewPlayer({
  videoUrl,
  isLoading,
  progress,
  providerName,
  durationSeconds,
  cost,
  onRetry,
  error,
}: MiaVideoPreviewPlayerProps) {
  // Error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl border-2 border-red-200 bg-red-50 overflow-hidden"
      >
        <div className="aspect-video flex flex-col items-center justify-center gap-3 p-6">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-sm text-red-600 text-center max-w-xs">{error}</p>
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      </motion.div>
    )
  }

  // Loading / rendering state
  if (isLoading || !videoUrl) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-2xl border-2 border-purple-200 bg-slate-900 overflow-hidden"
      >
        <div className="aspect-video flex flex-col items-center justify-center gap-4 relative">
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
          <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
          <div className="text-center">
            <p className="text-sm text-white font-medium">Rendering with {providerName}...</p>
            {progress > 0 && (
              <div className="mt-2 w-48 mx-auto">
                <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">{Math.round(progress)}%</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  // Loaded state — video player
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border-2 border-purple-300 bg-slate-900 overflow-hidden shadow-lg shadow-purple-500/10"
    >
      <div className="relative">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          src={videoUrl}
          controls
          loop
          playsInline
          className="w-full aspect-video bg-black"
        />
        {/* Overlay badges */}
        <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-xs text-white font-medium">
          {providerName}
        </div>
        <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-xs text-white font-medium">
          {durationSeconds}s
        </div>
        <div className="absolute bottom-12 right-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-xs text-green-400 font-medium">
          ${cost.toFixed(2)}
        </div>
      </div>
      <div className="px-4 py-3 bg-slate-800">
        <p className="text-xs text-slate-400">
          This is a 10-second test render. Full video will be {durationSeconds}s at ${cost.toFixed(2)}.
        </p>
      </div>
    </motion.div>
  )
}
