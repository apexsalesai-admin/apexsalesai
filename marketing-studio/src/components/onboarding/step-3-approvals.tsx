'use client'

import { useState } from 'react'
import { useOnboarding } from '@/hooks/use-onboarding'
import { ArrowLeft, ArrowRight, Shield, Users, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OnboardingApprovalsData } from '@/types'
import { UserRole, IntegrationType } from '@/types'
import { getRoleDescription } from '@/lib/rbac'

const ROLES: { role: UserRole; icon: typeof Shield; color: string }[] = [
  { role: 'ADMIN', icon: Shield, color: 'text-purple-600' },
  { role: 'APPROVER', icon: Check, color: 'text-green-600' },
  { role: 'PUBLISHER', icon: Users, color: 'text-blue-600' },
  { role: 'VIEWER', icon: Users, color: 'text-slate-600' },
]

export function Step3Approvals() {
  const { steps, setApprovalsData, nextStep, prevStep } = useOnboarding()

  const connectedChannels = steps.channels?.connectedChannels ?? []

  const [data, setData] = useState<OnboardingApprovalsData>({
    roles: steps.approvals?.roles ?? {
      admins: [],
      approvers: [],
      publishers: [],
      viewers: [],
    },
    approvalGates: steps.approvals?.approvalGates ??
      connectedChannels.map(channel => ({
        channelType: channel,
        requireApproval: true,
        approverRole: 'APPROVER' as UserRole,
      })),
  })

  const toggleApprovalGate = (channelType: IntegrationType) => {
    setData(prev => ({
      ...prev,
      approvalGates: prev.approvalGates.map(gate =>
        gate.channelType === channelType
          ? { ...gate, requireApproval: !gate.requireApproval }
          : gate
      ),
    }))
  }

  const handleContinue = () => {
    setApprovalsData(data)
    nextStep()
  }

  const handleBack = () => {
    setApprovalsData(data)
    prevStep()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Approvals & Governance</h2>
        <p className="text-slate-600 mt-1">
          Configure role-based access control and approval gates for content publishing.
        </p>
      </div>

      {/* Roles Overview */}
      <div className="space-y-3">
        <h3 className="font-medium text-slate-900">Role Definitions</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {ROLES.map(({ role, icon: Icon, color }) => (
            <div
              key={role}
              className="border border-slate-200 rounded-lg p-4"
            >
              <div className="flex items-center space-x-3">
                <div className={cn('p-2 rounded-lg bg-slate-100', color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{role}</p>
                  <p className="text-sm text-slate-500">
                    {getRoleDescription(role)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Approval Gates */}
      <div className="space-y-3">
        <h3 className="font-medium text-slate-900">Approval Gates by Channel</h3>
        <p className="text-sm text-slate-500">
          Choose which channels require human approval before publishing.
        </p>

        {connectedChannels.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800">
            No channels connected. Go back to connect channels first.
          </div>
        ) : (
          <div className="space-y-3">
            {data.approvalGates.map((gate) => (
              <div
                key={gate.channelType}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                    {gate.channelType.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{gate.channelType}</p>
                    <p className="text-sm text-slate-500">
                      {gate.requireApproval
                        ? 'Requires approval before publishing'
                        : 'Auto-publish without approval'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleApprovalGate(gate.channelType)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    gate.requireApproval ? 'bg-apex-primary' : 'bg-slate-200'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      gate.requireApproval ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit Log Info */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h4 className="font-medium text-slate-900 flex items-center space-x-2">
          <Shield className="w-4 h-4 text-apex-primary" />
          <span>Immutable Audit Logging</span>
        </h4>
        <p className="text-sm text-slate-600 mt-2">
          All actions are recorded in an immutable audit log, including:
        </p>
        <ul className="text-sm text-slate-600 mt-2 space-y-1 list-disc list-inside">
          <li>Integration connections and disconnections</li>
          <li>Workflow creation, updates, and activation</li>
          <li>Approval requests, grants, and denials</li>
          <li>Publish attempts, successes, and failures</li>
          <li>Role changes and settings updates</li>
        </ul>
      </div>

      {/* Kill Switch Info */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h4 className="font-medium text-red-900 flex items-center space-x-2">
          <Shield className="w-4 h-4" />
          <span>Kill Switch Available</span>
        </h4>
        <p className="text-sm text-red-700 mt-2">
          Admins can instantly revoke any integration token from the Settings page.
          This immediately disconnects the channel and prevents further publishing.
        </p>
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
          onClick={handleContinue}
          className="btn-primary flex items-center space-x-2"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
