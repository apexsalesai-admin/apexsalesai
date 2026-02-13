'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { BarChart3, FileText, CheckCircle, Clock, AlertTriangle, Activity, Loader2, RefreshCw, Plug, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OnboardingChecklist } from '@/components/ui/onboarding-checklist'
import { MiaContextHint } from '@/components/studio/MiaContextHint'

interface DashboardStats {
  kpi: {
    postsCreated: number
    postsPublished: number
    approvalsPending: number
    integrationsConnected: number
    totalRenders: number
  }
  recentActivity: Array<{
    id: string
    type: string
    message: string
    status: string
    time: string
    permalink?: string
  }>
}

export default function StudioDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/studio/dashboard/stats')
      .then(r => r.json())
      .then(data => {
        if (data.success) setStats(data.data)
      })
      .catch(err => console.error('[Dashboard] Stats fetch error:', err))
      .finally(() => setStatsLoading(false))
  }, [])

  const kpi = stats?.kpi
  const activity = stats?.recentActivity ?? []

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Overview of your marketing performance and activity
        </p>
      </div>

      {/* Mia Context Hint — Dashboard */}
      <MiaContextHint
        hintKey="dashboard-welcome"
        message="Welcome to your command center! I'll show you real-time stats from your content pipeline. Connect more integrations to unlock full publishing."
        action={{ label: 'Go to Integrations', href: '/studio/integrations' }}
      />

      {/* Onboarding Checklist (shown until setup complete) */}
      <OnboardingChecklist />

      {/* System Readiness Widget */}
      <SystemReadinessWidget />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Posts Created"
          value={statsLoading ? '...' : kpi?.postsCreated ?? 0}
          icon={FileText}
          color="teal"
          trend={kpi ? `${kpi.postsPublished} published` : ''}
          loading={statsLoading}
        />
        <KPICard
          title="Integrations"
          value={statsLoading ? '...' : kpi?.integrationsConnected ?? 0}
          icon={Plug}
          color="green"
          trend="connected"
          loading={statsLoading}
        />
        <KPICard
          title="Video Renders"
          value={statsLoading ? '...' : kpi?.totalRenders ?? 0}
          icon={Video}
          color="purple"
          trend="total renders"
          loading={statsLoading}
        />
        <Link href="/studio/approvals">
          <KPICard
            title="Approvals Pending"
            value={statsLoading ? '...' : kpi?.approvalsPending ?? 0}
            icon={Clock}
            color="amber"
            trend={kpi?.approvalsPending ? `${kpi.approvalsPending} items need review` : 'All clear'}
            clickable
            loading={statsLoading}
          />
        </Link>
      </div>

      {/* Mia hint when no integrations connected */}
      {!statsLoading && (kpi?.integrationsConnected ?? 0) === 0 && (
        <MiaContextHint
          hintKey="dashboard-no-integrations"
          message="You don't have any integrations connected yet. Connect your AI providers and video tools to start creating and publishing content."
          action={{ label: 'Connect Integrations', href: '/studio/integrations' }}
          variant="warning"
        />
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
            {activity.length > 0 ? activity.map((item) => (
              <div key={item.id} className="flex items-start space-x-3">
                <div className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                  item.status === 'success' && 'bg-green-100',
                  item.status === 'pending' && 'bg-amber-100',
                  item.status === 'error' && 'bg-red-100'
                )}>
                  {item.status === 'success' && <CheckCircle className="w-4 h-4 text-green-600" />}
                  {item.status === 'pending' && <Clock className="w-4 h-4 text-amber-600" />}
                  {item.status === 'error' && <AlertTriangle className="w-4 h-4 text-red-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">{item.message}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(item.time).toLocaleString()}
                  </p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-slate-400">
                <Activity className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">No recent activity yet</p>
                <p className="text-xs mt-1">Publish content to see activity here</p>
              </div>
            )}
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
  loading,
}: {
  title: string
  value: string | number
  icon: typeof BarChart3
  color: 'teal' | 'green' | 'purple' | 'amber'
  trend: string
  clickable?: boolean
  loading?: boolean
}) {
  const colorClasses = {
    teal: 'bg-apex-primary/10 text-apex-primary',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    amber: 'bg-amber-100 text-amber-600',
  }

  return (
    <div className={cn(
      "card group hover:border-apex-primary/30",
      clickable && "cursor-pointer hover:shadow-md transition-shadow"
    )}>
      <div className="flex items-center justify-between">
        <div className={cn('p-2.5 rounded-xl', colorClasses[color])}>
          <Icon className="w-5 h-5" />
        </div>
        {loading && <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />}
      </div>
      <div className="mt-4">
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-1 tracking-tight">{value}</p>
        {trend && <p className="text-xs mt-2 text-slate-400">{trend}</p>}
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
  const [refreshing, setRefreshing] = useState(false)
  const [overallReady, setOverallReady] = useState(false)
  const [score, setScore] = useState(0)
  const [lastChecked, setLastChecked] = useState<string | null>(null)

  const fetchReadiness = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      // Fetch system readiness and token health in parallel
      const [readinessRes, tokenRes] = await Promise.all([
        fetch('/api/system/readiness'),
        fetch('/api/integrations/test').catch(() => null),
      ])

      const data = await readinessRes.json()
      if (data.success && data.readiness) {
        let allChecks = [...data.readiness.checks]

        // Append token health check from /api/integrations/test
        if (tokenRes?.ok) {
          const tokenData = await tokenRes.json()
          if (tokenData.success) {
            const integrations = tokenData.integrations || []
            const expired = integrations.filter((i: { status: string }) => i.status === 'EXPIRED').length
            const errors = integrations.filter((i: { status: string }) => i.status === 'ERROR').length
            const total = integrations.length

            let tokenStatus: 'ready' | 'pending' | 'error' = 'ready'
            let tokenMessage = 'No integrations configured'

            if (total > 0) {
              if (errors > 0) {
                tokenStatus = 'error'
                tokenMessage = `${errors} token error${errors > 1 ? 's' : ''}`
              } else if (expired > 0) {
                tokenStatus = 'pending'
                tokenMessage = `${expired} token${expired > 1 ? 's' : ''} expired`
              } else {
                tokenMessage = `${total} token${total > 1 ? 's' : ''} healthy`
              }
            }

            allChecks.push({
              name: 'Platform Tokens',
              status: tokenStatus,
              message: tokenMessage,
              required: false,
            })
          }
        }

        setChecks(allChecks)
        setOverallReady(data.readiness.overallReady)
        setScore(data.readiness.overallScore)
      }
      if (data.timestamp) {
        setLastChecked(data.timestamp)
      }
    } catch (err) {
      console.error('[SystemReadinessWidget]', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchReadiness() }, [fetchReadiness])

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
              {lastChecked && (
                <span className="ml-2 text-slate-400">
                  &middot; Last checked: {new Date(lastChecked).toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchReadiness(true)}
            disabled={refreshing}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </button>
          <span className={cn(
            'px-3 py-1 text-sm font-semibold rounded-full',
            overallReady
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          )}>
            {score}%
          </span>
        </div>
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
