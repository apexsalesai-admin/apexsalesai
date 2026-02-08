/**
 * Inngest Job Type Definitions
 *
 * All job inputs and outputs must be typed with TypeScript interfaces.
 * These types ensure type safety across the job orchestration layer.
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

export interface JobResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  durationMs: number
  timestamp: string
}

export interface JobContext {
  jobId: string
  attempt: number
  startedAt: string
}

// ============================================================================
// PUBLISH JOB TYPES
// ============================================================================

export interface PublishJobInput {
  contentId: string
  channels: string[]
  scheduledFor?: string
}

export interface PublishJobOutput {
  contentId: string
  results: {
    channel: string
    success: boolean
    postId?: string
    error?: string
  }[]
}

// ============================================================================
// VIDEO JOB TYPES
// ============================================================================

export interface VideoJobInput {
  script: string
  style?: 'professional' | 'casual' | 'energetic' | 'minimal'
  duration?: number // seconds
  outputFormat?: 'mp4' | 'webm'
  voiceover?: {
    enabled: boolean
    voice?: string
  }
}

export interface VideoJobOutput {
  jobId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  provider: string
  estimatedDuration?: number
  outputUrl?: string
}

// ============================================================================
// SEO JOB TYPES
// ============================================================================

export interface SeoJobInput {
  topic: string
  keywords?: string[]
  competitors?: string[]
  targetRegion?: string
}

export interface SeoJobOutput {
  topic: string
  analysis: {
    difficulty: number // 0-100
    searchVolume: number
    trendDirection: 'up' | 'down' | 'stable'
    relatedKeywords: string[]
    contentSuggestions: string[]
    competitorInsights?: {
      domain: string
      ranking: number
      strengths: string[]
    }[]
  }
  generatedAt: string
}

// ============================================================================
// REPURPOSE JOB TYPES
// ============================================================================

export interface RepurposeJobInput {
  sourceContentId: string
  targetChannels: string[]
  adaptTone?: boolean
  preserveHashtags?: boolean
}

export interface RepurposeJobOutput {
  sourceContentId: string
  variations: {
    channel: string
    title: string
    body: string
    hashtags: string[]
    callToAction: string
  }[]
}

// ============================================================================
// ANALYTICS JOB TYPES
// ============================================================================

export interface AnalyticsJobInput {
  workspaceId: string
  dateRange: {
    start: string
    end: string
  }
  metrics?: string[]
}

export interface AnalyticsJobOutput {
  workspaceId: string
  period: {
    start: string
    end: string
  }
  aggregates: {
    totalPosts: number
    totalEngagement: number
    totalReach: number
    topPerformingContent: string[]
    channelBreakdown: Record<string, {
      posts: number
      engagement: number
      reach: number
    }>
  }
}

// ============================================================================
// WORKFLOW JOB TYPES
// ============================================================================

export interface WorkflowJobInput {
  workflowId: string
  triggerId: string
  payload: Record<string, unknown>
}

export interface WorkflowJobOutput {
  workflowId: string
  executionId: string
  status: 'completed' | 'failed' | 'pending_approval'
  nodesExecuted: string[]
  result?: Record<string, unknown>
}
