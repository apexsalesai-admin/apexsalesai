'use client'

import { useState, useEffect } from 'react'
import {
  BarChart3,
  TrendingUp,
  Eye,
  FileText,
  CheckCircle,
  XCircle,
  ArrowUp,
  Sparkles,
  Target,
  Users,
  Zap,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface AnalyticsData {
  summary: {
    totalContent: number
    publishedContent: number
    draftContent: number
    reviewContent: number
    publishSuccess: number
    publishFailed: number
    publishRate: number
  }
  channelDistribution: Record<string, number>
  weeklyActivity: string[]
  recentJobs: {
    id: string
    status: string
    targetChannels: string[]
    createdAt: string
    completedAt: string | null
    contentId: string
  }[]
}

const CHANNEL_COLORS: Record<string, string> = {
  linkedin: '#0A66C2',
  LINKEDIN: '#0A66C2',
  x: '#000000',
  X_TWITTER: '#000000',
  twitter: '#000000',
  TWITTER: '#000000',
  youtube: '#FF0000',
  YOUTUBE: '#FF0000',
  facebook: '#1877F2',
  FACEBOOK: '#1877F2',
  instagram: '#E4405F',
  INSTAGRAM: '#E4405F',
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Published' },
  PUBLISHED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Published' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
  PUBLISHING: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Publishing' },
  PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending' },
  PARTIAL: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Partial' },
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/studio/analytics')
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setData(res.data)
        } else {
          setError(res.error || 'Failed to load analytics')
        }
      })
      .catch(() => setError('Failed to load analytics'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Unable to load analytics</h2>
        <p className="text-sm text-slate-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
        >
          Retry
        </button>
      </div>
    )
  }

  const { summary, channelDistribution, weeklyActivity, recentJobs } = data

  // Build weekly activity chart data
  const weeklyChartData = buildWeeklyChart(weeklyActivity)

  // Build channel pie chart data
  const channelChartData = Object.entries(channelDistribution).map(([channel, count]) => ({
    name: formatChannelName(channel),
    value: count,
    color: CHANNEL_COLORS[channel] || '#8B5CF6',
  }))

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-500">Track your content performance across all channels</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={FileText}
          label="Total Content"
          value={summary.totalContent}
          subtext={`${summary.draftContent} drafts`}
          color="blue"
        />
        <MetricCard
          icon={CheckCircle}
          label="Published"
          value={summary.publishedContent}
          subtext={`${summary.publishRate}% success rate`}
          color="emerald"
        />
        <MetricCard
          icon={Eye}
          label="In Review"
          value={summary.reviewContent}
          subtext="awaiting approval"
          color="amber"
        />
        <MetricCard
          icon={BarChart3}
          label="Publish Jobs (30d)"
          value={summary.publishSuccess + summary.publishFailed}
          subtext={`${summary.publishSuccess} succeeded, ${summary.publishFailed} failed`}
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Activity */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6">Content Created (Last 30 Days)</h3>
          {weeklyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Content" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-slate-400">
              No content created in the last 30 days
            </div>
          )}
        </div>

        {/* Channel Distribution */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6">Publishing by Channel (30d)</h3>
          {channelChartData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie
                    data={channelChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {channelChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {channelChartData.map(ch => (
                  <div key={ch.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ch.color }} />
                      <span className="text-sm text-slate-700">{ch.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{ch.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-slate-400">
              No publishing data yet
            </div>
          )}
        </div>
      </div>

      {/* Recent Publishes + AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Publish Jobs */}
        <div className="col-span-2 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6">Recent Publish Jobs</h3>
          {recentJobs.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 uppercase">
                  <th className="pb-4">Channels</th>
                  <th className="pb-4">Status</th>
                  <th className="pb-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentJobs.map(job => {
                  const style = STATUS_STYLES[job.status] || STATUS_STYLES.PENDING
                  return (
                    <tr key={job.id} className="border-t border-slate-100">
                      <td className="py-3">
                        <div className="flex gap-1.5 flex-wrap">
                          {(job.targetChannels || []).map((ch, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium"
                            >
                              {formatChannelName(ch)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={cn('px-2 py-1 rounded text-xs font-medium', style.bg, style.text)}>
                          {style.label}
                        </span>
                      </td>
                      <td className="py-3 text-right text-sm text-slate-500">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-12 text-center text-slate-400">No publish jobs yet</div>
          )}
        </div>

        {/* AI Insights (static tips) */}
        <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
          <div className="flex items-center space-x-2 mb-6">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-purple-900">Mia&apos;s Insights</h3>
          </div>
          <div className="space-y-4">
            <InsightCard
              icon={TrendingUp}
              title="Best Posting Time"
              description="Your audience is most active on Tuesdays at 10 AM"
              color="emerald"
            />
            <InsightCard
              icon={Target}
              title="Content Recommendation"
              description="Video content gets 3x more engagement. Consider creating more."
              color="blue"
            />
            <InsightCard
              icon={Users}
              title="Audience Growth"
              description="LinkedIn followers growing 15% faster than average"
              color="purple"
            />
            <InsightCard
              icon={Zap}
              title="Quick Win"
              description="Add CTAs to posts — they increase engagement by 25%"
              color="amber"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: typeof FileText
  label: string
  value: number
  subtext: string
  color: 'blue' | 'emerald' | 'amber' | 'purple'
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
  }

  return (
    <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-3 rounded-xl', colorClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5">{subtext}</p>
    </div>
  )
}

function InsightCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: typeof TrendingUp
  title: string
  description: string
  color: 'emerald' | 'blue' | 'purple' | 'amber'
}) {
  const colorClasses = {
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
  }

  return (
    <div className="p-4 bg-white rounded-xl">
      <div className="flex items-start space-x-3">
        <div className={cn('p-2 rounded-lg', colorClasses[color])}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="font-medium text-slate-900 text-sm">{title}</p>
          <p className="text-xs text-slate-600 mt-1">{description}</p>
        </div>
      </div>
    </div>
  )
}

function formatChannelName(ch: string): string {
  const names: Record<string, string> = {
    linkedin: 'LinkedIn',
    LINKEDIN: 'LinkedIn',
    x: 'X',
    X_TWITTER: 'X',
    twitter: 'X',
    TWITTER: 'X',
    youtube: 'YouTube',
    YOUTUBE: 'YouTube',
    facebook: 'Facebook',
    FACEBOOK: 'Facebook',
    instagram: 'Instagram',
    INSTAGRAM: 'Instagram',
  }
  return names[ch] || ch
}

function buildWeeklyChart(dates: string[]): { week: string; count: number }[] {
  if (!dates.length) return []

  const now = new Date()
  const weeks: { week: string; count: number }[] = []

  for (let i = 4; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - i * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)

    const count = dates.filter(d => {
      const date = new Date(d)
      return date >= weekStart && date < weekEnd
    }).length

    weeks.push({
      week: `Week ${5 - i}`,
      count,
    })
  }

  return weeks
}
