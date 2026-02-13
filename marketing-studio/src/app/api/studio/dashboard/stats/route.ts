/**
 * Dashboard Stats API (P21)
 *
 * GET /api/studio/dashboard/stats — Returns real dashboard metrics
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getOrCreateWorkspace(session.user.id)

    // Run all queries in parallel
    const [
      contentCounts,
      publishJobCounts,
      pendingApprovals,
      recentActivity,
      integrationCount,
      renderCount,
    ] = await Promise.all([
      // Content stats
      prisma.scheduledContent.groupBy({
        by: ['status'],
        where: { createdById: session.user.id },
        _count: true,
      }),

      // Publish job stats
      prisma.studioPublishJob.groupBy({
        by: ['status'],
        where: { workspaceId: workspace.id },
        _count: true,
      }),

      // Pending approvals count
      prisma.studioContentApproval.count({
        where: {
          action: 'SUBMITTED',
          reviewerId: null,
        },
      }),

      // Recent publish results (last 10)
      prisma.studioPublishResult.findMany({
        where: {
          publishJob: { workspaceId: workspace.id },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          channel: true,
          status: true,
          permalink: true,
          publishedAt: true,
          createdAt: true,
          errorMessage: true,
          publishJob: {
            select: { contentId: true },
          },
        },
      }),

      // Connected integrations
      prisma.studioIntegration.count({
        where: { workspaceId: workspace.id, status: 'CONNECTED' },
      }),

      // Total renders
      prisma.studioRenderLog.count({
        where: { workspaceId: workspace.id },
      }),
    ])

    // Aggregate content counts
    const contentStats = {
      total: 0,
      draft: 0,
      scheduled: 0,
      published: 0,
      failed: 0,
    }
    for (const row of contentCounts) {
      contentStats.total += row._count
      const status = row.status.toLowerCase()
      if (status === 'draft') contentStats.draft = row._count
      else if (status === 'scheduled') contentStats.scheduled = row._count
      else if (status === 'published') contentStats.published = row._count
      else if (status === 'failed' || status === 'error') contentStats.failed = row._count
    }

    // Aggregate publish job counts
    const publishStats = { total: 0, completed: 0, failed: 0, pending: 0 }
    for (const row of publishJobCounts) {
      publishStats.total += row._count
      const status = row.status.toLowerCase()
      if (status === 'completed') publishStats.completed = row._count
      else if (status === 'failed') publishStats.failed = row._count
      else publishStats.pending += row._count
    }

    // Format recent activity
    const activity = recentActivity.map((r) => ({
      id: r.id,
      type: r.status === 'SUCCESS' ? 'publish' : r.status === 'FAILED' ? 'error' : 'pending',
      message: `${r.channel} ${r.status === 'SUCCESS' ? 'published successfully' : r.status === 'FAILED' ? `failed: ${r.errorMessage || 'unknown error'}` : 'in progress'}`,
      status: r.status === 'SUCCESS' ? 'success' : r.status === 'FAILED' ? 'error' : 'pending',
      time: r.publishedAt?.toISOString() ?? r.createdAt.toISOString(),
      permalink: r.permalink,
    }))

    return NextResponse.json({
      success: true,
      data: {
        kpi: {
          postsCreated: contentStats.total,
          postsPublished: contentStats.published,
          approvalsPending: pendingApprovals,
          integrationsConnected: integrationCount,
          totalRenders: renderCount,
          publishJobs: publishStats,
        },
        recentActivity: activity,
        contentStats,
      },
    })
  } catch (error) {
    console.error('[API:dashboard:stats] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
