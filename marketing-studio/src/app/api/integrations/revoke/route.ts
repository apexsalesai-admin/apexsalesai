import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createAuditLog } from '@/lib/audit'
import { withAuth } from '@/lib/auth/withAuth'

// POST /api/integrations/revoke - Kill switch to revoke integration access
export const POST = withAuth(async (req, { session }) => {
  try {
    const body = await req.json()
    const { integrationId, reason } = body

    const userId = session.user.id
    const userEmail = session.user.email
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip')

    if (!integrationId) {
      return NextResponse.json(
        { success: false, error: 'integrationId is required' },
        { status: 400 }
      )
    }

    // Get integration details before revoking
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
        accessTokenEncrypted: null,
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
});
