/**
 * Content Draft Types — Video Render, Media, SEO
 *
 * Used by content-creator.tsx and video-preview-player.tsx.
 * Pure types + one factory function (no runtime deps).
 */

// ── Video Render ──────────────────────────────────────────────

export type VideoRenderStatus =
  | 'NOT_REQUESTED'
  | 'QUEUED'
  | 'RENDERING'
  | 'READY'
  | 'FAILED'

export interface VideoRenderState {
  status: VideoRenderStatus
  jobId?: string
  previewUrl?: string
  thumbnailUrl?: string
  errorMessage?: string
  /** 0-100 progress percentage */
  progress?: number
}

export interface VideoScene {
  index: number
  description: string
  durationSeconds: number
  visualPrompt?: string
  voiceoverText?: string
  bRollSuggestion?: string
}

// ── Media Attachments ─────────────────────────────────────────

export interface MediaAttachment {
  url: string
  filename: string
  mimeType: string
  sizeBytes: number
  thumbnailUrl?: string
}

// ── SEO Metadata ──────────────────────────────────────────────

export interface SEOMeta {
  metaTitle?: string
  metaDescription?: string
  keywords: string[]
  readabilityScore?: number
}

// ── Factory ───────────────────────────────────────────────────

export function createEmptyVideoRenderState(): VideoRenderState {
  return { status: 'NOT_REQUESTED' }
}
