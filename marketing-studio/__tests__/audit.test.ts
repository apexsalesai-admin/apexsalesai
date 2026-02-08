/**
 * Audit Log Tests
 *
 * Note: These tests verify the audit log creation logic.
 * In a real environment, these would need a test database or mocking.
 */

import { AuditAction } from './__fixtures__/enums'

// Mock the prisma client for testing
jest.mock('@/lib/db', () => ({
  prisma: {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

import { createAuditLog, getAuditLogs } from '@/lib/audit'
import { prisma } from '@/lib/db'

describe('Audit Log System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createAuditLog', () => {
    test('creates audit log with all required fields', async () => {
      const mockCreate = prisma.auditLog.create as jest.Mock
      mockCreate.mockResolvedValue({ id: 'log-1' })

      await createAuditLog({
        action: 'INTEGRATION_CONNECTED',
        userId: 'user-1',
        userEmail: 'test@apexsalesai.com',
        resourceType: 'integration',
        resourceId: 'int-1',
        details: { type: 'YOUTUBE' },
      })

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'INTEGRATION_CONNECTED',
          userId: 'user-1',
          userEmail: 'test@apexsalesai.com',
          resourceType: 'integration',
          resourceId: 'int-1',
          details: { type: 'YOUTUBE' },
        }),
      })
    })

    test('handles missing optional fields gracefully', async () => {
      const mockCreate = prisma.auditLog.create as jest.Mock
      mockCreate.mockResolvedValue({ id: 'log-2' })

      await createAuditLog({
        action: 'SETTINGS_UPDATED',
      })

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'SETTINGS_UPDATED',
          details: {},
        }),
      })
    })

    test('does not throw on database error (audit should not break main flow)', async () => {
      const mockCreate = prisma.auditLog.create as jest.Mock
      mockCreate.mockRejectedValue(new Error('Database error'))

      // Should not throw
      await expect(createAuditLog({
        action: 'WORKFLOW_CREATED',
      })).resolves.toBeUndefined()
    })

    test('records IP address and user agent when provided', async () => {
      const mockCreate = prisma.auditLog.create as jest.Mock
      mockCreate.mockResolvedValue({ id: 'log-3' })

      await createAuditLog({
        action: 'INTEGRATION_REVOKED',
        userId: 'admin-1',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0',
      })

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
        }),
      })
    })
  })

  describe('getAuditLogs', () => {
    test('retrieves audit logs with pagination', async () => {
      const mockFindMany = prisma.auditLog.findMany as jest.Mock
      const mockCount = prisma.auditLog.count as jest.Mock

      mockFindMany.mockResolvedValue([
        { id: 'log-1', action: 'PUBLISH_SUCCEEDED' },
        { id: 'log-2', action: 'APPROVAL_GRANTED' },
      ])
      mockCount.mockResolvedValue(100)

      const result = await getAuditLogs({ limit: 50, offset: 0 })

      expect(result.logs).toHaveLength(2)
      expect(result.total).toBe(100)
      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        take: 50,
        skip: 0,
      }))
    })

    test('filters by action type', async () => {
      const mockFindMany = prisma.auditLog.findMany as jest.Mock
      const mockCount = prisma.auditLog.count as jest.Mock

      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      await getAuditLogs({ action: 'INTEGRATION_REVOKED' })

      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          action: 'INTEGRATION_REVOKED',
        }),
      }))
    })

    test('filters by date range', async () => {
      const mockFindMany = prisma.auditLog.findMany as jest.Mock
      const mockCount = prisma.auditLog.count as jest.Mock

      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      await getAuditLogs({ startDate, endDate })

      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
      }))
    })

    test('orders by createdAt descending', async () => {
      const mockFindMany = prisma.auditLog.findMany as jest.Mock
      const mockCount = prisma.auditLog.count as jest.Mock

      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)

      await getAuditLogs({})

      expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      }))
    })
  })

  describe('Audit log immutability', () => {
    test('audit logs should have no update method exposed', () => {
      // The audit module should not export any update functions
      // This is a design verification test
      const auditModule = require('@/lib/audit')

      expect(auditModule.updateAuditLog).toBeUndefined()
      expect(auditModule.deleteAuditLog).toBeUndefined()
    })
  })

  describe('Key actions are audited', () => {
    const keyActions: AuditAction[] = [
      'INTEGRATION_CONNECTED',
      'INTEGRATION_DISCONNECTED',
      'INTEGRATION_REVOKED',
      'WORKFLOW_CREATED',
      'APPROVAL_REQUESTED',
      'APPROVAL_GRANTED',
      'APPROVAL_DENIED',
      'PUBLISH_ATTEMPTED',
      'PUBLISH_SUCCEEDED',
      'PUBLISH_FAILED',
    ]

    test.each(keyActions)('%s is a valid audit action', (action) => {
      expect(Object.values(AuditAction)).toContain(action)
    })
  })
})
