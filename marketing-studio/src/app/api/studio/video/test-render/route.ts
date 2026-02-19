/**
 * Video Test Render API
 *
 * POST /api/studio/video/test-render — Start a 10-second test render
 * GET  /api/studio/video/test-render?taskId=X&provider=Y — Poll async renders
 *
 * IMPORTANT: This route makes REAL API calls that cost real money.
 * The cost gate in the UI must confirm before calling this endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getProvider, estimateTestRenderCost, snapToAllowedDuration } from '@/lib/shared/video-providers'
import { inngest } from '@/lib/inngest/client'

interface TestRenderRequest {
  providerId: string
  prompt: string
  durationSeconds?: number
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body: TestRenderRequest = await request.json()
    const { providerId, prompt, durationSeconds = 10 } = body

    const provider = getProvider(providerId)
    if (!provider) {
      return NextResponse.json({ success: false, error: `Unknown provider: ${providerId}` }, { status: 400 })
    }

    if (!provider.supportsTestRender) {
      return NextResponse.json({ success: false, error: `${provider.name} does not support test renders` }, { status: 400 })
    }

    const apiKey = process.env[provider.apiKeyEnvVar]
    if (!apiKey) {
      return NextResponse.json({ success: false, error: `${provider.name} API key not configured` }, { status: 400 })
    }

    const testDuration = snapToAllowedDuration(providerId, Math.min(durationSeconds, provider.maxDurationSeconds))
    const estimatedCost = estimateTestRenderCost(providerId)

    let videoUrl: string | null = null
    const actualCost = estimatedCost
    const startTime = Date.now()

    switch (provider.id) {
      case 'runway-gen4': {
        const runwayRes = await fetch('https://api.dev.runwayml.com/v1/text_to_video', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-Runway-Version': '2024-11-06',
          },
          body: JSON.stringify({
            model: 'gen4.5',
            promptText: prompt.slice(0, 512) || 'A professional cinematic video',
            duration: testDuration,
            ratio: '1280:720',
          }),
        })

        if (!runwayRes.ok) {
          const err = await runwayRes.text()
          return NextResponse.json({
            success: false,
            error: `Runway API error: ${runwayRes.status} — ${err}`,
          }, { status: 502 })
        }

        const runwayData = await runwayRes.json()
        videoUrl = runwayData.output?.[0] || null

        // If Runway returns a task (async), fire durable polling and return task info
        if (runwayData.id && !videoUrl) {
          await inngest.send({
            name: 'studio/video.render.requested',
            data: {
              taskId: runwayData.id,
              providerId: provider.id,
              userId: session.user.id || session.user.email || 'unknown',
              estimatedCost,
              renderType: 'test' as const,
              prompt,
              durationSeconds: testDuration,
            },
          })
          return NextResponse.json({
            success: true,
            status: 'processing',
            taskId: runwayData.id,
            provider: provider.id,
            estimatedCost,
            pollUrl: `/api/studio/video/test-render?taskId=${runwayData.id}&provider=${provider.id}`,
          })
        }
        break
      }

      case 'sora-2': {
        // Sora 2 API: POST /v1/videos  →  poll GET /v1/videos/{id}
        const soraRes = await fetch('https://api.openai.com/v1/videos', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sora-2',
            prompt: prompt.slice(0, 1000),
            seconds: String(testDuration),
            size: '1280x720',
          }),
        })

        if (!soraRes.ok) {
          const err = await soraRes.text()
          return NextResponse.json({
            success: false,
            error: `Sora API error: ${soraRes.status} — ${err}`,
          }, { status: 502 })
        }

        const soraData = await soraRes.json()

        // Sora is always async — fire durable polling and return task info
        if (soraData.id) {
          await inngest.send({
            name: 'studio/video.render.requested',
            data: {
              taskId: soraData.id,
              providerId: provider.id,
              userId: session.user.id || session.user.email || 'unknown',
              estimatedCost,
              renderType: 'test' as const,
              prompt,
              durationSeconds: testDuration,
            },
          })
          return NextResponse.json({
            success: true,
            status: 'processing',
            taskId: soraData.id,
            provider: provider.id,
            estimatedCost,
            pollUrl: `/api/studio/video/test-render?taskId=${soraData.id}&provider=${provider.id}`,
          })
        }

        // Unexpected: no id returned
        return NextResponse.json({
          success: false,
          error: 'Sora API did not return a video id',
        }, { status: 502 })
      }

      default:
        return NextResponse.json({
          success: false,
          error: `Test render not implemented for provider: ${provider.id}`,
        }, { status: 501 })
    }

    const renderTimeMs = Date.now() - startTime

    return NextResponse.json({
      success: true,
      status: 'complete',
      videoUrl,
      provider: provider.id,
      providerName: provider.name,
      durationSeconds: testDuration,
      estimatedCost,
      actualCost,
      renderTimeMs,
    })
  } catch (error) {
    console.error('[video/test-render] Error:', error)
    return NextResponse.json({ success: false, error: 'Test render failed' }, { status: 500 })
  }
}

// ── GET handler for polling async renders (Runway) ─────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // Allow Inngest internal calls (durable polling) or authenticated users
    const inngestHeader = request.headers.get('x-inngest-internal')
    const isInngestCall = inngestHeader && inngestHeader === process.env.INNGEST_SIGNING_KEY

    if (!isInngestCall) {
      const session = await getServerSession(authOptions)
      if (!session?.user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
      }
    }

    const { searchParams } = new URL(request.url)
    const taskId = searchParams.get('taskId')
    const providerId = searchParams.get('provider')

    if (!taskId || !providerId) {
      return NextResponse.json({ success: false, error: 'taskId and provider required' }, { status: 400 })
    }

    const provider = getProvider(providerId)
    if (!provider) {
      return NextResponse.json({ success: false, error: 'Unknown provider' }, { status: 400 })
    }

    const apiKey = process.env[provider.apiKeyEnvVar]
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 400 })
    }

    switch (provider.id) {
      case 'runway-gen4': {
        const pollRes = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'X-Runway-Version': '2024-11-06',
          },
        })
        const pollData = await pollRes.json()

        if (pollData.status === 'SUCCEEDED') {
          return NextResponse.json({
            success: true,
            status: 'complete',
            videoUrl: pollData.output?.[0] || null,
            provider: provider.id,
          })
        } else if (pollData.status === 'FAILED') {
          return NextResponse.json({
            success: false,
            status: 'failed',
            error: pollData.failure || 'Render failed',
          })
        } else {
          return NextResponse.json({
            success: true,
            status: 'processing',
            progress: pollData.progress || 0,
          })
        }
      }
      case 'sora-2': {
        // Poll: GET /v1/videos/{id}
        const pollRes = await fetch(`https://api.openai.com/v1/videos/${taskId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        })
        const pollData = await pollRes.json()

        if (pollData.status === 'completed') {
          // Download video content: GET /v1/videos/{id}/content
          let downloadedUrl: string | null = null
          try {
            const dlRes = await fetch(`https://api.openai.com/v1/videos/${taskId}/content`, {
              headers: { 'Authorization': `Bearer ${apiKey}` },
            })
            if (dlRes.ok) {
              const buf = Buffer.from(await dlRes.arrayBuffer())
              downloadedUrl = `data:video/mp4;base64,${buf.toString('base64')}`
            }
          } catch {
            // Fall back to null — UI will show success without inline preview
          }

          return NextResponse.json({
            success: true,
            status: 'complete',
            videoUrl: downloadedUrl,
            provider: provider.id,
          })
        } else if (pollData.status === 'failed') {
          return NextResponse.json({
            success: false,
            status: 'failed',
            error: pollData.error?.message || 'Sora render failed',
          })
        } else {
          return NextResponse.json({
            success: true,
            status: 'processing',
            progress: pollData.progress || 0,
          })
        }
      }
      default:
        return NextResponse.json({ success: false, error: 'Polling not supported for this provider' }, { status: 400 })
    }
  } catch (error) {
    console.error('[video/test-render/poll] Error:', error)
    return NextResponse.json({ success: false, error: 'Poll failed' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
