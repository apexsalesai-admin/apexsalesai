/**
 * Brand Voice API
 *
 * Create, update, and retrieve brand voice settings.
 *
 * GET /api/studio/brand-voice?workspaceId=xxx
 * POST /api/studio/brand-voice
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Validation schema
const BrandVoiceSchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId is required'),
  toneOfVoice: z.string().optional(),
  targetAudience: z.string().optional(),
  brandPersonality: z.array(z.string()).optional(),
  writingStyle: z.string().optional(),
  avoidWords: z.array(z.string()).optional(),
  preferredWords: z.array(z.string()).optional(),
  callToActionStyle: z.string().optional(),
  hashtagStrategy: z.string().optional(),
  emojiUsage: z.enum(['none', 'minimal', 'moderate', 'frequent']).optional(),
  contentGoals: z.array(z.string()).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: 'workspaceId is required' },
        { status: 400 }
      )
    }

    const brandVoice = await prisma.studioBrandGuardrails.findFirst({
      where: { workspaceId },
    })

    if (!brandVoice) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No brand voice configured',
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: brandVoice.id,
        workspaceId: brandVoice.workspaceId,
        toneOfVoice: brandVoice.toneOfVoice,
        targetAudience: brandVoice.targetAudience,
        brandPersonality: brandVoice.brandPersonality,
        writingStyle: brandVoice.writingStyle,
        avoidWords: brandVoice.avoidWords,
        preferredWords: brandVoice.preferredWords,
        callToActionStyle: brandVoice.callToActionStyle,
        hashtagStrategy: brandVoice.hashtagStrategy,
        emojiUsage: brandVoice.emojiUsage,
        contentGoals: brandVoice.contentGoals,
        createdAt: brandVoice.createdAt,
        updatedAt: brandVoice.updatedAt,
      },
    })
  } catch (error) {
    console.error('[API:BrandVoice:GET] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
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
        { status: 400 }
      )
    }

    const data = validation.data

    // Check if workspace exists
    const workspace = await prisma.studioWorkspace.findUnique({
      where: { id: data.workspaceId },
    })

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: 'Workspace not found' },
        { status: 404 }
      )
    }

    // Check if brand voice already exists
    const existing = await prisma.studioBrandGuardrails.findFirst({
      where: { workspaceId: data.workspaceId },
    })

    let brandVoice

    if (existing) {
      // Update existing
      brandVoice = await prisma.studioBrandGuardrails.update({
        where: { id: existing.id },
        data: {
          toneOfVoice: data.toneOfVoice,
          targetAudience: data.targetAudience,
          brandPersonality: data.brandPersonality || [],
          writingStyle: data.writingStyle,
          avoidWords: data.avoidWords || [],
          preferredWords: data.preferredWords || [],
          callToActionStyle: data.callToActionStyle,
          hashtagStrategy: data.hashtagStrategy,
          emojiUsage: data.emojiUsage,
          contentGoals: data.contentGoals || [],
          updatedAt: new Date(),
        },
      })

      console.log('[API:BrandVoice] Updated brand voice:', brandVoice.id)
    } else {
      // Create new
      brandVoice = await prisma.studioBrandGuardrails.create({
        data: {
          workspaceId: data.workspaceId,
          toneOfVoice: data.toneOfVoice,
          targetAudience: data.targetAudience,
          brandPersonality: data.brandPersonality || [],
          writingStyle: data.writingStyle,
          avoidWords: data.avoidWords || [],
          preferredWords: data.preferredWords || [],
          callToActionStyle: data.callToActionStyle,
          hashtagStrategy: data.hashtagStrategy,
          emojiUsage: data.emojiUsage,
          contentGoals: data.contentGoals || [],
        },
      })

      console.log('[API:BrandVoice] Created brand voice:', brandVoice.id)
    }

    return NextResponse.json({
      success: true,
      data: {
        id: brandVoice.id,
        workspaceId: brandVoice.workspaceId,
        toneOfVoice: brandVoice.toneOfVoice,
        targetAudience: brandVoice.targetAudience,
        createdAt: brandVoice.createdAt,
        updatedAt: brandVoice.updatedAt,
      },
      message: existing ? 'Brand voice updated' : 'Brand voice created',
    })
  } catch (error) {
    console.error('[API:BrandVoice:POST] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
