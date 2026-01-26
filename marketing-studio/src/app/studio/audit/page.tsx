'use client'

import { useState } from 'react'
import { Shield, Search, Filter, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AuditAction } from '@/types'

// Mock audit log data
const MOCK_AUDIT_LOGS = [
  {
    id: '1',
    action: 'PUBLISH_SUCCEEDED' as AuditAction,
    userEmail: 'sarah@lyfye.com',
    userName: 'Sarah Chen',
    resourceType: 'workflow_execution',
    resourceId: 'exec_abc123',
    details: { channel: 'TIKTOK', postId: 'tiktok_789' },
    ipAddress: '192.168.1.100',
    createdAt: new Date(Date.now() - 5 * 60 * 1000),
  },
  {
    id: '2',
    action: 'APPROVAL_GRANTED' as AuditAction,
    userEmail: 'mike@lyfye.com',
    userName: 'Mike Johnson',
    resourceType: 'approval_request',
    resourceId: 'apr_def456',
    details: { workflowId: 'wf_123', contentTitle: 'Q4 Product Launch' },
    ipAddress: '192.168.1.101',
    createdAt: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    id: '3',
    action: 'WORKFLOW_CREATED' as AuditAction,
    userEmail: 'alex@lyfye.com',
    userName: 'Alex Rivera',
    resourceType: 'workflow',
    resourceId: 'wf_456',
    details: { name: 'TikTok → YouTube Auto-Share' },
    ipAddress: '192.168.1.102',
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
  },
  {
    id: '4',
    action: 'INTEGRATION_CONNECTED' as AuditAction,
    userEmail: 'sarah@lyfye.com',
    userName: 'Sarah Chen',
    resourceType: 'integration',
    resourceId: 'int_789',
    details: { type: 'YOUTUBE', channelName: 'Lyfye' },
    ipAddress: '192.168.1.100',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: '5',
    action: 'PUBLISH_FAILED' as AuditAction,
    userEmail: 'system@lyfye.com',
    userName: 'System',
    resourceType: 'workflow_execution',
    resourceId: 'exec_xyz789',
    details: { channel: 'X_TWITTER', error: 'Rate limit exceeded' },
    ipAddress: null,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
  {
    id: '6',
    action: 'INTEGRATION_REVOKED' as AuditAction,
    userEmail: 'admin@lyfye.com',
    userName: 'Admin',
    resourceType: 'integration',
    resourceId: 'int_old123',
    details: { type: 'FACEBOOK', reason: 'Security concern' },
    ipAddress: '192.168.1.1',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
]

const ACTION_COLORS: Record<string, string> = {
  INTEGRATION_CONNECTED: 'bg-green-100 text-green-800',
  INTEGRATION_DISCONNECTED: 'bg-amber-100 text-amber-800',
  INTEGRATION_REVOKED: 'bg-red-100 text-red-800',
  WORKFLOW_CREATED: 'bg-blue-100 text-blue-800',
  WORKFLOW_ACTIVATED: 'bg-green-100 text-green-800',
  APPROVAL_GRANTED: 'bg-green-100 text-green-800',
  APPROVAL_DENIED: 'bg-red-100 text-red-800',
  PUBLISH_SUCCEEDED: 'bg-green-100 text-green-800',
  PUBLISH_FAILED: 'bg-red-100 text-red-800',
}

export default function AuditLogPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAction, setSelectedAction] = useState<string>('all')

  const filteredLogs = MOCK_AUDIT_LOGS.filter((log) => {
    if (selectedAction !== 'all' && log.action !== selectedAction) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        log.userEmail?.toLowerCase().includes(query) ||
        log.userName?.toLowerCase().includes(query) ||
        log.resourceId?.toLowerCase().includes(query) ||
        JSON.stringify(log.details).toLowerCase().includes(query)
      )
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <Shield className="w-6 h-6 text-apex-primary" />
            <span>Audit Log</span>
          </h1>
          <p className="text-slate-500 mt-1">
            Immutable record of all actions in the system
          </p>
        </div>
        <button className="btn-secondary flex items-center space-x-2">
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <p className="text-sm text-slate-600">
          <strong>Note:</strong> Audit logs are immutable and cannot be modified or deleted.
          All actions are timestamped and include user identification and IP address where available.
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user, resource, or details..."
              className="input pl-10"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="input w-48"
            >
              <option value="all">All Actions</option>
              <option value="INTEGRATION_CONNECTED">Integration Connected</option>
              <option value="INTEGRATION_REVOKED">Integration Revoked</option>
              <option value="WORKFLOW_CREATED">Workflow Created</option>
              <option value="APPROVAL_GRANTED">Approval Granted</option>
              <option value="APPROVAL_DENIED">Approval Denied</option>
              <option value="PUBLISH_SUCCEEDED">Publish Succeeded</option>
              <option value="PUBLISH_FAILED">Publish Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-left text-sm text-slate-500">
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Resource</th>
              <th className="px-4 py-3 font-medium">Details</th>
              <th className="px-4 py-3 font-medium">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="text-sm hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                  {formatDateTime(log.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'px-2 py-1 rounded text-xs font-medium',
                    ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-700'
                  )}>
                    {log.action.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-slate-900">{log.userName}</p>
                    <p className="text-slate-500 text-xs">{log.userEmail}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div>
                    <p className="capitalize">{log.resourceType?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-slate-400 font-mono">{log.resourceId}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                  {JSON.stringify(log.details)}
                </td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                  {log.ipAddress || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Showing {filteredLogs.length} of {MOCK_AUDIT_LOGS.length} entries
        </p>
        <div className="flex items-center space-x-2">
          <button className="btn-secondary p-2" disabled>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-600">Page 1 of 1</span>
          <button className="btn-secondary p-2" disabled>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}
