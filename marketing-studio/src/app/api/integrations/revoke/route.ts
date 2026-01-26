import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/audit'
import { hasPermission } from '@/lib/rbac'
import { UserRole } from '@/types'

// POST /api/integrations/revoke - Kill switch to revoke integration access
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { integrationId, reason } = body

    // TODO: Get user from session
    const userId = request.headers.get('x-user-id') || 'admin'
    const userEmail = request.headers.get('x-user-email') || 'admin@lyfye.com'
    const userRole = (request.headers.get('x-user-role') || 'ADMIN') as UserRole
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')

    // CRITICAL: Only ADMIN can use kill switch
    if (!hasPermission(userRole, 'integrations:revoke')) {
      await createAuditLog({
        action: 'INTEGRATION_REVOKED',
        userId,
        userEmail,
        resourceType: 'integration',
        resourceId: integrationId,
        details: {
          success: false,
          error: 'Permission denied - attempted unauthorized revoke',
        },
        ipAddress: ipAddress || undefined,
      })

      return NextResponse.json(
        { success: false, error: 'Permission denied. Only admins can revoke integrations.' },
        { status: 403 }
      )
    }

    // Get integration details before revoking
    // Using studioIntegration model for workspace-scoped integrations
    const integration = await prisma.studioIntegration.findUnique({
      where: { id: integrationId },
    })

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Integration not found' },
        { status: 404 }
      )
    }

    // Revoke the integration
    const revokedIntegration = await prisma.studioIntegration.update({
      where: { id: integrationId },
      data: {
        status: 'REVOKED',
        accessTokenEncrypted: null,  // Clear tokens
        refreshTokenEncrypted: null,
        revokedAt: new Date(),
        revokedBy: userId,
        revokeReason: reason || 'Admin initiated kill switch',
      },
    })

    // Create immutable audit log
    await createAuditLog({
      action: 'INTEGRATION_REVOKED',
      userId,
      userEmail,
      resourceType: 'integration',
      resourceId: integrationId,
      details: {
        integrationType: integration.type,
        channelName: integration.externalName,
        reason: reason || 'Admin initiated kill switch',
        previousStatus: integration.status,
        workspaceId: integration.workspaceId,
      },
      ipAddress: ipAddress || undefined,
    })

    // TODO: In production, also:
    // 1. Disable all workflows using this integration
    // 2. Cancel any pending publish operations
    // 3. Send notification to integration owner
    // 4. Revoke OAuth tokens with the provider (if possible)

    return NextResponse.json({
      success: true,
      data: {
        id: revokedIntegration.id,
        status: revokedIntegration.status,
        revokedAt: revokedIntegration.revokedAt,
      },
      message: 'Integration access has been revoked',
    })
  } catch (error) {
    console.error('[POST /api/integrations/revoke]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to revoke integration' },
      { status: 500 }
    )
  }
}
