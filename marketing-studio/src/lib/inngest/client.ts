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

  // Video render events (test render polling)
  'studio/video.render.requested': {
    data: {
      taskId: string
      providerId: string
      userId: string
      estimatedCost: number
      renderType: 'test' | 'full'
      prompt: string
      durationSeconds: number
      contentId?: string
    }
  }
  'studio/video.render.completed': {
    data: {
      userId: string
      taskId: string
      providerId: string
      videoUrl: string
      renderType: string
      actualCost: number
      renderTimeMs: number
      contentId?: string
    }
  }
  'studio/video.render.failed': {
    data: {
      userId: string
      taskId: string
      providerId: string
      error: string
      renderType: string
      contentId?: string
    }
  }

  // Content scheduling events
  'studio/content.schedule.requested': {
    data: {
      userId: string
      contentId: string
      title: string
      body: string
      channels: string[]
      scheduledAt: string
      hashtags?: string[]
      callToAction?: string
      videoUrl?: string
    }
  }
  'studio/content.published': {
    data: {
      userId: string
      contentId: string
      channels: string[]
      publishedAt: string
      results: Array<{ channel: string; success: boolean; postUrl?: string; error?: string }>
    }
  }

  // Fact-check events
  'studio/content.factcheck.requested': {
    data: {
      userId: string
      contentId: string
      title: string
      body: string
    }
  }
  'studio/content.factcheck.completed': {
    data: {
      userId: string
      contentId: string
      score: number
      verdict: 'clean' | 'caution' | 'warning'
      claims: Array<{ id: number; text: string; category: string }>
      verifications: Array<{ claimId: number; claim: string; verified: boolean; confidence: number; source?: string; correction?: string }>
      verifiedCount?: number
      totalClaims?: number
      checkedAt: string
    }
  }

  // Direct channel publishing (P25-A — PublishingChannel model)
  'studio/publish.to-channel': {
    data: {
      publicationId: string
      channelId: string
      userId: string
      contentId: string
      variantId?: string
      text: string
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
