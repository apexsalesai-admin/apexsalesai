'use client'

import { useState, useEffect, useMemo, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { FileText, Clock, CheckCircle, XCircle, Eye, Edit, Trash2, Plus, Calendar, Loader2, RefreshCw, Search, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScheduledContent {
  id: string
  title: string
  body: string
  contentType: string
  channels: string[]
  status: string
  scheduledFor: string | null
  createdAt: string
  publishedAt: string | null
  aiGenerated: boolean
  errorMessage: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof FileText }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-700', icon: FileText },
  SCHEDULED: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', icon: Clock },
  PENDING_APPROVAL: { label: 'Pending Approval', color: 'bg-amber-100 text-amber-700', icon: Clock },
  APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  PUBLISHING: { label: 'Publishing', color: 'bg-purple-100 text-purple-700', icon: RefreshCw },
  PUBLISHED: { label: 'Published', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  FAILED: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: XCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-slate-100 text-slate-500', icon: XCircle },
}

function ContentPageInner() {
  const searchParams = useSearchParams()
  const [filter, setFilter] = useState<string>('all')
  const [content, setContent] = useState<ScheduledContent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortField, setSortField] = useState<'title' | 'status' | 'scheduledFor' | 'createdAt'>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Toggle sort: click same column flips direction, new column defaults desc
  const toggleSort = (field: typeof sortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Client-side filter + sort
  const displayContent = useMemo(() => {
    let items = [...content]

    // Search filter
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase()
      items = items.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.contentType.toLowerCase().includes(q) ||
        c.channels.some(ch => ch.toLowerCase().includes(q))
      )
    }

    // Sort
    items.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'title':
          cmp = a.title.localeCompare(b.title)
          break
        case 'status':
          cmp = a.status.localeCompare(b.status)
          break
        case 'scheduledFor':
          cmp = (a.scheduledFor ?? '').localeCompare(b.scheduledFor ?? '')
          break
        case 'createdAt':
          cmp = a.createdAt.localeCompare(b.createdAt)
          break
      }
      return sortDirection === 'asc' ? cmp : -cmp
    })

    return items
  }, [content, debouncedSearch, sortField, sortDirection])

  // Check for success message
  useEffect(() => {
    if (searchParams.get('saved') === 'true') {
      setShowSuccess(true)
      // Clear the query param without full reload
      window.history.replaceState({}, '', '/studio/content')
      // Auto-dismiss after 5 seconds
      setTimeout(() => setShowSuccess(false), 5000)
    }
  }, [searchParams])

  // Fetch content
  const fetchContent = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filter !== 'all') {
        params.set('status', filter)
      }

      const response = await fetch(`/api/content?${params}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch content')
      }

      setContent(data.data || [])
    } catch (err) {
      console.error('Error fetching content:', err)
      setError(err instanceof Error ? err.message : 'Failed to load content')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchContent()
  }, [filter])

  // Delete content
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return

    setDeletingId(id)
    try {
      const response = await fetch(`/api/content/${id}`, { method: 'DELETE' })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to delete content')
      }

      // Remove from local state
      setContent(prev => prev.filter(c => c.id !== id))
    } catch (err) {
      console.error('Error deleting content:', err)
      alert(err instanceof Error ? err.message : 'Failed to delete content')
    } finally {
      setDeletingId(null)
    }
  }

  // Stats
  const stats = {
    total: content.length,
    pending: content.filter(c => c.status === 'PENDING_APPROVAL' || c.status === 'SCHEDULED').length,
    published: content.filter(c => c.status === 'PUBLISHED').length,
    failed: content.filter(c => c.status === 'FAILED').length,
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700 font-medium">Content saved successfully!</span>
          </div>
          <button
            onClick={() => setShowSuccess(false)}
            className="text-green-600 hover:text-green-800"
          >
            &times;
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Content</h1>
          <p className="text-slate-500 mt-1">
            Manage and track your content across all channels
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/studio/content/calendar"
            className="btn-secondary flex items-center space-x-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Calendar</span>
          </Link>
          <Link
            href="/studio/content/new"
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Content</span>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Content"
          value={stats.total}
          icon={FileText}
          color="blue"
          loading={isLoading}
        />
        <StatCard
          label="Pending/Scheduled"
          value={stats.pending}
          icon={Clock}
          color="amber"
          loading={isLoading}
        />
        <StatCard
          label="Published"
          value={stats.published}
          icon={CheckCircle}
          color="green"
          loading={isLoading}
        />
        <StatCard
          label="Failed"
          value={stats.failed}
          icon={XCircle}
          color="red"
          loading={isLoading}
        />
      </div>

      {/* Filters + Search */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center space-x-2">
          {['all', 'DRAFT', 'SCHEDULED', 'PENDING_APPROVAL', 'PUBLISHED', 'FAILED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                filter === status
                  ? 'bg-apex-primary text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
            >
              {status === 'all' ? 'All' : STATUS_CONFIG[status]?.label || status}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search content..."
            className="pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-apex-primary/30 focus:border-apex-primary w-64"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); searchInputRef.current?.focus() }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchContent}
            className="text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Content List */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-apex-primary mx-auto mb-4" />
            <p className="text-slate-500">Loading content...</p>
          </div>
        ) : displayContent.length === 0 ? (
          <div className="p-12 text-center">
            {debouncedSearch.trim() ? (
              <>
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No results found</h3>
                <p className="text-slate-500 mb-4">
                  No content matches &ldquo;{debouncedSearch}&rdquo;
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="btn-secondary"
                >
                  Clear search
                </button>
              </>
            ) : (
              <>
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No content yet</h3>
                <p className="text-slate-500 mb-4">
                  Create your first piece of content to get started
                </p>
                <Link
                  href="/studio/content/new"
                  className="btn-primary inline-flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Content</span>
                </Link>
              </>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-left text-sm text-slate-500">
                <SortableHeader field="title" label="Content" sortField={sortField} sortDirection={sortDirection} onToggle={toggleSort} />
                <th className="px-4 py-3 font-medium">Channels</th>
                <SortableHeader field="status" label="Status" sortField={sortField} sortDirection={sortDirection} onToggle={toggleSort} />
                <SortableHeader field="scheduledFor" label="Scheduled" sortField={sortField} sortDirection={sortDirection} onToggle={toggleSort} />
                <SortableHeader field="createdAt" label="Created" sortField={sortField} sortDirection={sortDirection} onToggle={toggleSort} />
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayContent.map((item) => {
                const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.DRAFT
                const StatusIcon = statusConfig.icon

                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <p className="text-sm text-slate-500 capitalize">
                          {item.contentType.toLowerCase()}
                          {item.aiGenerated && (
                            <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                              AI
                            </span>
                          )}
                        </p>
                        {item.errorMessage && (
                          <p className="text-sm text-red-600 mt-1">{item.errorMessage}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {item.channels.map((channel) => (
                          <ChannelBadge key={channel} type={channel} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn(
                        'inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium',
                        statusConfig.color
                      )}>
                        <StatusIcon className="w-3 h-3" />
                        <span>{statusConfig.label}</span>
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {item.scheduledFor ? (
                        formatDate(new Date(item.scheduledFor))
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {formatTimeAgo(new Date(item.createdAt))}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-1">
                        <Link
                          href={`/studio/content/${item.id}`}
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                          title="Preview content"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/studio/content/${item.id}?edit=true`}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                          title="Edit content"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                          title="Delete content"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default function ContentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading...</div>}>
      <ContentPageInner />
    </Suspense>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
}: {
  label: string
  value: number
  icon: typeof FileText
  color: 'blue' | 'amber' | 'green' | 'red'
  loading?: boolean
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
  }

  return (
    <div className="card">
      <div className="flex items-center space-x-3">
        <div className={cn('p-2 rounded-lg', colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          {loading ? (
            <div className="h-8 w-8 animate-pulse bg-slate-200 rounded mt-1" />
          ) : (
            <p className="text-2xl font-bold text-slate-900">{value}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ChannelBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    YOUTUBE: 'bg-red-100 text-red-700',
    TIKTOK: 'bg-slate-900 text-white',
    LINKEDIN: 'bg-blue-100 text-blue-700',
    X_TWITTER: 'bg-slate-100 text-slate-900',
    FACEBOOK: 'bg-blue-100 text-blue-600',
    INSTAGRAM: 'bg-pink-100 text-pink-700',
  }

  return (
    <span className={cn('px-2 py-0.5 rounded text-xs font-medium', colors[type] || 'bg-slate-100 text-slate-700')}>
      {type.replace('_', ' ')}
    </span>
  )
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hour${Math.floor(seconds / 3600) > 1 ? 's' : ''} ago`
  return `${Math.floor(seconds / 86400)} day${Math.floor(seconds / 86400) > 1 ? 's' : ''} ago`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

type SortField = 'title' | 'status' | 'scheduledFor' | 'createdAt'

function SortableHeader({
  field,
  label,
  sortField,
  sortDirection,
  onToggle,
}: {
  field: SortField
  label: string
  sortField: SortField
  sortDirection: 'asc' | 'desc'
  onToggle: (field: SortField) => void
}) {
  const isActive = sortField === field
  return (
    <th className="px-4 py-3 font-medium">
      <button
        onClick={() => onToggle(field)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-slate-900 transition-colors',
          isActive ? 'text-slate-900' : 'text-slate-500'
        )}
      >
        {label}
        {isActive ? (
          sortDirection === 'asc' ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )
        ) : (
          <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
        )}
      </button>
    </th>
  )
}
