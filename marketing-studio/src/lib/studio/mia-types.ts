/**
 * Mia Co-Pilot Type System
 *
 * Types for the contextual AI creative director that guides users
 * through video production: script analysis, scene planning,
 * provider recommendations, and post-render review.
 */

export type MiaMessageType =
  | 'greeting'
  | 'script-analysis'
  | 'recommendation'
  | 'warning'
  | 'question'
  | 'status'
  | 'review'
  | 'celebration'

export type MiaConfidence = 'high' | 'medium' | 'low'

export interface MiaActionButton {
  label: string
  action: string
  variant: 'primary' | 'secondary' | 'ghost'
  data?: Record<string, unknown>
}

export interface MiaMessage {
  id: string
  type: MiaMessageType
  content: string
  timestamp: string              // ISO string (not Date — serialization-safe)
  confidence?: MiaConfidence
  actions?: MiaActionButton[]
  metadata?: {
    sceneCount?: number
    estimatedDuration?: number
    estimatedCost?: number
    provider?: string
    model?: string
    scenes?: MiaSceneAnalysis[]
    suggestedRewrites?: Array<{ sceneNumber: number; original: string; rewrite: string; reason: string }>
    narrativeArc?: string
    aiGenerated?: boolean
  }
}

export interface MiaSceneAnalysis {
  sceneNumber: number
  label: string
  scriptExcerpt: string
  estimatedDuration: number
  recommendedProvider: string
  recommendedModel?: string
  estimatedCost: number
  aspectRatio: string
  hasDialogue: boolean
  hasBRoll: boolean
  // AI-enriched fields (P20-B)
  visualDirection?: string
  creativeFeedback?: string
  strengthRating?: 'strong' | 'adequate' | 'needs-work'
}

export type MiaCopilotMode = 'guided' | 'autopilot'

export type MiaWorkflowStep =
  | 'idle'
  | 'analyzing-script'
  | 'awaiting-approval'
  | 'rendering'
  | 'reviewing'
  | 'complete'

export interface MiaRenderPlan {
  scenes: MiaScenePlan[]
  totalEstimatedCost: number
  totalEstimatedDuration: number
  requiresStitching: boolean
}

export interface MiaScenePlan {
  sceneNumber: number
  provider: string
  model?: string
  duration: number
  ratio: string
  prompt: string
  estimatedCost: number
}

export interface MiaCopilotState {
  mode: MiaCopilotMode
  messages: MiaMessage[]
  isTyping: boolean
  currentStep: MiaWorkflowStep
  scriptAnalysis: MiaSceneAnalysis[] | null
  renderPlan: MiaRenderPlan | null
}

export interface MiaGreetingContext {
  title: string
  contentType: string
  channels: string[]
  aiTone?: string | null
  scriptPreview?: string
  wordCount?: number
}
