'use client'

import { useState } from 'react'
import {
  Play,
  Loader2,
  AlertCircle,
  RotateCcw,
  Download,
  RefreshCw,
  Check,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VideoRenderStatus } from '@/types/content-draft'

interface VideoPreviewPlayerProps {
  status: VideoRenderStatus
  previewUrl?: string
  errorMessage?: string
  /** 0-100 */
  progress?: number
  onRequestRender: () => void
  onRetry: () => void
}

export function VideoPreviewPlayer({
  status,
  previewUrl,
  errorMessage,
  progress,
  onRequestRender,
  onRetry,
}: VideoPreviewPlayerProps) {
  const [hasWatched, setHasWatched] = useState(false)

  // ── NOT_REQUESTED ──────────────────────────────────────────
  if (status === 'NOT_REQUESTED') {
    return (
      <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border-2 border-dashed border-slate-300 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center mx-auto mb-4">
          <Play className="w-8 h-8 text-slate-500" />
        </div>
        <h4 className="font-bold text-slate-900 mb-1">Video Preview</h4>
        <p className="text-sm text-slate-500 mb-4">
          Generate a preview to see how your video will look before publishing.
        </p>
        <button
          onClick={onRequestRender}
          className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-red-500/25 transition-all hover:-translate-y-0.5"
        >
          <Play className="w-4 h-4" />
          <span>Render Preview</span>
        </button>
      </div>
    )
  }

  // ── QUEUED ─────────────────────────────────────────────────
  if (status === 'QUEUED') {
    return (
      <div className="p-6 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl border border-amber-200 text-center">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-3" />
        <h4 className="font-bold text-slate-900 mb-1">Queued for Rendering</h4>
        <p className="text-sm text-slate-500">
          Your video is in the render queue. This may take a moment.
        </p>
      </div>
    )
  }

  // ── RENDERING ──────────────────────────────────────────────
  if (status === 'RENDERING') {
    const pct = progress ?? 0
    return (
      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 text-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
        <h4 className="font-bold text-slate-900 mb-2">Rendering Video</h4>
        <div className="w-full max-w-xs mx-auto h-2.5 bg-blue-100 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-sm text-slate-500">{pct}% complete</p>
      </div>
    )
  }

  // ── FAILED ─────────────────────────────────────────────────
  if (status === 'FAILED') {
    return (
      <div className="p-6 bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl border border-red-200 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-7 h-7 text-red-500" />
        </div>
        <h4 className="font-bold text-slate-900 mb-1">Render Failed</h4>
        <p className="text-sm text-red-600 mb-4">
          {errorMessage || 'An error occurred while rendering the video.'}
        </p>
        <button
          onClick={onRetry}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Retry</span>
        </button>
      </div>
    )
  }

  // ── READY ──────────────────────────────────────────────────
  return (
    <div className="rounded-2xl border border-emerald-200 overflow-hidden bg-gradient-to-br from-emerald-50 to-teal-50">
      {/* Video player */}
      <div className="relative bg-black">
        <video
          controls
          src={previewUrl}
          className="w-full aspect-video"
          onPlay={() => setHasWatched(true)}
        />
      </div>

      {/* Controls bar */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {hasWatched ? (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
              <Check className="w-3.5 h-3.5" />
              <span>Watched</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
              <Eye className="w-3.5 h-3.5" />
              <span>Watch before publishing</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {previewUrl && (
            <a
              href={previewUrl}
              download
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </a>
          )}
          <button
            onClick={onRetry}
            className={cn(
              'inline-flex items-center space-x-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
              'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            )}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Regenerate</span>
          </button>
        </div>
      </div>
    </div>
  )
}
