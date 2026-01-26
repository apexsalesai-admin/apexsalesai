import { UserRole } from '@/types'

/**
 * RBAC Permission System for Lyfye Marketing Studio
 *
 * Roles:
 * - ADMIN: Full access to all features
 * - APPROVER: Can approve/deny content, view all content
 * - PUBLISHER: Can create content and publish approved content
 * - VIEWER: Read-only access to dashboards and reports
 */

export type Permission =
  // Integration permissions
  | 'integrations:connect'
  | 'integrations:disconnect'
  | 'integrations:revoke'      // Kill switch - ADMIN only
  | 'integrations:view'

  // Workflow permissions
  | 'workflows:create'
  | 'workflows:edit'
  | 'workflows:delete'
  | 'workflows:activate'
  | 'workflows:view'

  // Content permissions
  | 'content:create'
  | 'content:edit'
  | 'content:delete'
  | 'content:publish'
  | 'content:view'

  // Approval permissions
  | 'approvals:request'
  | 'approvals:decide'         // Grant or deny
  | 'approvals:view'

  // Settings permissions
  | 'settings:brand'
  | 'settings:roles'
  | 'settings:kpis'
  | 'settings:view'

  // Audit permissions
  | 'audit:view'

  // User management
  | 'users:manage'

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    // Full access
    'integrations:connect',
    'integrations:disconnect',
    'integrations:revoke',
    'integrations:view',
    'workflows:create',
    'workflows:edit',
    'workflows:delete',
    'workflows:activate',
    'workflows:view',
    'content:create',
    'content:edit',
    'content:delete',
    'content:publish',
    'content:view',
    'approvals:request',
    'approvals:decide',
    'approvals:view',
    'settings:brand',
    'settings:roles',
    'settings:kpis',
    'settings:view',
    'audit:view',
    'users:manage',
  ],

  APPROVER: [
    'integrations:view',
    'workflows:view',
    'content:view',
    'approvals:decide',
    'approvals:view',
    'settings:view',
    'audit:view',
  ],

  PUBLISHER: [
    'integrations:connect',
    'integrations:disconnect',
    'integrations:view',
    'workflows:create',
    'workflows:edit',
    'workflows:view',
    'content:create',
    'content:edit',
    'content:publish',
    'content:view',
    'approvals:request',
    'approvals:view',
    'settings:view',
  ],

  VIEWER: [
    'integrations:view',
    'workflows:view',
    'content:view',
    'approvals:view',
    'settings:view',
  ],
}

/**
 * Check if a user role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

/**
 * Check if a user role has ALL of the specified permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p))
}

/**
 * Check if a user role has ANY of the specified permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p))
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

/**
 * Middleware helper to enforce permission on API routes
 */
export function requirePermission(permission: Permission) {
  return (role: UserRole) => {
    if (!hasPermission(role, permission)) {
      throw new Error(`Permission denied: ${permission}`)
    }
  }
}

/**
 * Get human-readable role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    ADMIN: 'Full access to all features including settings, user management, and kill switch',
    APPROVER: 'Can approve or deny content for publishing, view all content and audit logs',
    PUBLISHER: 'Can create content, manage workflows, and publish approved content',
    VIEWER: 'Read-only access to dashboards and reports',
  }
  return descriptions[role]
}
