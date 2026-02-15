'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Play,
  Download,
  Loader2,
  AlertCircle,
  RotateCcw,
  Key,
  DollarSign,
  ExternalLink,
  FileText,
  ChevronLeft,
  ChevronRight,
  Bug,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RenderResult, RenderStatus, StoryboardFrame } from '@/lib/video/types/render-result'

interface RenderArtifactPanelProps {
  /** Initial render result (from POST response or cached) */
  initial: RenderResult
  /** Called when the user clicks Retry */
  onRetry?: () => void
  /** If true, show compact inline version (for per-version display) */
  compact?: boolean
}

const POLL_INTERVAL_MS = 5_000
const MAX_POLLS = 120 // 10 minutes

function isTerminal(status: RenderStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'awaiting_provider' || status === 'budget_exceeded'
}

export function RenderArtifactPanel({ initial, onRetry, compact }: RenderArtifactPanelProps) {
  const [result, setResult] = useState<RenderResult>(initial)
  const [pollCount, setPollCount] = useState(0)
  const [debugData, setDebugData] = useState<Record<string, unknown> | null>(null)
  const searchParams = useSearchParams()
  const isDebug = searchParams.get('debug') === '1'

  // Update from parent when initial changes
  useEffect(() => {
    setResult(initial)
    setPollCount(0)
  }, [initial])

  // Auto-poll while non-terminal
  useEffect(() => {
    if (isTerminal(result.status) || pollCount >= MAX_POLLS) return
    if (!result.jobId) return

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/studio/video-jobs/${result.jobId}`)
        const json = await res.json()
        if (json.success && json.data) {
          setResult(json.data as RenderResult)
        }
        if (json.debug) {
          setDebugData(json.debug as Record<string, unknown>)
        }
      } catch {
        // Silent — will retry on next poll
      }
      setPollCount(prev => prev + 1)
    }, POLL_INTERVAL_MS)

    return () => clearTimeout(timer)
  }, [result.jobId, result.status, pollCount])

  // Fetch debug data on mount if debug mode is active and we have a jobId
  useEffect(() => {
    if (!isDebug || !result.jobId) return
    fetch(`/api/studio/video-jobs/${result.jobId}`)
      .then(r => r.json())
      .then(json => { if (json.debug) setDebugData(json.debug as Record<string, unknown>) })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDebug, result.jobId])

  const { status } = result

  let content: React.ReactNode = null

  // ── COMPLETED + VIDEO ──────────────────────────────────────
  if (status === 'completed' && result.previewUrl) {
    content = <VideoPlayer result={result} compact={compact} />
  }
  // ── COMPLETED + STORYBOARD ─────────────────────────────────
  else if (status === 'completed' && result.frames?.length) {
    content = <StoryboardView frames={result.frames} compact={compact} />
  }
  // ── COMPLETED + NO OUTPUT (bug) ────────────────────────────
  else if (status === 'completed') {
    content = (
      <ErrorCard
        title="Render Complete — No Output"
        message={result.error || 'Render completed but no visible output was produced.'}
        errorCode={result.errorCode}
        jobId={result.jobId}
        onRetry={onRetry}
        compact={compact}
      />
    )
  }
  // ── QUEUED / PROCESSING ────────────────────────────────────
  else if (status === 'queued' || status === 'processing') {
    content = (
      <ProgressCard
        result={result}
        pollCount={pollCount}
        maxPolls={MAX_POLLS}
        compact={compact}
      />
    )
  }
  // ── FAILED ─────────────────────────────────────────────────
  else if (status === 'failed') {
    content = (
      <ErrorCard
        title="Render Failed"
        message={result.error || 'An error occurred during rendering.'}
        errorCode={result.errorCode}
        jobId={result.jobId}
        nextAction={result.nextAction}
        onRetry={onRetry}
        compact={compact}
      />
    )
  }
  // ── AWAITING PROVIDER ──────────────────────────────────────
  else if (status === 'awaiting_provider') {
    content = (
      <GuidanceCard
        icon={<Key className="w-6 h-6 text-amber-500" />}
        title="API Key Required"
        message={result.error || `This provider requires an API key to render video.`}
        nextAction={result.nextAction}
        compact={compact}
      />
    )
  }
  // ── BUDGET EXCEEDED ────────────────────────────────────────
  else if (status === 'budget_exceeded') {
    content = (
      <GuidanceCard
        icon={<DollarSign className="w-6 h-6 text-red-500" />}
        title="Budget Exceeded"
        message={result.error || 'Monthly render budget has been reached.'}
        nextAction={result.nextAction}
        compact={compact}
      />
    )
  }

  return (
    <div>
      {content}
      {isDebug && !compact && <DebugOverlay result={result} debugData={debugData} pollCount={pollCount} />}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────

function VideoPlayer({ result, compact }: { result: RenderResult; compact?: boolean }) {
  return (
    <div className={cn(
      'rounded-xl border overflow-hidden',
      compact ? 'border-emerald-200' : 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50'
    )}>
      <div className="relative bg-black">
        <video
          controls
          src={result.previewUrl!}
          poster={result.thumbnailUrl ?? undefined}
          className={cn('w-full', compact ? 'max-h-[200px]' : 'aspect-video')}
        />
      </div>
      {!compact && (
        <div className="p-3 flex items-center justify-between">
          <span className="text-xs text-emerald-700 font-medium flex items-center space-x-1">
            <Play className="w-3 h-3" />
            <span>{result.provider} render</span>
          </span>
          <div className="flex items-center space-x-2">
            {result.outputUrl && (
              <a
                href={result.outputUrl}
                download
                className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StoryboardView({ frames, compact }: { frames: StoryboardFrame[]; compact?: boolean }) {
  const [page, setPage] = useState(0)
  const perPage = compact ? 2 : 3
  const totalPages = Math.ceil(frames.length / perPage)
  const visible = frames.slice(page * perPage, page * perPage + perPage)

  return (
    <div className={cn(
      'rounded-xl border border-indigo-200',
      compact ? 'p-3' : 'p-4 bg-gradient-to-br from-indigo-50 to-slate-50'
    )}>
      {!compact && (
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-800 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>Preview Storyboard</span>
            <span className="text-xs text-slate-400 font-normal">({frames.length} scenes)</span>
          </h4>
          <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
            Connect a video provider for real video
          </span>
        </div>
      )}

      <div className={cn('grid gap-3', compact ? 'grid-cols-2' : 'grid-cols-3')}>
        {visible.map(frame => (
          <div
            key={frame.sceneNumber}
            className="rounded-lg overflow-hidden"
            style={{ backgroundColor: frame.backgroundColor }}
          >
            <div className="p-3 min-h-[100px] flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">
                    Scene {frame.sceneNumber}
                  </span>
                </div>
                <p className="text-xs text-white/90 leading-relaxed line-clamp-3">
                  {frame.text}
                </p>
              </div>
              <p className="text-[10px] text-white/50 mt-2 italic truncate">
                {frame.direction}
              </p>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-3 mt-3">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="text-xs text-slate-500">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      )}
    </div>
  )
}

function ProgressCard({
  result,
  pollCount,
  maxPolls,
  compact,
}: {
  result: RenderResult
  pollCount: number
  maxPolls: number
  compact?: boolean
}) {
  const timedOut = pollCount >= maxPolls

  if (timedOut) {
    return (
      <ErrorCard
        title="Render Timed Out"
        message="Render has been processing for over 10 minutes. It may still complete in the background."
        errorCode="TIMEOUT"
        jobId={result.jobId}
        compact={compact}
      />
    )
  }

  return (
    <div className={cn(
      'rounded-xl border border-blue-200',
      compact ? 'p-3' : 'p-4 bg-gradient-to-br from-blue-50 to-indigo-50'
    )}>
      <div className="flex items-center space-x-3 mb-3">
        <Loader2 className={cn('text-blue-500 animate-spin', compact ? 'w-4 h-4' : 'w-5 h-5')} />
        <div>
          <h4 className={cn('font-semibold text-slate-800', compact ? 'text-xs' : 'text-sm')}>
            {result.status === 'queued' ? 'Queued for Rendering' : 'Rendering...'}
          </h4>
          {!compact && (
            <p className="text-xs text-slate-500 mt-0.5">
              {result.provider} &middot; Job {result.jobId.slice(0, 8)}...
            </p>
          )}
        </div>
      </div>

      {/* Progress bar — only if we have real progress data */}
      {result.progress != null && result.progress > 0 && (
        <div className="mb-2">
          <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${result.progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">{result.progress}% complete</p>
        </div>
      )}

      {!compact && (
        <p className="text-xs text-slate-400">
          Started {new Date(result.createdAt).toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}

function ErrorCard({
  title,
  message,
  errorCode,
  jobId,
  nextAction,
  onRetry,
  compact,
}: {
  title: string
  message: string
  errorCode?: string | null
  jobId?: string
  nextAction?: RenderResult['nextAction']
  onRetry?: () => void
  compact?: boolean
}) {
  return (
    <div className={cn(
      'rounded-xl border-2 border-red-200',
      compact ? 'p-3' : 'p-4 bg-gradient-to-br from-red-50 to-rose-50'
    )}>
      <div className="flex items-start space-x-3">
        <AlertCircle className={cn('text-red-500 shrink-0 mt-0.5', compact ? 'w-4 h-4' : 'w-5 h-5')} />
        <div className="flex-1 min-w-0">
          <h4 className={cn('font-semibold text-slate-800', compact ? 'text-xs' : 'text-sm')}>
            {title}
          </h4>
          <p className={cn('text-red-600 mt-1', compact ? 'text-[11px]' : 'text-sm')}>
            {message}
          </p>
          {!compact && jobId && (
            <p className="text-[10px] text-slate-400 mt-2 font-mono">
              Job: {jobId}
            </p>
          )}
        </div>
      </div>

      <div className={cn('flex items-center space-x-2', compact ? 'mt-2' : 'mt-3')}>
        {nextAction && (
          <a
            href={nextAction.href || '#'}
            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span>{nextAction.label}</span>
          </a>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        )}
      </div>
    </div>
  )
}

function GuidanceCard({
  icon,
  title,
  message,
  nextAction,
  compact,
}: {
  icon: React.ReactNode
  title: string
  message: string
  nextAction?: RenderResult['nextAction']
  compact?: boolean
}) {
  return (
    <div className={cn(
      'rounded-xl border-2 border-amber-200',
      compact ? 'p-3' : 'p-4 bg-gradient-to-br from-amber-50 to-yellow-50'
    )}>
      <div className="flex items-start space-x-3">
        <div className="shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <h4 className={cn('font-semibold text-slate-800', compact ? 'text-xs' : 'text-sm')}>
            {title}
          </h4>
          <p className={cn('text-amber-700 mt-1', compact ? 'text-[11px]' : 'text-sm')}>
            {message}
          </p>
        </div>
      </div>

      {nextAction && (
        <div className={compact ? 'mt-2' : 'mt-3'}>
          <a
            href={nextAction.href || '#'}
            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span>{nextAction.label}</span>
          </a>
        </div>
      )}
    </div>
  )
}

// ─── Debug Overlay ───────────────────────────────────────────

function DebugOverlay({
  result,
  debugData,
  pollCount,
}: {
  result: RenderResult
  debugData: Record<string, unknown> | null
  pollCount: number
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center justify-between text-xs hover:bg-slate-800 transition-colors"
      >
        <span className="flex items-center space-x-2">
          <Bug className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono text-amber-400">Debug</span>
          <span className="text-slate-500">
            {result.jobId ? result.jobId.slice(0, 12) + '...' : 'no job'}
          </span>
        </span>
        <span className="text-slate-500">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 font-mono text-[11px] leading-relaxed border-t border-slate-700">
          {/* RenderResult fields */}
          <div className="pt-2">
            <h5 className="text-amber-400 font-bold mb-1">RenderResult</h5>
            <DebugRow label="jobId" value={result.jobId} />
            <DebugRow label="provider" value={result.provider} />
            <DebugRow label="status" value={result.status} />
            <DebugRow label="progress" value={result.progress} />
            <DebugRow label="error" value={result.error} />
            <DebugRow label="errorCode" value={result.errorCode} />
            <DebugRow label="previewUrl" value={result.previewUrl} />
            <DebugRow label="thumbnailUrl" value={result.thumbnailUrl} />
            <DebugRow label="frames" value={result.frames ? `${result.frames.length} scenes` : null} />
            <DebugRow label="createdAt" value={result.createdAt} />
            <DebugRow label="updatedAt" value={result.updatedAt} />
            {result.nextAction && (
              <DebugRow label="nextAction" value={`${result.nextAction.label} → ${result.nextAction.href || result.nextAction.action}`} />
            )}
          </div>

          {/* Polling info */}
          <div>
            <h5 className="text-amber-400 font-bold mb-1">Polling</h5>
            <DebugRow label="pollCount" value={pollCount} />
            <DebugRow label="isTerminal" value={isTerminal(result.status)} />
          </div>

          {/* Server debug data */}
          {debugData && (
            <div>
              <h5 className="text-amber-400 font-bold mb-1">Server Job</h5>
              <DebugRow label="provider" value={debugData.provider} />
              <DebugRow label="providerJobId" value={debugData.providerJobId} />
              <DebugRow label="providerStatus" value={debugData.providerStatus} />
              <DebugRow label="dbStatus" value={debugData.dbStatus} />
              <DebugRow label="errorCode" value={debugData.errorCode} />
              <DebugRow label="startedAt" value={debugData.startedAt} />
              <DebugRow label="completedAt" value={debugData.completedAt} />
              <DebugRow label="estimatedCost" value={debugData.estimatedCost} />
              <DebugRow label="actualCost" value={debugData.actualCost} />
              <DebugRow label="retryCount" value={debugData.retryCount} />

              {Boolean(debugData.renderLog) && typeof debugData.renderLog === 'object' && (
                <>
                  <h5 className="text-amber-400 font-bold mb-1 mt-2">Render Ledger</h5>
                  {Object.entries(debugData.renderLog as Record<string, string | number | null>).map(([k, v]) => (
                    <DebugRow key={k} label={k} value={v} />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DebugRow({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null
  const display = typeof value === 'string' ? value
    : typeof value === 'number' ? String(value)
    : typeof value === 'boolean' ? String(value)
    : JSON.stringify(value)
  return (
    <div className="flex">
      <span className="text-slate-500 w-28 shrink-0">{label}:</span>
      <span className="text-slate-200 break-all">{display}</span>
    </div>
  )
}
