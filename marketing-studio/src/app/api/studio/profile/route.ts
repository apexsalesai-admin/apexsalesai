/**
 * Creator Profile API — List + Create
 *
 * GET  /api/studio/profile  — list all profiles for current user
 * POST /api/studio/profile  — create a new profile
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profiles = await prisma.creatorProfile.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    })

    return NextResponse.json({ profiles })
  } catch (error) {
    console.error('[API:profile:list] Error:', error)
    return NextResponse.json({ error: 'Failed to list profiles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const userId = session.user.id

    // Check if this is the user's first profile — auto-default
    const existingCount = await prisma.creatorProfile.count({
      where: { userId },
    })

    const isDefault = existingCount === 0 ? true : body.isDefault === true

    // If setting as default, unset any existing default
    if (isDefault && existingCount > 0) {
      await prisma.creatorProfile.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const profile = await prisma.creatorProfile.create({
      data: {
        userId,
        name: body.name || 'My Profile',
        isDefault,
        voicePreset: body.voicePreset || 'trusted-advisor',
        voiceCustom: body.voiceCustom || undefined,
        role: body.role || '',
        company: body.company || '',
        industry: body.industry || 'saas',
        audienceRole: body.audienceRole || 'Decision Maker',
        audienceSeniority: body.audienceSeniority || 'Manager',
        complianceLevel: body.complianceLevel || 'none',
        primaryGoal: body.primaryGoal || 'thought-leadership',
        secondaryGoal: body.secondaryGoal || null,
        preferredChannels: body.preferredChannels || [],
        contentMix: body.contentMix || undefined,
        postingFrequency: body.postingFrequency || '3x/week',
        competitorNames: body.competitorNames || [],
        brandName: body.brandName || '',
        brandKeywords: body.brandKeywords || [],
        brandAvoid: body.brandAvoid || [],
        brandColors: body.brandColors || undefined,
        logoUrl: body.logoUrl || null,
        factCheckSensitivity: body.factCheckSensitivity || 'medium',
      },
    })

    return NextResponse.json({ profile }, { status: 201 })
  } catch (error) {
    console.error('[API:profile:create] Error:', error)
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
