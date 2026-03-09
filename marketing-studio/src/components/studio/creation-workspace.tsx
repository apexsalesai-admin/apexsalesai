'use client'

import { type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Loader2, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface WorkspaceStep {
  label: string
  description?: string
}

interface CreationWorkspaceProps {
  title: string
  subtitle: string
  icon: LucideIcon
  iconColor: string
  steps: WorkspaceStep[]
  currentStep: number
  onBack: () => void
  onNext: () => void
  canGoNext: boolean
  isProcessing: boolean
  processingLabel?: string
  children: ReactNode
  actions?: ReactNode
  nextLabel?: string
}

export function CreationWorkspace({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  steps,
  currentStep,
  onBack,
  onNext,
  canGoNext,
  isProcessing,
  processingLabel,
  children,
  actions,
  nextLabel,
}: CreationWorkspaceProps) {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/studio/create"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Create
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconColor)}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
              <p className="text-sm text-slate-500">{subtitle}</p>
            </div>
          </div>
          {actions}
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0',
                i < currentStep
                  ? 'bg-emerald-500 text-white'
                  : i === currentStep
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-200 text-slate-500'
              )}
            >
              {i < currentStep ? '\u2713' : i + 1}
            </div>
            <span
              className={cn(
                'text-sm font-medium hidden sm:block',
                i === currentStep ? 'text-purple-700' : 'text-slate-500'
              )}
            >
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5',
                  i < currentStep ? 'bg-emerald-500' : 'bg-slate-200'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {children}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
        <button
          onClick={onBack}
          className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
        >
          {currentStep === 0 ? 'Cancel' : 'Back'}
        </button>

        <button
          onClick={onNext}
          disabled={!canGoNext || isProcessing}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {processingLabel || 'Processing...'}
            </>
          ) : currentStep === steps.length - 1 ? (
            nextLabel || 'Save to Library'
          ) : (
            <>
              {nextLabel || 'Next'} <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
