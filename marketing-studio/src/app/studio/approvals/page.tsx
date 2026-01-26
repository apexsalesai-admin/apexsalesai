'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Filter,
  Search,
  ChevronRight,
  Video,
  FileText,
  AlertCircle,
  User,
  Calendar,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Mock pending approvals data - in production from StudioContentApproval + ScheduledContent
const MOCK_APPROVALS = [
  {
    id: 'content_1',
    title: 'Q1 Product Launch Announcement',
    body: 'We are excited to announce our Q1 product launch! Join us for an exclusive reveal of our latest innovations that will transform how you work...',
    contentType: 'VIDEO',
    channels: ['YOUTUBE', 'LINKEDIN'],
    createdBy: {
      id: 'user_1',
      name: 'Alex Rivera',
      email: 'alex@lyfye.com',
      avatar: null,
    },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    submittedAt: new Date(Date.now() - 30 * 60 * 1000),
    scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
    priority: 'high',
    status: 'PENDING_APPROVAL',
    comments: [
      {
        id: 'comment_1',
        author: 'Sarah Chen',
        body: 'Great content! Just a small suggestion - can we add the CTA at the end?',
        createdAt: new Date(Date.now() - 15 * 60 * 1000),
      },
    ],
  },
  {
    id: 'content_2',
    title: 'Weekly Tips: Productivity Hacks for Remote Teams',
    body: 'Working remotely? Here are 5 productivity hacks that our team swears by: 1. Time blocking for deep work 2. Virtual coffee breaks 3. Async communication best practices...',
    contentType: 'POST',
    channels: ['X_TWITTER', 'LINKEDIN'],
    createdBy: {
      id: 'user_2',
      name: 'Sarah Chen',
      email: 'sarah@lyfye.com',
      avatar: null,
    },
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    scheduledFor: new Date(Date.now() + 48 * 60 * 60 * 1000),
    priority: 'medium',
    status: 'PENDING_APPROVAL',
    comments: [],
  },
  {
    id: 'content_3',
    title: 'Behind the Scenes: Team Culture at Lyfye',
    body: 'Ever wondered what makes our team tick? Take a peek behind the curtain as we share a day in the life at Lyfye. From morning standups to creative brainstorming sessions...',
    contentType: 'VIDEO',
    channels: ['TIKTOK', 'INSTAGRAM'],
    createdBy: {
      id: 'user_3',
      name: 'Mike Johnson',
      email: 'mike@lyfye.com',
      avatar: null,
    },
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    scheduledFor: null,
    priority: 'low',
    status: 'PENDING_APPROVAL',
    comments: [],
  },
  {
    id: 'content_4',
    title: 'Customer Success Story: How TechCorp 10x Their Pipeline',
    body: 'TechCorp came to us with a challenge: their sales pipeline was stagnant. Within 3 months of using our platform, they saw a 10x increase in qualified leads...',
    contentType: 'ARTICLE',
    channels: ['LINKEDIN'],
    createdBy: {
      id: 'user_4',
      name: 'Emily Watson',
      email: 'emily@lyfye.com',
      avatar: null,
    },
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    scheduledFor: new Date(Date.now() + 72 * 60 * 60 * 1000),
    priority: 'medium',
    status: 'PENDING_APPROVAL',
    comments: [
      {
        id: 'comment_2',
        author: 'Alex Rivera',
        body: 'We should get a quote from the TechCorp CEO to add credibility.',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
      {
        id: 'comment_3',
        author: 'Sarah Chen',
        body: 'Good idea! I\'ll reach out to their team today.',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      },
    ],
  },
]

// Recently reviewed items
const RECENT_REVIEWS = [
  {
    id: 'content_5',
    title: 'New Feature Announcement: AI Video Generation',
    action: 'APPROVED',
    reviewedBy: 'Admin',
    reviewedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    id: 'content_6',
    title: 'Weekly Newsletter: Industry Trends',
    action: 'APPROVED',
    reviewedBy: 'Sarah Chen',
    reviewedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
  {
    id: 'content_7',
    title: 'Promotional Post: Black Friday Sale',
    action: 'REJECTED',
    reviewedBy: 'Admin',
    reviewedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    reason: 'Compliance issues with discount claims',
  },
]

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function formatScheduledDate(date: Date | null): string {
  if (!date) return 'Not scheduled'
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function ApprovalsPage() {
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [processingAction, setProcessingAction] = useState<string | null>(null)

  const filteredApprovals = MOCK_APPROVALS.filter((item) => {
    if (filter !== 'all' && item.priority !== filter) return false
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const selectedContent = MOCK_APPROVALS.find((item) => item.id === selectedItem)

  const handleApprove = async (contentId: string) => {
    setProcessingAction(contentId)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    // In production: POST /api/content/[id]/approve
    alert(`Content ${contentId} approved!`)
    setProcessingAction(null)
  }

  const handleReject = async (contentId: string) => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }
    setProcessingAction(contentId)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    // In production: POST /api/content/[id]/reject
    alert(`Content ${contentId} rejected with reason: ${rejectReason}`)
    setProcessingAction(null)
    setShowRejectModal(false)
    setRejectReason('')
    setSelectedItem(null)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-sm text-slate-500 mb-2">
            <Link href="/studio" className="hover:text-slate-700">
              Dashboard
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-slate-900">Approvals</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Content Approvals</h1>
          <p className="text-slate-500 mt-1">
            Review and approve content before publishing
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">
              {MOCK_APPROVALS.length} pending
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent w-64"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-500">Priority:</span>
          {(['all', 'high', 'medium', 'low'] as const).map((priority) => (
            <button
              key={priority}
              onClick={() => setFilter(priority)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                filter === priority
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Approval Queue */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Pending Review</h2>

          {filteredApprovals.length === 0 ? (
            <div className="card text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">All caught up!</h3>
              <p className="text-slate-500">No content pending approval at the moment.</p>
            </div>
          ) : (
            filteredApprovals.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'card cursor-pointer transition-all',
                  selectedItem === item.id
                    ? 'ring-2 ring-purple-500 border-purple-200'
                    : 'hover:border-slate-300'
                )}
                onClick={() => setSelectedItem(item.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shrink-0',
                        item.contentType === 'VIDEO'
                          ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                          : item.contentType === 'ARTICLE'
                          ? 'bg-gradient-to-br from-green-500 to-teal-500'
                          : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                      )}
                    >
                      {item.contentType === 'VIDEO' ? (
                        <Video className="w-6 h-6" />
                      ) : (
                        <FileText className="w-6 h-6" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{item.title}</h3>
                      <p className="text-sm text-slate-500 line-clamp-2 mt-1">{item.body}</p>
                      <div className="flex items-center flex-wrap gap-2 mt-3">
                        <div className="flex items-center space-x-1 text-xs text-slate-500">
                          <User className="w-3 h-3" />
                          <span>{item.createdBy.name}</span>
                        </div>
                        <span className="text-slate-300">•</span>
                        <div className="flex items-center space-x-1 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>Submitted {formatRelativeTime(item.submittedAt)}</span>
                        </div>
                        {item.scheduledFor && (
                          <>
                            <span className="text-slate-300">•</span>
                            <div className="flex items-center space-x-1 text-xs text-slate-500">
                              <Calendar className="w-3 h-3" />
                              <span>{formatScheduledDate(item.scheduledFor)}</span>
                            </div>
                          </>
                        )}
                        {item.comments.length > 0 && (
                          <>
                            <span className="text-slate-300">•</span>
                            <div className="flex items-center space-x-1 text-xs text-slate-500">
                              <MessageSquare className="w-3 h-3" />
                              <span>{item.comments.length} comments</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2 shrink-0">
                    <span
                      className={cn(
                        'text-xs font-medium px-2 py-1 rounded-full',
                        item.priority === 'high' && 'bg-red-100 text-red-700',
                        item.priority === 'medium' && 'bg-amber-100 text-amber-700',
                        item.priority === 'low' && 'bg-slate-100 text-slate-700'
                      )}
                    >
                      {item.priority} priority
                    </span>
                    <div className="flex items-center space-x-1">
                      {item.channels.map((channel) => (
                        <span
                          key={channel}
                          className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
                        >
                          {channel.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedItem === item.id && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-end space-x-3">
                      <Link
                        href={`/studio/content/${item.id}`}
                        className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View Full</span>
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowRejectModal(true)
                        }}
                        disabled={processingAction === item.id}
                        className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <ThumbsDown className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleApprove(item.id)
                        }}
                        disabled={processingAction === item.id}
                        className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {processingAction === item.id ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <ThumbsUp className="w-4 h-4" />
                        )}
                        <span>Approve</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-4">Approval Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-sm text-slate-600">Pending</span>
                </div>
                <span className="text-lg font-bold text-slate-900">{MOCK_APPROVALS.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <span className="text-sm text-slate-600">Approved Today</span>
                </div>
                <span className="text-lg font-bold text-slate-900">12</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <XCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <span className="text-sm text-slate-600">Rejected Today</span>
                </div>
                <span className="text-lg font-bold text-slate-900">2</span>
              </div>
            </div>
          </div>

          {/* Recent Reviews */}
          <div className="card">
            <h3 className="font-semibold text-slate-900 mb-4">Recent Reviews</h3>
            <div className="space-y-3">
              {RECENT_REVIEWS.map((review) => (
                <div
                  key={review.id}
                  className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg"
                >
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                      review.action === 'APPROVED' ? 'bg-green-100' : 'bg-red-100'
                    )}
                  >
                    {review.action === 'APPROVED' ? (
                      <CheckCircle className="w-3 h-3 text-green-600" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{review.title}</p>
                    <p className="text-xs text-slate-500">
                      {review.action === 'APPROVED' ? 'Approved' : 'Rejected'} by {review.reviewedBy} •{' '}
                      {formatRelativeTime(review.reviewedAt)}
                    </p>
                    {review.reason && (
                      <p className="text-xs text-red-600 mt-1">{review.reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Guidelines */}
          <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Approval Guidelines</h3>
                <ul className="text-sm text-slate-600 space-y-2">
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span>Check brand voice consistency</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span>Verify compliance with guidelines</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span>Review target audience fit</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <span>Confirm scheduling accuracy</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedContent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Reject Content</h3>
            <p className="text-sm text-slate-500 mb-4">
              Please provide a reason for rejecting &quot;{selectedContent.title}&quot;
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
            <div className="flex items-center justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectReason('')
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(selectedContent.id)}
                disabled={!rejectReason.trim() || processingAction === selectedContent.id}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {processingAction === selectedContent.id ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <ThumbsDown className="w-4 h-4" />
                )}
                <span>Reject Content</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
