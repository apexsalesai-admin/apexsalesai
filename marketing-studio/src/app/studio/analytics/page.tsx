'use client'

import { useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  Users,
  Clock,
  Calendar,
  FileText,
  Video,
  Sparkles,
  Target,
  Zap,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCard {
  label: string
  value: string
  change: number
  changeLabel: string
  icon: typeof BarChart3
  color: string
}

const METRICS: MetricCard[] = [
  { label: 'Total Impressions', value: '124.5K', change: 12.5, changeLabel: 'vs last month', icon: Eye, color: 'blue' },
  { label: 'Engagement Rate', value: '4.8%', change: 0.6, changeLabel: 'vs last month', icon: Heart, color: 'pink' },
  { label: 'Total Followers', value: '8,432', change: 324, changeLabel: 'new this month', icon: Users, color: 'purple' },
  { label: 'Content Published', value: '42', change: 8, changeLabel: 'vs last month', icon: FileText, color: 'emerald' },
]

const CHANNEL_STATS = [
  { channel: 'LinkedIn', impressions: '45.2K', engagement: '5.2%', followers: '3,421', growth: 15, color: 'bg-blue-500' },
  { channel: 'YouTube', impressions: '32.1K', engagement: '4.1%', followers: '2,156', growth: 22, color: 'bg-red-500' },
  { channel: 'X/Twitter', impressions: '28.4K', engagement: '3.8%', followers: '1,892', growth: 8, color: 'bg-slate-900' },
  { channel: 'Instagram', impressions: '18.8K', engagement: '6.2%', followers: '963', growth: 35, color: 'bg-pink-500' },
]

const TOP_CONTENT = [
  { title: '5 AI Tools Changing Marketing', type: 'Video', views: '12.4K', engagement: '8.2%', channel: 'YouTube' },
  { title: 'The Future of B2B Sales', type: 'Post', views: '8.7K', engagement: '6.5%', channel: 'LinkedIn' },
  { title: 'Quick Marketing Tips Thread', type: 'Thread', views: '6.2K', engagement: '5.1%', channel: 'X/Twitter' },
  { title: 'Behind the Scenes Reel', type: 'Reel', views: '5.8K', engagement: '9.3%', channel: 'Instagram' },
]

const TIME_RANGES = [
  { id: '7d', label: '7 days' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: '1y', label: '1 year' },
]

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d')

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500">Track your content performance across all channels</p>
        </div>
        <div className="flex items-center space-x-2">
          {TIME_RANGES.map(range => (
            <button
              key={range.id}
              onClick={() => setTimeRange(range.id)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                timeRange === range.id
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-6">
        {METRICS.map(metric => {
          const Icon = metric.icon
          const colorClasses: Record<string, string> = {
            blue: 'bg-blue-100 text-blue-600',
            pink: 'bg-pink-100 text-pink-600',
            purple: 'bg-purple-100 text-purple-600',
            emerald: 'bg-emerald-100 text-emerald-600',
          }

          return (
            <div key={metric.label} className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className={cn('p-3 rounded-xl', colorClasses[metric.color])}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className={cn(
                  'flex items-center space-x-1 text-sm font-medium',
                  metric.change >= 0 ? 'text-emerald-600' : 'text-red-600'
                )}>
                  {metric.change >= 0 ? (
                    <ArrowUp className="w-4 h-4" />
                  ) : (
                    <ArrowDown className="w-4 h-4" />
                  )}
                  <span>{Math.abs(metric.change)}%</span>
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{metric.value}</p>
              <p className="text-sm text-slate-500 mt-1">{metric.label}</p>
            </div>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Engagement Chart Placeholder */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900">Engagement Over Time</h3>
            <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5">
              <option>All Channels</option>
              <option>LinkedIn</option>
              <option>YouTube</option>
              <option>X/Twitter</option>
              <option>Instagram</option>
            </select>
          </div>
          {/* Simulated Chart */}
          <div className="h-64 flex items-end justify-between space-x-2">
            {[65, 45, 72, 58, 82, 68, 75, 90, 78, 85, 92, 88].map((height, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-purple-500 to-pink-500 rounded-t-lg transition-all hover:opacity-80"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs text-slate-500">
            <span>Jan</span>
            <span>Feb</span>
            <span>Mar</span>
            <span>Apr</span>
            <span>May</span>
            <span>Jun</span>
            <span>Jul</span>
            <span>Aug</span>
            <span>Sep</span>
            <span>Oct</span>
            <span>Nov</span>
            <span>Dec</span>
          </div>
        </div>

        {/* Channel Performance */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6">Channel Performance</h3>
          <div className="space-y-4">
            {CHANNEL_STATS.map(channel => (
              <div key={channel.channel} className="flex items-center space-x-4">
                <div className={cn('w-3 h-3 rounded-full', channel.color)} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-900">{channel.channel}</span>
                    <span className="text-sm text-slate-500">{channel.impressions}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', channel.color)}
                      style={{ width: `${channel.growth * 2}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-emerald-600">+{channel.growth}%</p>
                  <p className="text-xs text-slate-500">growth</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Content & AI Insights */}
      <div className="grid grid-cols-3 gap-6">
        {/* Top Content */}
        <div className="col-span-2 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6">Top Performing Content</h3>
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase">
                <th className="pb-4">Content</th>
                <th className="pb-4">Type</th>
                <th className="pb-4">Channel</th>
                <th className="pb-4 text-right">Views</th>
                <th className="pb-4 text-right">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {TOP_CONTENT.map((content, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-4">
                    <p className="font-medium text-slate-900">{content.title}</p>
                  </td>
                  <td className="py-4">
                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      content.type === 'Video' ? 'bg-red-100 text-red-700' :
                      content.type === 'Thread' ? 'bg-slate-100 text-slate-700' :
                      content.type === 'Reel' ? 'bg-pink-100 text-pink-700' :
                      'bg-blue-100 text-blue-700'
                    )}>
                      {content.type}
                    </span>
                  </td>
                  <td className="py-4 text-sm text-slate-600">{content.channel}</td>
                  <td className="py-4 text-right font-medium">{content.views}</td>
                  <td className="py-4 text-right">
                    <span className="text-emerald-600 font-medium">{content.engagement}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* AI Insights */}
        <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200">
          <div className="flex items-center space-x-2 mb-6">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-purple-900">Mia's Insights</h3>
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
              description="Add CTAs to posts - they increase engagement by 25%"
              color="amber"
            />
          </div>
        </div>
      </div>

      {/* Content Distribution */}
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-6">Content Distribution</h3>
        <div className="grid grid-cols-6 gap-4">
          {[
            { type: 'Posts', count: 18, icon: FileText, color: 'bg-blue-500' },
            { type: 'Videos', count: 8, icon: Video, color: 'bg-red-500' },
            { type: 'Threads', count: 6, icon: MessageSquare, color: 'bg-slate-900' },
            { type: 'Reels', count: 5, icon: Video, color: 'bg-pink-500' },
            { type: 'Articles', count: 3, icon: FileText, color: 'bg-emerald-500' },
            { type: 'Stories', count: 2, icon: Clock, color: 'bg-amber-500' },
          ].map(item => {
            const Icon = item.icon
            return (
              <div key={item.type} className="text-center">
                <div className={cn(
                  'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3',
                  item.color
                )}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{item.count}</p>
                <p className="text-sm text-slate-500">{item.type}</p>
              </div>
            )
          })}
        </div>
      </div>
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
