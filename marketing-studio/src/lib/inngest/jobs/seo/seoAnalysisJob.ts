/**
 * SEO Analysis Job
 *
 * Handles async SEO analysis for content topics.
 * Will integrate with SerpAPI in future phase.
 */

import { inngest } from '../../client'
import { prisma } from '@/lib/db'
import type { JobResult, SeoJobOutput } from '../../types'

export const seoAnalysisJob = inngest.createFunction(
  {
    id: 'seo-analysis',
    name: 'SEO Content Analysis',
    retries: 2,
    concurrency: {
      limit: 20, // SEO queries are lightweight
    },
  },
  { event: 'studio/seo.analyze' },
  async ({ event, step }): Promise<JobResult<SeoJobOutput>> => {
    const startTime = Date.now()
    const { topic, keywords, competitors, workspaceId } = event.data as {
      topic: string
      keywords?: string[]
      competitors?: string[]
      workspaceId?: string
    }

    console.log('[Inngest:SEO] Job started', {
      topic,
      keywordCount: keywords?.length || 0,
      competitorCount: competitors?.length || 0,
      eventId: event.id,
    })

    // Step 1: Log analysis request and track usage (only if workspaceId provided)
    await step.run('log-request', async () => {
      console.log('[Inngest:SEO] Analyzing topic:', topic)
      console.log('[Inngest:SEO] Target keywords:', keywords || [])
      console.log('[Inngest:SEO] Competitors to analyze:', competitors || [])

      // Track usage for billing/limits (only if workspaceId provided)
      if (workspaceId) {
        const now = new Date()
        const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

        await prisma.studioUsageRecord.create({
          data: {
            workspaceId,
            resourceType: 'seo_analysis',
            provider: 'serpapi',
            referenceType: 'seo_job',
            referenceId: event.id,
            period,
          },
        })
      }
    })

    // Step 2: Generate placeholder SEO analysis
    // In future phase, this will call SerpAPI
    const analysis = await step.run('analyze-topic', async () => {
      // Placeholder structured SEO result
      return {
        difficulty: 45, // 0-100
        searchVolume: 12000,
        trendDirection: 'up' as const,
        relatedKeywords: [
          `${topic} best practices`,
          `${topic} examples`,
          `${topic} guide`,
          `how to ${topic}`,
          `${topic} tips`,
        ],
        contentSuggestions: [
          `Create a comprehensive guide on ${topic}`,
          `Address common pain points related to ${topic}`,
          `Include case studies and real examples`,
          `Optimize for featured snippets with Q&A format`,
        ],
        competitorInsights: competitors?.map((domain: string, i: number) => ({
          domain,
          ranking: i + 1,
          strengths: ['Strong backlink profile', 'Regular content updates'],
        })),
      }
    })

    const durationMs = Date.now() - startTime

    console.log('[Inngest:SEO] Job completed', {
      topic,
      difficulty: analysis.difficulty,
      durationMs,
    })

    return {
      success: true,
      data: {
        topic,
        analysis,
        generatedAt: new Date().toISOString(),
      },
      durationMs,
      timestamp: new Date().toISOString(),
    }
  }
)
