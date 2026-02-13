/**
 * Mia Render Plan Execution API
 *
 * POST /api/studio/mia/render-plan
 * Creates per-scene video jobs from a Mia render plan.
 * No DB migration — uses config JSON for scene metadata.
 * Concurrency guard: max 2 concurrent Inngest events.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { checkRenderBudget, recordRenderSubmission } from '@/lib/providers/video/budget'
import { getVideoProvider } from '@/lib/providers/video/registry'
import { inngest } from '@/lib/inngest/client'
import type { MiaRenderPlan } from '@/lib/studio/mia-types'

const MAX_CONCURRENT = 2

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contentId, versionId, renderPlan } = body as {
      contentId: string
      versionId: string
      renderPlan: MiaRenderPlan
    }

    if (!contentId || !versionId || !renderPlan?.scenes?.length) {
      return NextResponse.json(
        { success: false, error: 'contentId, versionId, and renderPlan are required' },
        { status: 400 },
      )
    }

    const workspace = await getOrCreateWorkspace(session.user.id)

    // Budget check
    const budget = await checkRenderBudget(workspace.id, renderPlan.totalEstimatedCost)
    if (!budget.allowed) {
      return NextResponse.json(
        { success: false, error: budget.reason || 'Budget exceeded' },
        { status: 429 },
      )
    }

    // Fetch version for script text
    const version = await prisma.studioContentVersion.findUnique({
      where: { id: versionId },
      select: { script: true },
    })
    if (!version) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 },
      )
    }

    // Split script into scene prompts using the analysis
    const fullScript = version.script || ''
    const sceneTexts = splitScriptToScenes(fullScript, renderPlan.scenes.length)

    // Create jobs for each scene (batch, respecting concurrency)
    const sceneJobIds: Record<number, string> = {}
    const jobPromises: Array<Promise<void>> = []

    for (let i = 0; i < renderPlan.scenes.length; i++) {
      const scene = renderPlan.scenes[i]
      const scenePrompt = sceneTexts[i] || scene.prompt || fullScript

      // Determine provider and cost
      const provider = getVideoProvider(scene.provider)
      const costEst = provider
        ? provider.estimateCost(scene.duration)
        : { usd: scene.estimatedCost, credits: 0 }

      const createJob = async () => {
        // Create video job with scene metadata in config
        const job = await prisma.studioVideoJob.create({
          data: {
            workspaceId: workspace.id,
            type: 'TEXT_TO_VIDEO',
            status: 'QUEUED',
            contentId,
            inputPrompt: scenePrompt,
            inputScript: scenePrompt,
            config: {
              sceneNumber: scene.sceneNumber,
              sceneLabel: `Scene ${scene.sceneNumber}`,
              totalScenes: renderPlan.scenes.length,
              aspectRatio: scene.ratio,
              duration: scene.duration,
              model: scene.model || undefined,
              miaRenderPlan: true,
            },
            provider: scene.provider,
            estimatedCost: costEst.usd,
          },
        })

        // Link job to version
        await prisma.studioContentVersion.update({
          where: { id: versionId },
          data: { videoJobId: job.id },
        })

        // Record in budget ledger
        const renderLogId = await recordRenderSubmission({
          workspaceId: workspace.id,
          videoJobId: job.id,
          provider: scene.provider,
          durationSeconds: scene.duration,
          aspectRatio: scene.ratio,
          promptLength: scenePrompt.length,
          estimatedCostUsd: costEst.usd,
        })

        // Send Inngest event
        await inngest.send({
          name: 'studio/video.generate',
          data: {
            jobId: job.id,
            versionId,
            workspaceId: workspace.id,
            provider: scene.provider,
            model: scene.model || undefined,
            durationSeconds: scene.duration,
            aspectRatio: scene.ratio,
            renderLogId,
          },
        })

        sceneJobIds[scene.sceneNumber] = job.id

        console.log(
          `[MIA:SCENE:CREATE] sceneNumber=${scene.sceneNumber} provider=${scene.provider} duration=${scene.duration}s cost=$${costEst.usd.toFixed(2)} jobId=${job.id}`,
        )
      }

      jobPromises.push(createJob())

      // Concurrency gate: wait for batch to clear before next batch
      if (jobPromises.length >= MAX_CONCURRENT) {
        await Promise.all(jobPromises)
        jobPromises.length = 0
      }
    }

    // Finish remaining
    if (jobPromises.length > 0) {
      await Promise.all(jobPromises)
    }

    console.log(
      `[MIA:ORCHESTRATE] contentId=${contentId} scenes=${renderPlan.scenes.length} totalCost=$${renderPlan.totalEstimatedCost.toFixed(2)}`,
    )

    return NextResponse.json({
      success: true,
      sceneJobIds,
      totalScenes: renderPlan.scenes.length,
      totalEstimatedCost: renderPlan.totalEstimatedCost,
    })
  } catch (error) {
    console.error('[API:mia/render-plan] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to execute render plan' },
      { status: 500 },
    )
  }
}

/**
 * Split script text into N scene chunks.
 * Uses double-newline paragraphs, or evenly splits by word count.
 */
function splitScriptToScenes(script: string, sceneCount: number): string[] {
  if (sceneCount <= 1) return [script]

  // Try paragraph-based splitting first
  const paragraphs = script.split(/\n\s*\n/).filter(s => s.trim().length > 0)
  if (paragraphs.length >= sceneCount) {
    // Distribute paragraphs across scenes
    const scenes: string[] = []
    const perScene = Math.ceil(paragraphs.length / sceneCount)
    for (let i = 0; i < sceneCount; i++) {
      const start = i * perScene
      const end = Math.min(start + perScene, paragraphs.length)
      scenes.push(paragraphs.slice(start, end).join('\n\n'))
    }
    return scenes
  }

  // Fall back to word-based splitting
  const words = script.split(/\s+/)
  const perScene = Math.ceil(words.length / sceneCount)
  const scenes: string[] = []
  for (let i = 0; i < sceneCount; i++) {
    const start = i * perScene
    const end = Math.min(start + perScene, words.length)
    scenes.push(words.slice(start, end).join(' '))
  }
  return scenes
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
