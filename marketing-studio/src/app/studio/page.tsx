'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BarChart3, TrendingUp, Users, DollarSign, FileText, CheckCircle, Clock, AlertTriangle, ChevronRight, Eye, ThumbsUp, ThumbsDown, MessageSquare, Activity, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OnboardingChecklist } from '@/components/ui/onboarding-checklist'

// Mock data - in production, this would come from the telemetry API
const KPI_DATA = {
  postsCreated: 127,
  postsPublished: 118,
  approvalsPending: 3,
  leadsAttributed: 45,
  meetingsBooked: 22,
  revenueAttributed: 125000,
}

const RECENT_ACTIVITY = [
  { id: 1, type: 'publish', message: 'TikTok video published successfully', time: '5 min ago', status: 'success' },
  { id: 2, type: 'approval', message: 'YouTube video awaiting approval', time: '12 min ago', status: 'pending' },
  { id: 3, type: 'publish', message: 'LinkedIn post published', time: '1 hour ago', status: 'success' },
  { id: 4, type: 'error', message: 'X post failed - rate limit exceeded', time: '2 hours ago', status: 'error' },
  { id: 5, type: 'approval', message: 'Blog article approved by Sarah', time: '3 hours ago', status: 'success' },
]

// Mock pending approvals - in production from StudioContentApproval table
const PENDING_APPROVALS = [
  {
    id: 'content_1',
    title: 'Q1 Product Launch Announcement',
    contentType: 'VIDEO',
    channels: ['YOUTUBE', 'LINKEDIN'],
    createdBy: 'Alex Rivera',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    submittedAt: new Date(Date.now() - 30 * 60 * 1000),
    priority: 'high',
  },
  {
    id: 'content_2',
    title: 'Weekly Tips: Productivity Hacks',
    contentType: 'POST',
    channels: ['X_TWITTER', 'LINKEDIN'],
    createdBy: 'Sarah Chen',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    priority: 'medium',
  },
  {
    id: 'content_3',
    title: 'Behind the Scenes: Team Culture',
    contentType: 'VIDEO',
    channels: ['TIKTOK', 'INSTAGRAM'],
    createdBy: 'Mike Johnson',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    priority: 'low',
  },
]

