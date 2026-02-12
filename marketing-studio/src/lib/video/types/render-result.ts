/**
 * Unified Render Result Contract
 *
 * Every provider adapter and every UI component agrees on this shape.
 * This is the "truth" object that flows from backend to frontend.
 */

export type RenderStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'awaiting_provider'  // provider not configured
  | 'budget_exceeded'

export interface RenderResult {
  jobId: string
  provider: string
  status: RenderStatus

  // Visible outputs (at least one should be non-null on 'completed')
  previewUrl?: string | null     // playable video URL
  outputUrl?: string | null      // final downloadable URL
  thumbnailUrl?: string | null   // poster frame
  frames?: StoryboardFrame[] | null // storyboard frame data (for template)

  // Progress
  progress?: number | null       // 0-100, only from real provider polling
  estimatedSeconds?: number | null

  // Error handling
  error?: string | null          // human-readable error message
  errorCode?: string | null      // machine-readable (e.g., 'MISSING_API_KEY', 'BUDGET_EXCEEDED')

  // Next action guidance
  nextAction?: {
    label: string                // e.g., "Connect Runway API Key"
    href?: string                // e.g., "/studio/settings/integrations"
    action?: string              // e.g., "retry" | "connect_provider" | "upgrade"
  } | null

  // Metadata
  createdAt: string
  updatedAt: string
  durationSeconds?: number | null
}

export interface StoryboardFrame {
  sceneNumber: number
  text: string
  direction: string              // e.g., "Wide shot of city" or "Scene 1"
  backgroundColor: string        // hex color from palette
}
