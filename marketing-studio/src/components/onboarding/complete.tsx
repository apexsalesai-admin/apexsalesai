'use client'

import Link from 'next/link'
import { CheckCircle, ArrowRight, Zap, BarChart3, Workflow, Shield } from 'lucide-react'
import { useOnboarding } from '@/hooks/use-onboarding'

export function OnboardingComplete() {
  const { steps, resetOnboarding } = useOnboarding()

  const channelCount = steps.channels?.connectedChannels.length ?? 0

  return (
    <div className="max-w-2xl mx-auto text-center space-y-8">
      {/* Success icon */}
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
      </div>

      {/* Heading */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Setup Complete!</h1>
        <p className="text-lg text-slate-600 mt-2">
          Your Marketing Studio is ready to go. Here's what you've configured:
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 text-left">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Channels Connected</p>
              <p className="text-sm text-slate-500">
                {channelCount} channel{channelCount !== 1 ? 's' : ''} ready
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Brand Guardrails</p>
              <p className="text-sm text-slate-500">
                {steps.guardrails?.voiceTone.length ?? 0} voice tones,{' '}
                {steps.guardrails?.bannedClaims.length ?? 0} banned claims
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Workflow className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Approval Gates</p>
              <p className="text-sm text-slate-500">
                {steps.approvals?.approvalGates.filter(g => g.requireApproval).length ?? 0} channels
                require approval
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">KPIs Configured</p>
              <p className="text-sm text-slate-500">
                {steps.kpis?.kpiCounters.length ?? 0} metrics tracked{' '}
                {steps.kpis?.timeWindow ?? 'weekly'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* What's Next */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-left">
        <h3 className="font-semibold text-slate-900 mb-4">What's Next?</h3>
        <ul className="space-y-3">
          <li className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-apex-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
              1
            </span>
            <div>
              <p className="font-medium text-slate-900">Create your first workflow</p>
              <p className="text-sm text-slate-500">
                Set up automated content distribution between channels
              </p>
            </div>
          </li>
          <li className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-apex-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
              2
            </span>
            <div>
              <p className="font-medium text-slate-900">Invite your team</p>
              <p className="text-sm text-slate-500">
                Add approvers and publishers to collaborate on content
              </p>
            </div>
          </li>
          <li className="flex items-start space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-apex-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
              3
            </span>
            <div>
              <p className="font-medium text-slate-900">Review the dashboard</p>
              <p className="text-sm text-slate-500">
                Monitor your KPIs and track content performance
              </p>
            </div>
          </li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/studio"
          className="btn-primary text-lg px-8 py-3 flex items-center space-x-2"
        >
          <span>Go to Marketing Studio</span>
          <ArrowRight className="w-5 h-5" />
        </Link>
        <button
          onClick={resetOnboarding}
          className="text-slate-500 hover:text-slate-700 text-sm"
        >
          Reset onboarding
        </button>
      </div>
    </div>
  )
}
