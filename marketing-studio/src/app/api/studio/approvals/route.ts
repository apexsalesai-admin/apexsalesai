/**
 * Content Approvals API (P1-ENTERPRISE)
 *
 * GET  /api/studio/approvals — List content pending approval
 * POST /api/studio/approvals — Submit approval action (approve/reject/request changes)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { checkWorkspaceRole } from '@/lib/auth/withAuth'
import { z } from 'zod'

const approvalActionSchema = z.object({
  contentId: z.string().min(1),
  action: z.enum(['APPROVED', 'REJECTED', 'REQUESTED_CHANGES']),
  notes: z.string().max(1000).optional(),
})

// GET - List content pending approval
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    // Get content with PENDING_APPROVAL status
    const pendingContent = await prisma.scheduledContent.findMany({
      where: { status: 'PENDING_APPROVAL' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    // Get recent approval actions by this reviewer
    const recentActions = await prisma.studioContentApproval.findMany({
      where: { reviewerId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      success: true,
      data: {
        pending: pendingContent,
        recentActions,
      },
    })
  } catch (error) {
    console.error('[API:Approvals] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch approvals' },
      { status: 500 }
    )
  }
}

// POST - Submit approval action (approve/reject)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    // Role check - only APPROVER and above can approve/reject
    const workspace = await getOrCreateWorkspace(session.user.id)
    if (workspace) {
      const roleCheck = await checkWorkspaceRole(session.user.id, workspace.id, 'APPROVER')
      if (roleCheck) return roleCheck
    }

    const body = await request.json()
    const parsed = approvalActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { contentId, action, notes } = parsed.data

    // Verify content exists and is in PENDING_APPROVAL status
    const content = await prisma.scheduledContent.findUnique({
      where: { id: contentId },
    })

    if (!content) {
      return NextResponse.json({ success: false, error: 'Content not found' }, { status: 404 })
    }

    if (content.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { success: false, error: 'Content is not pending approval' },
        { status: 400 }
      )
    }

    // Create approval record
    const approval = await prisma.studioContentApproval.create({
      data: {
        contentId,
        action: action as any,
        reviewerId: session.user.id,
        notes: notes || null,
      },
    })

    // Update content status based on action
    let newStatus: 'APPROVED' | 'DRAFT'
    if (action === 'APPROVED') {
      newStatus = 'APPROVED'
    } else {
      // REJECTED and REQUESTED_CHANGES both send back to draft
      newStatus = 'DRAFT'
    }

    await prisma.scheduledContent.update({
      where: { id: contentId },
      data: { status: newStatus },
    })

    return NextResponse.json({
      success: true,
      data: approval,
      message: `Content ${action.toLowerCase()}`,
    })
  } catch (error) {
    console.error('[API:Approvals] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process approval' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
