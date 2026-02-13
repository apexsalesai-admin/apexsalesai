/**
 * Mia Script Analysis API (P20-B: AI-first with regex fallback)
 *
 * POST /api/studio/mia/analyze
 * 1. Try Claude Sonnet AI analysis (creative intelligence)
 * 2. Run deterministic regex analysis (cross-check)
 * 3. Merge: AI provides creative fields, regex validates structure
 * 4. Fall back to regex-only if AI fails
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { analyzeScript } from '@/lib/studio/mia-script-analyzer'
import { analyzeScriptWithAI } from '@/lib/studio/mia-ai-analyzer'
import { generateScriptAnalysis, generateDurationWarning, generateBudgetWarning } from '@/lib/studio/mia-messages'
import { checkRenderBudget } from '@/lib/providers/video/budget'
import type { MiaMessage, MiaCopilotMode } from '@/lib/studio/mia-types'
import type { ScriptAnalysisResult } from '@/lib/studio/mia-script-analyzer'

/** Map integration type to provider names */
const TYPE_TO_PROVIDERS: Record<string, string[]> = {
  RUNWAY: ['runway'],
  OPENAI: ['sora'],
  HEYGEN: ['heygen'],
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contentId, versionId, targetPlatform, mode } = body as {
      contentId: string
      versionId: string
      targetPlatform?: string
      mode?: MiaCopilotMode
    }

    if (!contentId || !versionId) {
      return NextResponse.json(
        { success: false, error: 'contentId and versionId are required' },
        { status: 400 },
      )
    }

    // Fetch version script
    const version = await prisma.studioContentVersion.findUnique({
      where: { id: versionId },
      select: { script: true },
    })

    if (!version?.script?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Version has no script content' },
        { status: 400 },
      )
    }

    const workspace = await getOrCreateWorkspace(session.user.id)

    // Load connected providers
    const integrations = await prisma.studioIntegration.findMany({
      where: { workspaceId: workspace.id, status: 'CONNECTED' },
      select: { type: true },
    })
    const connectedProviders = integrations
      .flatMap(i => TYPE_TO_PROVIDERS[String(i.type)] || [])

    // Dev mode: also check env vars
    if (process.env.NODE_ENV === 'development') {
      if (process.env.RUNWAY_API_KEY && !connectedProviders.includes('runway')) {
        connectedProviders.push('runway')
      }
      if (process.env.OPENAI_API_KEY && !connectedProviders.includes('sora')) {
        connectedProviders.push('sora')
      }
      if (process.env.HEYGEN_API_KEY && !connectedProviders.includes('heygen')) {
        connectedProviders.push('heygen')
      }
    }

    // Get budget remaining
    const budget = await checkRenderBudget(workspace.id, 0)
    const remaining = budget.monthlyLimit - budget.monthlySpent

    const platform = targetPlatform || 'general'
    const copilotMode: MiaCopilotMode = mode || 'guided'

    // ── AI-first analysis with regex fallback ────────────────
    let analysis: ScriptAnalysisResult

    // Always run regex as baseline (fast, deterministic)
    const regexAnalysis = analyzeScript(
      version.script,
      platform,
      connectedProviders,
      remaining,
    )

    // Try AI analysis
    const aiAnalysis = await analyzeScriptWithAI(
      version.script,
      platform,
      connectedProviders,
      remaining,
    )

    if (aiAnalysis) {
      // ── Deterministic validator cross-check ──────────────
      // AI provides creative intelligence; regex validates structure
      const sceneDiff = Math.abs(aiAnalysis.scenes.length - regexAnalysis.scenes.length)

      if (sceneDiff > 3) {
        // AI scene count diverges wildly from regex — trust regex structure, keep AI creativity
        console.log(`[MIA:AI:CROSSCHECK] Scene count divergence: AI=${aiAnalysis.scenes.length} regex=${regexAnalysis.scenes.length} — merging`)
        analysis = {
          ...regexAnalysis,
          overallFeedback: aiAnalysis.overallFeedback,
          suggestedRewrites: aiAnalysis.suggestedRewrites,
          narrativeArc: aiAnalysis.narrativeArc,
          aiGenerated: true,
          // Overlay AI creative fields onto regex scenes where possible
          scenes: regexAnalysis.scenes.map((regexScene, i) => {
            const aiScene = aiAnalysis.scenes[i]
            return {
              ...regexScene,
              visualDirection: aiScene?.visualDirection,
              creativeFeedback: aiScene?.creativeFeedback,
              strengthRating: aiScene?.strengthRating,
            }
          }),
        }
      } else {
        // AI analysis is structurally sound — use it
        analysis = aiAnalysis
      }

      console.log(`[MIA:ANALYZE] AI-powered analysis — scenes=${analysis.scenes.length} ai=true arc="${analysis.narrativeArc}"`)
    } else {
      // AI failed — pure regex fallback
      analysis = regexAnalysis
      console.log(`[MIA:ANALYZE] Regex fallback — scenes=${analysis.scenes.length} ai=false`)
    }

    // Build Mia messages
    const miaMessages: MiaMessage[] = []

    // Script analysis message (always)
    miaMessages.push(generateScriptAnalysis(analysis, copilotMode))

    // Duration warnings
    for (const warning of analysis.warnings) {
      if (warning.includes('max single render')) {
        miaMessages.push(generateDurationWarning(analysis.totalEstimatedDuration, 8))
      }
    }

    // Budget warning
    if (analysis.totalEstimatedCost > remaining) {
      miaMessages.push(generateBudgetWarning(analysis.totalEstimatedCost, remaining))
    }

    console.log(
      `[MIA:ANALYZE] contentId=${contentId} versionId=${versionId} scenes=${analysis.scenes.length} totalDuration=${analysis.totalEstimatedDuration}s totalCost=$${analysis.totalEstimatedCost.toFixed(2)}`,
    )

    return NextResponse.json({
      success: true,
      data: analysis,
      miaMessages,
    })
  } catch (error) {
    console.error('[API:mia/analyze] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Script analysis failed' },
      { status: 500 },
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
