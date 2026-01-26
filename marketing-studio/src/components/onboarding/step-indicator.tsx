'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOnboarding } from '@/hooks/use-onboarding'

interface Step {
  id: number
  title: string
  description: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  const { isStepComplete, progress } = useOnboarding()

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-apex-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="flex justify-between">
        {steps.map((step, index) => {
          const isComplete = isStepComplete(step.id)
          const isCurrent = currentStep === step.id
          const isPast = currentStep > step.id

          return (
            <div
              key={step.id}
              className={cn(
                'flex items-start space-x-3 flex-1',
                index < steps.length - 1 && 'pr-4'
              )}
            >
              {/* Step circle */}
              <div
                className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  isComplete || isPast
                    ? 'bg-apex-primary text-white'
                    : isCurrent
                    ? 'bg-apex-accent text-white'
                    : 'bg-slate-200 text-slate-500'
                )}
              >
                {isComplete || isPast ? (
                  <Check className="w-4 h-4" />
                ) : (
                  step.id + 1
                )}
              </div>

              {/* Step text */}
              <div className="hidden sm:block">
                <p
                  className={cn(
                    'text-sm font-medium',
                    isCurrent ? 'text-apex-primary' : 'text-slate-700'
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-slate-500">{step.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
