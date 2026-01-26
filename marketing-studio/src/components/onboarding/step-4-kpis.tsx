'use client'

import { useState } from 'react'
import { useOnboarding } from '@/hooks/use-onboarding'
import { ArrowLeft, Check, Target, TrendingUp, Users, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OnboardingKPIsData } from '@/types'

const PRIMARY_GOALS = [
  {
    value: 'pipeline' as const,
    label: 'Pipeline Growth',
    description: 'Focus on generating qualified opportunities',
    icon: TrendingUp,
    color: 'text-blue-600 bg-blue-100',
  },
  {
    value: 'leads' as const,
    label: 'Lead Generation',
    description: 'Focus on capturing new leads',
    icon: Users,
    color: 'text-green-600 bg-green-100',
  },
  {
    value: 'meetings' as const,
    label: 'Meetings Booked',
    description: 'Focus on booking sales meetings',
    icon: Target,
    color: 'text-purple-600 bg-purple-100',
  },
  {
    value: 'revenue' as const,
    label: 'Revenue Attribution',
    description: 'Track revenue generated from content',
    icon: DollarSign,
    color: 'text-amber-600 bg-amber-100',
  },
]

const KPI_COUNTERS = [
  { value: 'posts_created', label: 'Posts Created' },
  { value: 'posts_published', label: 'Posts Published' },
  { value: 'approvals_pending', label: 'Approvals Pending' },
  { value: 'leads_attributed', label: 'Leads Attributed' },
  { value: 'meetings_booked', label: 'Meetings Booked' },
  { value: 'revenue_attributed', label: 'Revenue Attributed' },
  { value: 'engagement_rate', label: 'Engagement Rate' },
  { value: 'conversion_rate', label: 'Conversion Rate' },
]

const TIME_WINDOWS = [
  { value: 'day' as const, label: 'Daily' },
  { value: 'week' as const, label: 'Weekly' },
  { value: 'month' as const, label: 'Monthly' },
  { value: 'quarter' as const, label: 'Quarterly' },
]

export function Step4KPIs() {
  const { steps, setKPIsData, completeOnboarding, prevStep } = useOnboarding()

  const [data, setData] = useState<OnboardingKPIsData>({
    primaryGoal: steps.kpis?.primaryGoal ?? 'pipeline',
    kpiCounters: steps.kpis?.kpiCounters ?? ['posts_created', 'posts_published', 'leads_attributed'],
    timeWindow: steps.kpis?.timeWindow ?? 'week',
  })

  const toggleKPICounter = (counter: string) => {
    setData(prev => ({
      ...prev,
      kpiCounters: prev.kpiCounters.includes(counter)
        ? prev.kpiCounters.filter(c => c !== counter)
        : [...prev.kpiCounters, counter],
    }))
  }

  const handleComplete = () => {
    setKPIsData(data)
    completeOnboarding()
  }

  const handleBack = () => {
    setKPIsData(data)
    prevStep()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Outcomes & KPIs</h2>
        <p className="text-slate-600 mt-1">
          Define your primary goals and the metrics you want to track.
        </p>
      </div>

      {/* Primary Goal */}
      <div className="space-y-3">
        <label className="label">Primary Goal</label>
        <div className="grid gap-3 sm:grid-cols-2">
          {PRIMARY_GOALS.map((goal) => {
            const Icon = goal.icon
            const isSelected = data.primaryGoal === goal.value

            return (
              <button
                key={goal.value}
                onClick={() => setData(prev => ({ ...prev, primaryGoal: goal.value }))}
                className={cn(
                  'text-left p-4 rounded-lg border transition-all',
                  isSelected
                    ? 'border-apex-primary bg-blue-50 ring-2 ring-apex-primary ring-offset-2'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <div className="flex items-center space-x-3">
                  <div className={cn('p-2 rounded-lg', goal.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{goal.label}</p>
                    <p className="text-sm text-slate-500">{goal.description}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* KPI Counters */}
      <div className="space-y-3">
        <label className="label">KPI Counters to Display</label>
        <p className="text-sm text-slate-500">
          Select which metrics to show on your dashboard.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {KPI_COUNTERS.map((counter) => {
            const isSelected = data.kpiCounters.includes(counter.value)

            return (
              <button
                key={counter.value}
                onClick={() => toggleKPICounter(counter.value)}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border transition-colors',
                  isSelected
                    ? 'border-apex-primary bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <span className="text-slate-900">{counter.label}</span>
                {isSelected && <Check className="w-4 h-4 text-apex-primary" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Time Window */}
      <div className="space-y-3">
        <label className="label">Default Time Window</label>
        <div className="flex space-x-2">
          {TIME_WINDOWS.map((window) => (
            <button
              key={window.value}
              onClick={() => setData(prev => ({ ...prev, timeWindow: window.value }))}
              className={cn(
                'px-4 py-2 rounded-lg border transition-colors',
                data.timeWindow === window.value
                  ? 'border-apex-primary bg-apex-primary text-white'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300'
              )}
            >
              {window.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h4 className="font-medium text-slate-900 mb-3">Dashboard Preview</h4>
        <div className="grid gap-3 sm:grid-cols-3">
          {data.kpiCounters.slice(0, 3).map((counter) => {
            const label = KPI_COUNTERS.find(c => c.value === counter)?.label ?? counter

            return (
              <div
                key={counter}
                className="bg-white rounded-lg border border-slate-200 p-3"
              >
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {counter === 'revenue_attributed' ? '$125,000' :
                   counter === 'posts_created' ? '127' :
                   counter === 'meetings_booked' ? '22' :
                   '--'}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4 border-t">
        <button
          onClick={handleBack}
          className="btn-secondary flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button
          onClick={handleComplete}
          disabled={data.kpiCounters.length === 0}
          className="btn-primary flex items-center space-x-2"
        >
          <Check className="w-4 h-4" />
          <span>Complete Setup</span>
        </button>
      </div>
    </div>
  )
}
