'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield, Search, Filter, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuditEntry {
  id: string
  action: string
  userId: string | null
  userEmail: string | null
  resourceType: string | null
  resourceId: string | null
  details: Record<string, unknown>
  ipAddress: string | null
  createdAt: string
}

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
  CONTENT_CREATED: 'bg-blue-100 text-blue-800',
  CONTENT_UPDATED: 'bg-blue-100 text-blue-800',
  CONTENT_DELETED: 'bg-red-100 text-red-800',
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAction, setSelectedAction] = useState<string>('all')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50', offset: '0' })
      if (selectedAction !== 'all') params.set('action', selectedAction)
      const res = await fetch(`/api/audit?${params}`)
      const data = await res.json()
      if (data.success) {
        setLogs(data.data || [])
        setTotal(data.pagination?.total ?? data.data?.length ?? 0)
      }
    } catch {
      // Silent — empty state handles it
    } finally {
      setLoading(false)
    }
  }, [selectedAction])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const filtered = searchQuery
    ? logs.filter(log => {
        const q = searchQuery.toLowerCase()
        return (
          log.userEmail?.toLowerCase().includes(q) ||
          log.resourceId?.toLowerCase().includes(q) ||
          log.action?.toLowerCase().includes(q) ||
          JSON.stringify(log.details).toLowerCase().includes(q)
        )
      })
    : logs

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
          <Shield className="w-6 h-6 text-apex-primary" />
          <span>Audit Log</span>
        </h1>
        <p className="text-slate-500 mt-1">
          Immutable record of all actions in the system
        </p>
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
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Shield className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No audit logs found</p>
            <p className="text-xs mt-1">Actions will appear here as they occur</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-sm text-slate-500">
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Resource</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((log) => (
                <tr key={log.id} className="text-sm hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-700'
                    )}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {log.userEmail || log.userId || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="capitalize text-slate-600">{log.resourceType?.replace(/_/g, ' ') || '-'}</p>
                      {log.resourceId && (
                        <p className="text-xs text-slate-400 font-mono">{log.resourceId}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate text-xs">
                    {log.details ? JSON.stringify(log.details) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      {!loading && filtered.length > 0 && (
        <p className="text-sm text-slate-500">
          Showing {filtered.length} of {total} entries
        </p>
      )}
    </div>
  )
}
