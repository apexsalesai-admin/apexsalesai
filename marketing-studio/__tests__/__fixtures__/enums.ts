/**
 * Test-local enum shims
 *
 * These mirror the runtime enums from @/types but add test-only values
 * (e.g. USER_LOGIN, PUBLISH_ATTEMPTED) that the test suite references
 * but are not part of the production AuditAction union.
 *
 * Import from './__fixtures__/enums' in test files instead of '@prisma/client'.
 */

// ─── AuditAction ────────────────────────────────────────────────────────────

export type AuditAction =
  | 'INTEGRATION_CONNECTED'
  | 'INTEGRATION_DISCONNECTED'
  | 'INTEGRATION_REVOKED'
  | 'WORKFLOW_CREATED'
  | 'WORKFLOW_UPDATED'
  | 'WORKFLOW_ACTIVATED'
  | 'WORKFLOW_PAUSED'
  | 'WORKFLOW_DELETED'
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_DENIED'
  | 'PUBLISH_ATTEMPTED'
  | 'PUBLISH_STARTED'
  | 'PUBLISH_SUCCEEDED'
  | 'PUBLISH_FAILED'
  | 'CONTENT_CREATED'
  | 'CONTENT_UPDATED'
  | 'CONTENT_DELETED'
  | 'SETTINGS_UPDATED'
  | 'USER_LOGIN'

export const AuditAction = {
  INTEGRATION_CONNECTED: 'INTEGRATION_CONNECTED' as const,
  INTEGRATION_DISCONNECTED: 'INTEGRATION_DISCONNECTED' as const,
  INTEGRATION_REVOKED: 'INTEGRATION_REVOKED' as const,
  WORKFLOW_CREATED: 'WORKFLOW_CREATED' as const,
  WORKFLOW_UPDATED: 'WORKFLOW_UPDATED' as const,
  WORKFLOW_ACTIVATED: 'WORKFLOW_ACTIVATED' as const,
  WORKFLOW_PAUSED: 'WORKFLOW_PAUSED' as const,
  WORKFLOW_DELETED: 'WORKFLOW_DELETED' as const,
  APPROVAL_REQUESTED: 'APPROVAL_REQUESTED' as const,
  APPROVAL_GRANTED: 'APPROVAL_GRANTED' as const,
  APPROVAL_DENIED: 'APPROVAL_DENIED' as const,
  PUBLISH_ATTEMPTED: 'PUBLISH_ATTEMPTED' as const,
  PUBLISH_STARTED: 'PUBLISH_STARTED' as const,
  PUBLISH_SUCCEEDED: 'PUBLISH_SUCCEEDED' as const,
  PUBLISH_FAILED: 'PUBLISH_FAILED' as const,
  CONTENT_CREATED: 'CONTENT_CREATED' as const,
  CONTENT_UPDATED: 'CONTENT_UPDATED' as const,
  CONTENT_DELETED: 'CONTENT_DELETED' as const,
  SETTINGS_UPDATED: 'SETTINGS_UPDATED' as const,
  USER_LOGIN: 'USER_LOGIN' as const,
}

// ─── UserRole ───────────────────────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'APPROVER' | 'PUBLISHER' | 'VIEWER'

export const UserRole = {
  ADMIN: 'ADMIN' as const,
  APPROVER: 'APPROVER' as const,
  PUBLISHER: 'PUBLISHER' as const,
  VIEWER: 'VIEWER' as const,
}
