/**
 * Workspace Analytics API (P1-ENTERPRISE)
 *
 * GET /api/studio/analytics — Returns workspace analytics and content metrics
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOrCreateWorkspace } from '@/lib/workspace'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const workspace = await getOrCreateWorkspace(session.user.id)
    if (!workspace) {
      return NextResponse.json({ success: false, error: 'Workspace not found' }, { status: 404 })
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Parallel queries for content metrics
    // Note: ScheduledContent has no workspaceId — filter by createdById
    const [totalContent, publishedContent, draftContent, reviewContent] = await Promise.all([
      prisma.scheduledContent.count({ where: { createdById: session.user.id } }),
      prisma.scheduledContent.count({ where: { createdById: session.user.id, status: 'PUBLISHED' } }),
      prisma.scheduledContent.count({ where: { createdById: session.user.id, status: 'DRAFT' } }),
      prisma.scheduledContent.count({ where: { createdById: session.user.id, status: 'PENDING_APPROVAL' } }),
    ])

    // Publishing metrics (last 30 days)
    const recentPublishes = await prisma.studioPublishJob.findMany({
      where: {
        workspaceId: workspace.id,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        status: true,
        targetChannels: true,
        createdAt: true,
      },
      take: 100,
    })

    const publishSuccess = recentPublishes.filter(j => j.status === 'COMPLETED').length
    const publishFailed = recentPublishes.filter(j => j.status === 'FAILED').length

    // Channel distribution from publish jobs
    const channelCounts: Record<string, number> = {}
    recentPublishes.forEach(job => {
      if (Array.isArray(job.targetChannels)) {
        job.targetChannels.forEach((ch: string) => {
          channelCounts[ch] = (channelCounts[ch] || 0) + 1
        })
      }
    })

    // Content created per week (last 30 days)
    const weeklyContent = await prisma.scheduledContent.findMany({
      where: {
        createdById: session.user.id,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })

    // Recent publish jobs with details
    const recentJobs = await prisma.studioPublishJob.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        status: true,
        targetChannels: true,
        createdAt: true,
        completedAt: true,
        contentId: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalContent,
          publishedContent,
          draftContent,
          reviewContent,
          publishSuccess,
          publishFailed,
          publishRate: recentPublishes.length > 0
            ? Math.round((publishSuccess / recentPublishes.length) * 100)
            : 0,
        },
        channelDistribution: channelCounts,
        weeklyActivity: weeklyContent.map(c => c.createdAt),
        recentJobs,
      },
    })
  } catch (error) {
    console.error('[API:Analytics] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