export default function StudioDashboard() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Overview of your marketing performance and activity
        </p>
      </div>

      {/* Onboarding Checklist (shown until setup complete) */}
      <OnboardingChecklist />

      {/* System Readiness Widget */}
      <SystemReadinessWidget />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Posts Created"
          value={KPI_DATA.postsCreated}
          icon={FileText}
          color="teal"
          trend="+12% from last month"
        />
        <KPICard
          title="Revenue Generated"
          value={`$${KPI_DATA.revenueAttributed.toLocaleString()}`}
          icon={DollarSign}
          color="green"
          trend="+23% from last month"
        />
        <KPICard
          title="Meetings Booked"
          value={KPI_DATA.meetingsBooked}
          icon={Users}
          color="purple"
          trend="+8% from last month"
        />
        <Link href="/studio/approvals">
          <KPICard
            title="Approvals Pending"
            value={KPI_DATA.approvalsPending}
            icon={Clock}
            color="amber"
            trend="3 items need review"
            clickable
          />
        </Link>
      </div>

      {/* Pending Approvals Widget */}
      {PENDING_APPROVALS.length > 0 && (
        <div className="card border-l-4 border-l-amber-400">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Pending Approvals</h2>
                <p className="text-sm text-slate-500">{PENDING_APPROVALS.length} items need your review</p>
              </div>
            </div>
            <Link
              href="/studio/approvals"
              className="flex items-center space-x-1 text-sm font-medium text-purple-600 hover:text-purple-700"
            >
              <span>View all</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {PENDING_APPROVALS.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm',
                    item.contentType === 'VIDEO' ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                  )}>
                    {item.contentType === 'VIDEO' ? 'V' : 'P'}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-slate-500">by {item.createdBy}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-500">
                        {item.channels.join(', ')}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className={cn(
                        'text-xs font-medium px-1.5 py-0.5 rounded',
                        item.priority === 'high' && 'bg-red-100 text-red-700',
                        item.priority === 'medium' && 'bg-amber-100 text-amber-700',
                        item.priority === 'low' && 'bg-slate-100 text-slate-700'
                      )}>
                        {item.priority}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Link
                    href={`/studio/content/${item.id}`}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="View content"
                  >
                    <Eye className="w-4 h-4" />
                  </Link>
                  <button
                    className="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Approve"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Reject"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts and Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Performance Chart Placeholder */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Content Performance</h2>
            <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
          <div className="h-64 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-center text-slate-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-2" />
              <p>Chart visualization</p>
              <p className="text-sm">(Recharts integration ready)</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {RECENT_ACTIVITY.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                  activity.status === 'success' && 'bg-green-100',
                  activity.status === 'pending' && 'bg-amber-100',
                  activity.status === 'error' && 'bg-red-100'
                )}>
                  {activity.status === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
                  {activity.status === 'pending' && <Clock className="w-4 h-4 text-amber-600" />}
                  {activity.status === 'error' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">{activity.message}</p>
                  <p className="text-xs text-slate-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Workflow Status */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Active Workflows</h2>
          <a href="/studio/workflows" className="text-sm text-apex-primary hover:underline">
            View all workflows
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-slate-500 border-b border-slate-200">
                <th className="pb-3 font-medium">Workflow</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Trigger</th>
                <th className="pb-3 font-medium">Target</th>
                <th className="pb-3 font-medium">Last Run</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-slate-100">
                <td className="py-3 font-medium text-slate-900">TikTok → YouTube Auto-Share</td>
                <td className="py-3"><span className="badge-success">Active</span></td>
                <td className="py-3 text-slate-600">TikTok new post</td>
                <td className="py-3 text-slate-600">YouTube Shorts</td>
                <td className="py-3 text-slate-500">5 min ago</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 font-medium text-slate-900">Blog → LinkedIn Share</td>
                <td className="py-3"><span className="badge-success">Active</span></td>
                <td className="py-3 text-slate-600">New blog post</td>
                <td className="py-3 text-slate-600">LinkedIn</td>
                <td className="py-3 text-slate-500">1 hour ago</td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-slate-900">YouTube → X Thread</td>
                <td className="py-3"><span className="badge-warning">Paused</span></td>
                <td className="py-3 text-slate-600">YouTube video</td>
                <td className="py-3 text-slate-600">X Thread</td>
                <td className="py-3 text-slate-500">2 days ago</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function KPICard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  clickable,
}: {
  title: string
  value: string | number
  icon: typeof BarChart3
  color: 'teal' | 'green' | 'purple' | 'amber'
  trend: string
  clickable?: boolean
}) {
  const colorClasses = {
    teal: 'bg-apex-primary/10 text-apex-primary',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
  }

  const trendPositive = trend.includes('+')

  return (
    <div className={cn(
      "card group hover:border-apex-primary/30",
      clickable && "cursor-pointer hover:shadow-md transition-shadow"
    )}>
      <div className="flex items-center justify-between">
        <div className={cn('p-2.5 rounded-xl', colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className={cn(
          'flex items-center space-x-1 text-xs font-medium',
          trendPositive ? 'text-green-600' : 'text-slate-400'
        )}>
          <TrendingUp className={cn('w-3 h-3', !trendPositive && 'rotate-90')} />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{value}</p>
        <p className={cn(
          'text-xs mt-2',
          trendPositive ? 'text-green-600' : 'text-slate-400'
        )}>{trend}</p>
      </div>
    </div>
  )
}

function SystemReadinessWidget() {
  const [checks, setChecks] = useState<Array<{
    name: string
    status: 'ready' | 'pending' | 'error'
    message: string
    required: boolean
  }> | null>(null)
  const [loading, setLoading] = useState(true)
  const [overallReady, setOverallReady] = useState(false)
  const [score, setScore] = useState(0)

  useEffect(() => {
    fetch('/api/system/readiness')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.readiness) {
          setChecks(data.readiness.checks)
          setOverallReady(data.readiness.overallReady)
          setScore(data.readiness.overallScore)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Checking system readiness...</span>
        </div>
      </div>
    )
  }

  if (!checks) return null

  const statusColor = (status: string) => {
    if (status === 'ready') return 'bg-emerald-500'
    if (status === 'error') return 'bg-red-500'
    return 'bg-amber-500'
  }

  const statusText = (status: string) => {
    if (status === 'ready') return 'text-emerald-700 bg-emerald-50'
    if (status === 'error') return 'text-red-700 bg-red-50'
    return 'text-amber-700 bg-amber-50'
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            overallReady ? 'bg-emerald-100' : 'bg-amber-100'
          )}>
            <Activity className={cn(
              'w-5 h-5',
              overallReady ? 'text-emerald-600' : 'text-amber-600'
            )} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">System Readiness</h2>
            <p className="text-sm text-slate-500">
              {overallReady ? 'All systems operational' : 'Some systems need attention'}
            </p>
          </div>
        </div>
        <span className={cn(
          'px-3 py-1 text-sm font-semibold rounded-full',
          overallReady
            ? 'bg-emerald-100 text-emerald-700'
            : 'bg-amber-100 text-amber-700'
        )}>
          {score}%
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {checks.map((check) => (
          <div
            key={check.name}
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50"
          >
            <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', statusColor(check.status))} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{check.name}</p>
              <p className={cn(
                'text-xs px-1.5 py-0.5 rounded inline-block mt-0.5',
                statusText(check.status)
              )}>
                {check.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
