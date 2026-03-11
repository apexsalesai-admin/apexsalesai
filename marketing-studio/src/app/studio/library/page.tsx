'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  FileText,
  Video,
  Mail,
  BookOpen,
  Loader2,
  AlertCircle,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContentItem {
  id: string
  title: string
  body: string
  contentType: string
  status: string
  createdAt: string
  channels: string[]
  mediaUrls?: string[]
}

interface TypeCount {
  type: string
  count: number
}

const TYPE_TABS = [
  { id: 'all', label: 'All' },
  { id: 'POST', label: 'Posts' },
  { id: 'VIDEO', label: 'Videos' },
  { id: 'ARTICLE', label: 'Articles' },
  { id: 'EMAIL', label: 'Emails' },
]

const TYPE_ICONS: Record<string, typeof FileText> = {
  POST: FileText,
  VIDEO: Video,
  ARTICLE: BookOpen,
  EMAIL: Mail,
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-slate-100', text: 'text-slate-600' },
  SCHEDULED: { bg: 'bg-purple-100', text: 'text-purple-700' },
  PENDING_APPROVAL: { bg: 'bg-amber-100', text: 'text-amber-700' },
  APPROVED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  PUBLISHED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-700' },
}

export default function LibraryPage() {
  const [activeType, setActiveType] = useState('all')
  const [items, setItems] = useState<ContentItem[]>([])
  const [typeCounts, setTypeCounts] = useState<TypeCount[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const limit = 20

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (activeType !== 'all') params.set('type', activeType)

    fetch(`/api/studio/library?${params}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setItems(res.data)
          setTotal(res.total)
          setTypeCounts(res.typeCounts || [])
        } else {
          setError(res.error || 'Failed to load library')
        }
      })
      .catch(() => setError('Failed to load library'))
      .finally(() => setLoading(false))
  }, [activeType, page])

  const totalPages = Math.ceil(total / limit)

  const getCount = (type: string) => {
    if (type === 'all') return typeCounts.reduce((sum, t) => sum + t.count, 0)
    return typeCounts.find(t => t.type === type)?.count || 0
  }

  const filtered = search
    ? items.filter(item => item.title.toLowerCase().includes(search.toLowerCase()))
    : items

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Content Library</h1>
          <p className="text-slate-500">All your content organized by type</p>
        </div>
        <Link
          href="/studio/create"
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
        >
          <Plus className="w-4 h-4" /> Create New
        </Link>
      </div>

      {/* Type Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-0">
        {TYPE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveType(tab.id); setPage(1) }}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-[1px] transition-colors',
              activeType === tab.id
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.label}
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-100 text-xs text-slate-500">
              {getCount(tab.id)}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search content..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-10 h-10 text-slate-300 mb-3" />
          <p className="text-slate-500 mb-4">
            {activeType === 'all' ? 'No content yet.' : `No ${activeType.toLowerCase()} content yet.`}
          </p>
          <Link href="/studio/create" className="text-purple-600 font-medium hover:text-purple-700 text-sm">
            Create your first piece
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const Icon = TYPE_ICONS[item.contentType] || FileText
            const statusStyle = STATUS_STYLES[item.status] || STATUS_STYLES.DRAFT
            const hasImage = item.mediaUrls && item.mediaUrls.length > 0
            const detailHref = hasImage ? `/studio/image/${item.id}` : `/studio/content/${item.id}`
            return (
              <Link
                key={item.id}
                href={detailHref}
                className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
              >
                {hasImage ? (
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.mediaUrls![0]}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-slate-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{item.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(item.createdAt).toLocaleDateString()}
                    {!hasImage && item.body && ` · ${item.body.split(/\s+/).length} words`}
                    {hasImage && ' · Image'}
                  </p>
                </div>
                <span className={cn('px-2 py-1 rounded text-xs font-medium', statusStyle.bg, statusStyle.text)}>
                  {item.status.replace(/_/g, ' ')}
                </span>
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
