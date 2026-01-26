import { prisma } from './db'
import { AuditAction } from '@/types'
import { StudioAuditAction } from '@prisma/client'

interface AuditLogParams {
  action: AuditAction
  workspaceId?: string
  userId?: string
  userEmail?: string
  resourceType?: string
  resourceId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

// Map local AuditAction to Prisma StudioAuditAction
function mapToStudioAction(action: AuditAction): StudioAuditAction {
  const mapping: Record<AuditAction, StudioAuditAction> = {
    'INTEGRATION_CONNECTED': 'INTEGRATION_CONNECTED',
    'INTEGRATION_DISCONNECTED': 'INTEGRATION_DISCONNECTED',
    'INTEGRATION_REVOKED': 'INTEGRATION_REVOKED',
    'WORKFLOW_CREATED': 'CONTENT_CREATED', // Map to closest
    'WORKFLOW_UPDATED': 'CONTENT_UPDATED', // Map to closest
    'WORKFLOW_ACTIVATED': 'CONTENT_SCHEDULED', // Map to closest
    'WORKFLOW_PAUSED': 'CONTENT_UPDATED', // Map to closest
    'WORKFLOW_DELETED': 'CONTENT_DELETED', // Map to closest
    'APPROVAL_REQUESTED': 'CONTENT_SUBMITTED',
    'APPROVAL_GRANTED': 'CONTENT_APPROVED',
    'APPROVAL_DENIED': 'CONTENT_REJECTED',
    'PUBLISH_STARTED': 'CONTENT_PUBLISHED', // Map to closest
    'PUBLISH_SUCCEEDED': 'CONTENT_PUBLISHED',
    'PUBLISH_FAILED': 'CONTENT_FAILED',
    'CONTENT_CREATED': 'CONTENT_CREATED',
    'CONTENT_UPDATED': 'CONTENT_UPDATED',
    'CONTENT_DELETED': 'CONTENT_DELETED',
    'SETTINGS_UPDATED': 'SETTINGS_UPDATED',
  }
  return mapping[action] || 'CONTENT_UPDATED'
}

/**
 * Creates an immutable audit log entry using StudioAuditLog.
 * This function should be called for all significant actions in the system.
 *
 * IMPORTANT: Audit logs are immutable - they have no updatedAt field
 * and should never be modified after creation.
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  const {
    action,
    workspaceId,
    userId,
    userEmail,
    resourceType,
    resourceId,
    details = {},
    ipAddress,
    userAgent,
  } = params

  try {
    await prisma.studioAuditLog.create({
      data: {
        action: mapToStudioAction(action),
        workspaceId,
        userId,
        userEmail,
        resourceType,
        resourceId,
        details: details as object,
        ipAddress,
        userAgent,
      },
    })
  } catch (error) {
    // Log to console but don't throw - audit logging should not break the main flow
    console.error('[AUDIT LOG ERROR]', error)

    // In production, you might want to send this to an external monitoring service
    // to ensure audit logging failures are tracked
  }
}

/**
 * Retrieves audit logs with filtering and pagination.
 * Only users with ADMIN role should be able to access this.
 */
export async function getAuditLogs(params: {
  workspaceId?: string
  action?: AuditAction
  userId?: string
  resourceType?: string
  resourceId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}) {
  const {
    workspaceId,
    action,
    userId,
    resourceType,
    resourceId,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = params

  const where: Record<string, unknown> = {}

  if (workspaceId) where.workspaceId = workspaceId
  if (action) where.action = mapToStudioAction(action)
  if (userId) where.userId = userId
  if (resourceType) where.resourceType = resourceType
  if (resourceId) where.resourceId = resourceId
  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) (where.createdAt as Record<string, Date>).gte = startDate
    if (endDate) (where.createdAt as Record<string, Date>).lte = endDate
  }

  const [logs, total] = await Promise.all([
    prisma.studioAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.studioAuditLog.count({ where }),
  ])

  return { logs, total }
}
