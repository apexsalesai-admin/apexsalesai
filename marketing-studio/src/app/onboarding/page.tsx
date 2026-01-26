'use client'

import { useOnboarding } from '@/hooks/use-onboarding'
import { StepIndicator } from '@/components/onboarding/step-indicator'
import { Step1Channels } from '@/components/onboarding/step-1-channels'
import { Step2Guardrails } from '@/components/onboarding/step-2-guardrails'
import { Step3Approvals } from '@/components/onboarding/step-3-approvals'
import { Step4KPIs } from '@/components/onboarding/step-4-kpis'
import { OnboardingComplete } from '@/components/onboarding/complete'

const STEPS = [
  { id: 0, title: 'Connect Channels', description: 'Link your social accounts' },
  { id: 1, title: 'Brand Guardrails', description: 'Define voice and compliance rules' },
  { id: 2, title: 'Approvals & Governance', description: 'Set up roles and approval gates' },
  { id: 3, title: 'Outcomes & KPIs', description: 'Define goals and metrics' },
]

export default function OnboardingPage() {
  const { currentStep, completed } = useOnboarding()

  if (completed) {
    return <OnboardingComplete />
  }

  return (
    <div className="space-y-8">
      {/* Progress */}
      <StepIndicator steps={STEPS} currentStep={currentStep} />

      {/* Step Content */}
      <div className="card">
        {currentStep === 0 && <Step1Channels />}
        {currentStep === 1 && <Step2Guardrails />}
        {currentStep === 2 && <Step3Approvals />}
        {currentStep === 3 && <Step4KPIs />}
      </div>
    </div>
  )
}
