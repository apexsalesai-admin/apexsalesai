/**
 * Creator Profile API — Single CRUD
 *
 * GET    /api/studio/profile/[id] — fetch single profile
 * PUT    /api/studio/profile/[id] — update profile
 * DELETE /api/studio/profile/[id] — delete profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const profile = await prisma.creatorProfile.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('[API:profile:get] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const userId = session.user.id

    // Verify ownership
    const existing = await prisma.creatorProfile.findFirst({
      where: { id, userId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Handle isDefault toggling
    if (body.isDefault === true && !existing.isDefault) {
      await prisma.creatorProfile.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const profile = await prisma.creatorProfile.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
        ...(body.voicePreset !== undefined && { voicePreset: body.voicePreset }),
        ...(body.voiceCustom !== undefined && { voiceCustom: body.voiceCustom }),
        ...(body.role !== undefined && { role: body.role }),
        ...(body.company !== undefined && { company: body.company }),
        ...(body.industry !== undefined && { industry: body.industry }),
        ...(body.audienceRole !== undefined && { audienceRole: body.audienceRole }),
        ...(body.audienceSeniority !== undefined && { audienceSeniority: body.audienceSeniority }),
        ...(body.complianceLevel !== undefined && { complianceLevel: body.complianceLevel }),
        ...(body.primaryGoal !== undefined && { primaryGoal: body.primaryGoal }),
        ...(body.secondaryGoal !== undefined && { secondaryGoal: body.secondaryGoal }),
        ...(body.preferredChannels !== undefined && { preferredChannels: body.preferredChannels }),
        ...(body.contentMix !== undefined && { contentMix: body.contentMix }),
        ...(body.postingFrequency !== undefined && { postingFrequency: body.postingFrequency }),
        ...(body.competitorNames !== undefined && { competitorNames: body.competitorNames }),
        ...(body.brandName !== undefined && { brandName: body.brandName }),
        ...(body.brandKeywords !== undefined && { brandKeywords: body.brandKeywords }),
        ...(body.brandAvoid !== undefined && { brandAvoid: body.brandAvoid }),
        ...(body.brandColors !== undefined && { brandColors: body.brandColors }),
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
        ...(body.factCheckSensitivity !== undefined && { factCheckSensitivity: body.factCheckSensitivity }),
      },
    })

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('[API:profile:update] Error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    // Verify ownership
    const existing = await prisma.creatorProfile.findFirst({
      where: { id, userId: session.user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    await prisma.creatorProfile.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API:profile:delete] Error:', error)
    return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
