/**
 * Inngest Client Configuration
 *
 * Central client for all Inngest job orchestration in Marketing Studio.
 * Supports publishing, video generation, SEO analysis, and workflow execution.
 */

import { Inngest } from 'inngest'

// Environment-aware configuration
const isDev = process.env.NODE_ENV === 'development'
const isVercel = !!process.env.VERCEL

export const inngest = new Inngest({
  id: 'marketing-studio',
  // In development, events are sent to the local dev server
  // In production on Vercel, Inngest Cloud handles routing
  ...(isDev && !isVercel && {
    isDev: true,
  }),
})

// Event type definitions for type-safe event sending
export type StudioEvents = {
  // System events
  'studio/hello': { data: { message?: string } }

  // Publishing events
  'studio/publish.content': {
    data: {
      contentId: string
      channels: string[]
      scheduledFor?: string
    }
  }
  'studio/publish.retry': {
    data: {
      jobId: string
      attempt: number
    }
  }

  // Video generation events
  'studio/video.generate': {
    data: {
      jobId: string       // StudioVideoJob ID (pre-created by API)
      versionId: string   // StudioContentVersion ID
      workspaceId: string
    }
  }
  'studio/video.status': {
    data: {
      jobId: string
    }
  }

  // SEO events
  'studio/seo.analyze': {
    data: {
      topic: string
      keywords?: string[]
      competitors?: string[]
    }
  }

  // Repurposing events
  'studio/repurpose.content': {
    data: {
      sourceContentId: string
      targetChannels: string[]
      adaptTone?: boolean
    }
  }

  // Analytics events
  'studio/analytics.aggregate': {
    data: {
      workspaceId: string
      dateRange: { start: string; end: string }
    }
  }

  // Workflow events
  'studio/workflow.execute': {
    data: {
      workflowId: string
      triggerId: string
      payload: Record<string, unknown>
    }
  }
}
