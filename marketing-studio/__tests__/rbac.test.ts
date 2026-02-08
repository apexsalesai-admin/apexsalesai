import { hasPermission, hasAllPermissions, hasAnyPermission, getRolePermissions } from '@/lib/rbac'
import { UserRole } from './__fixtures__/enums'

describe('RBAC Permission System', () => {
  describe('hasPermission', () => {
    test('ADMIN has full access to all permissions', () => {
      expect(hasPermission('ADMIN', 'integrations:revoke')).toBe(true)
      expect(hasPermission('ADMIN', 'workflows:create')).toBe(true)
      expect(hasPermission('ADMIN', 'approvals:decide')).toBe(true)
      expect(hasPermission('ADMIN', 'users:manage')).toBe(true)
      expect(hasPermission('ADMIN', 'audit:view')).toBe(true)
    })

    test('APPROVER can decide on approvals but cannot revoke integrations', () => {
      expect(hasPermission('APPROVER', 'approvals:decide')).toBe(true)
      expect(hasPermission('APPROVER', 'approvals:view')).toBe(true)
      expect(hasPermission('APPROVER', 'audit:view')).toBe(true)
      expect(hasPermission('APPROVER', 'integrations:revoke')).toBe(false)
      expect(hasPermission('APPROVER', 'workflows:create')).toBe(false)
    })

    test('PUBLISHER can create content but cannot approve or revoke', () => {
      expect(hasPermission('PUBLISHER', 'content:create')).toBe(true)
      expect(hasPermission('PUBLISHER', 'workflows:create')).toBe(true)
      expect(hasPermission('PUBLISHER', 'content:publish')).toBe(true)
      expect(hasPermission('PUBLISHER', 'approvals:decide')).toBe(false)
      expect(hasPermission('PUBLISHER', 'integrations:revoke')).toBe(false)
    })

    test('VIEWER has read-only access', () => {
      expect(hasPermission('VIEWER', 'integrations:view')).toBe(true)
      expect(hasPermission('VIEWER', 'workflows:view')).toBe(true)
      expect(hasPermission('VIEWER', 'content:view')).toBe(true)
      expect(hasPermission('VIEWER', 'content:create')).toBe(false)
      expect(hasPermission('VIEWER', 'workflows:create')).toBe(false)
      expect(hasPermission('VIEWER', 'approvals:decide')).toBe(false)
    })
  })

  describe('hasAllPermissions', () => {
    test('returns true when role has all specified permissions', () => {
      expect(hasAllPermissions('ADMIN', ['integrations:revoke', 'workflows:create'])).toBe(true)
      expect(hasAllPermissions('PUBLISHER', ['content:create', 'content:publish'])).toBe(true)
    })

    test('returns false when role lacks any permission', () => {
      expect(hasAllPermissions('VIEWER', ['content:view', 'content:create'])).toBe(false)
      expect(hasAllPermissions('PUBLISHER', ['content:create', 'integrations:revoke'])).toBe(false)
    })
  })

  describe('hasAnyPermission', () => {
    test('returns true when role has at least one permission', () => {
      expect(hasAnyPermission('VIEWER', ['content:create', 'content:view'])).toBe(true)
      expect(hasAnyPermission('APPROVER', ['approvals:decide', 'users:manage'])).toBe(true)
    })

    test('returns false when role has none of the permissions', () => {
      expect(hasAnyPermission('VIEWER', ['content:create', 'workflows:create'])).toBe(false)
    })
  })

  describe('getRolePermissions', () => {
    test('returns correct permissions for each role', () => {
      const adminPerms = getRolePermissions('ADMIN')
      const viewerPerms = getRolePermissions('VIEWER')

      expect(adminPerms).toContain('integrations:revoke')
      expect(adminPerms).toContain('users:manage')
      expect(viewerPerms).not.toContain('integrations:revoke')
      expect(viewerPerms).toContain('integrations:view')
    })
  })

  describe('Kill switch permission (integrations:revoke)', () => {
    test('only ADMIN can use kill switch', () => {
      const roles: UserRole[] = ['ADMIN', 'APPROVER', 'PUBLISHER', 'VIEWER']

      roles.forEach((role) => {
        if (role === 'ADMIN') {
          expect(hasPermission(role, 'integrations:revoke')).toBe(true)
        } else {
          expect(hasPermission(role, 'integrations:revoke')).toBe(false)
        }
      })
    })
  })
})
