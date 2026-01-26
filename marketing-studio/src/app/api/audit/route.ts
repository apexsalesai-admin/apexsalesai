import { NextRequest, NextResponse } from 'next/server'
import { getAuditLogs } from '@/lib/audit'
import { hasPermission } from '@/lib/rbac'
import { UserRole, AuditAction } from '@/types'

// GET /api/audit - Get audit logs (ADMIN only)
export async function GET(request: NextRequest) {
  try {
    // TODO: Get user from session
    const userRole = (request.headers.get('x-user-role') || 'VIEWER') as UserRole

    // Check permissions - only ADMIN and APPROVER can view audit logs
    if (!hasPermission(userRole, 'audit:view')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const action = searchParams.get('action') as AuditAction | null
    const userId = searchParams.get('userId')
    const resourceType = searchParams.get('resourceType')
    const resourceId = searchParams.get('resourceId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const result = await getAuditLogs({
      action: action || undefined,
      userId: userId || undefined,
      resourceType: resourceType || undefined,
      resourceId: resourceId || undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: Math.min(limit, 100), // Cap at 100
      offset,
    })

    return NextResponse.json({
      success: true,
      data: result.logs,
      pagination: {
        total: result.total,
        limit,
        offset,
        hasMore: offset + result.logs.length < result.total,
      },
    })
  } catch (error) {
    console.error('[GET /api/audit]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}

// Note: Audit logs are immutable - no POST, PUT, or DELETE endpoints
