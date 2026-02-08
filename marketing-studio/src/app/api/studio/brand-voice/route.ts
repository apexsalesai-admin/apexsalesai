/**
 * Brand Voice API — P11 aligned
 *
 * CRUD for StudioBrandGuardrails using correct Prisma field names.
 * All writes require workspace authorization via membership.
 *
 * GET  /api/studio/brand-voice?workspaceId=xxx
 * POST /api/studio/brand-voice
 *
 * Maps the UI model (brandName, tones, industry, targetAudience, forbiddenPhrases,
 * ctaStyle, industryContext) to the DB schema (voiceTones, writingStyle, doNotSayList,
 * ctaStyle, targetAudiences).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { assertWorkspaceAccess } from '@/lib/workspace'
import { z } from 'zod'

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
}

/**
 * Shape stored in writingStyle (JSON string).
 * Holds the UI-level brand identity fields that don't have dedicated columns.
 */
interface WritingStyleData {
  brandName?: string
  industry?: string
  industryContext?: string
  ctaStyleLabel?: string
}

const BrandVoiceSchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId is required'),
  brandName: z.string().optional().default(''),
  tones: z.array(z.string()).min(1).max(3).optional().default(['professional']),
  industry: z.string().optional().default(''),
  industryContext: z.string().optional().default(''),
  targetAudience: z.string().optional().default(''),
  forbiddenPhrases: z.string().optional().default(''),
  ctaStyle: z.string().optional().default('direct'),
})

/**
 * GET — Load brand voice for a workspace
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: NO_CACHE_HEADERS }
      )
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'workspaceId is required' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    // Workspace auth
    const allowed = await assertWorkspaceAccess({
      workspaceId,
      userId: session.user.id,
    })
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Workspace access denied' },
        { status: 403, headers: NO_CACHE_HEADERS }
      )
    }

    const record = await prisma.studioBrandGuardrails.findUnique({
      where: { workspaceId },
    })

    if (!record) {
      return NextResponse.json(
        { success: true, data: null, message: 'No brand voice configured' },
        { headers: NO_CACHE_HEADERS }
      )
    }

    // Decode writingStyle JSON
    let writingStyleData: WritingStyleData = {}
    if (record.writingStyle) {
      try {
        writingStyleData = JSON.parse(record.writingStyle)
      } catch {
        // Old single-value format (e.g. "professional")
        writingStyleData = { brandName: '', industry: '' }
      }
    }

    // Decode targetAudiences JSON
    let targetAudience = ''
    if (record.targetAudiences) {
      try {
        const audiences =
          typeof record.targetAudiences === 'string'
            ? JSON.parse(record.targetAudiences)
            : record.targetAudiences
        if (typeof audiences === 'string') {
          targetAudience = audiences
        } else if (Array.isArray(audiences) && audiences.length > 0) {
          targetAudience = audiences.join(', ')
        }
      } catch {
        targetAudience = ''
      }
    }

    // Decode doNotSayList → forbiddenPhrases (comma-separated)
    const forbiddenPhrases = (record.doNotSayList || []).join(', ')

    return NextResponse.json(
      {
        success: true,
        data: {
          brandName: writingStyleData.brandName || '',
          tones: record.voiceTones.length > 0 ? record.voiceTones : ['professional'],
          industry: writingStyleData.industry || '',
          industryContext: writingStyleData.industryContext || '',
          targetAudience,
          forbiddenPhrases,
          ctaStyle: record.ctaStyle || 'direct',
        },
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error) {
    console.error('[API:BrandVoice:GET] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

/**
 * POST — Create or update brand voice for a workspace
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: NO_CACHE_HEADERS }
      )
    }

    const body = await request.json()
    const validation = BrandVoiceSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const data = validation.data

    // Workspace auth
    const allowed = await assertWorkspaceAccess({
      workspaceId: data.workspaceId,
      userId: session.user.id,
    })
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Workspace access denied' },
        { status: 403, headers: NO_CACHE_HEADERS }
      )
    }

    // Encode writingStyle JSON (stores brand identity fields without dedicated columns)
    const writingStyleJson = JSON.stringify({
      brandName: data.brandName,
      industry: data.industry,
      industryContext: data.industryContext,
    } satisfies WritingStyleData)

    // Encode forbiddenPhrases → doNotSayList array
    const doNotSayList = data.forbiddenPhrases
      ? data.forbiddenPhrases
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []

    // Encode targetAudience → targetAudiences JSON
    const targetAudiences = data.targetAudience || ''

    // Upsert: workspaceId is @unique
    const record = await prisma.studioBrandGuardrails.upsert({
      where: { workspaceId: data.workspaceId },
      update: {
        voiceTones: data.tones,
        writingStyle: writingStyleJson,
        doNotSayList,
        ctaStyle: data.ctaStyle,
        targetAudiences: targetAudiences,
      },
      create: {
        workspaceId: data.workspaceId,
        voiceTones: data.tones,
        writingStyle: writingStyleJson,
        doNotSayList,
        ctaStyle: data.ctaStyle,
        targetAudiences: targetAudiences,
      },
    })

    console.log('[API:BrandVoice] Saved brand voice:', record.id)

    return NextResponse.json(
      {
        success: true,
        data: {
          brandName: data.brandName,
          tones: record.voiceTones,
          industry: data.industry,
          ctaStyle: record.ctaStyle,
        },
        message: 'Brand voice saved',
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error) {
    console.error('[API:BrandVoice:POST] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
