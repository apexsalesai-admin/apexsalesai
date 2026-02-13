'use client'

/**
 * Mia Co-Pilot Panel
 *
 * Persistent conversational panel where Mia actively participates in the
 * video production workflow. Replaces the static recommendation badge.
 *
 * Features:
 * - Mode toggle: Guided / Autopilot
 * - Chat-style message list with Mia's messages
 * - Scene breakdown cards with per-scene provider/cost
 * - Action buttons (render, adjust, skip)
 * - Typing indicator
 * - Mobile responsive (collapses < 768px)
 * - localStorage mode persistence
 */

import { useState, useEffect, useRef } from 'react'
import {
  Sparkles,
  Zap,
  ChevronDown,
  ChevronUp,
  Loader2,
  Play,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  MiaMessage,
  MiaActionButton,
  MiaCopilotMode,
  MiaSceneAnalysis,
  MiaRenderPlan,
  MiaWorkflowStep,
} from '@/lib/studio/mia-types'

// ─── Props ──────────────────────────────────────────────────

interface MiaCopilotPanelProps {
  mode: MiaCopilotMode
  messages: MiaMessage[]
  isTyping: boolean
  currentStep: MiaWorkflowStep
  renderPlan: MiaRenderPlan | null
  activeRenders: number[]
  onModeChange: (mode: MiaCopilotMode) => void
  onAction: (action: string, data?: Record<string, unknown>) => void
  onAnalyzeScript: () => void
  onRenderAll: () => void
}

// ─── Component ──────────────────────────────────────────────

export function MiaCopilotPanel({
  mode,
  messages,
  isTyping,
  currentStep,
  renderPlan,
  activeRenders,
  onModeChange,
  onAction,
  onAnalyzeScript,
  onRenderAll,
}: MiaCopilotPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [clickedActions, setClickedActions] = useState<Set<string>>(new Set())

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Auto-collapse on mobile
  useEffect(() => {
    if (isMobile && messages.length > 0) {
      setCollapsed(false) // Expand when new messages arrive
    }
  }, [messages.length, isMobile])

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length, isTyping])

  const handleActionClick = (action: string, data?: Record<string, unknown>, msgId?: string) => {
    // Prevent double-submit
    const key = `${msgId}-${action}`
    if (clickedActions.has(key)) return
    setClickedActions(prev => new Set(prev).add(key))
    onAction(action, data)
  }

  // Collapsed mobile view
  if (isMobile && collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-full p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg flex items-center justify-between"
      >
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-900">Mia Co-Pilot</span>
          {messages.length > 0 && (
            <span className="text-xs text-purple-500">
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <ChevronDown className="w-4 h-4 text-purple-400" />
      </button>
    )
  }

  return (
    <div className="bg-gradient-to-b from-purple-50/80 to-white border border-purple-200/60 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-purple-100">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-semibold text-purple-900">Mia Co-Pilot</span>
          <StepBadge step={currentStep} />
        </div>
        <div className="flex items-center space-x-2">
          <ModeToggle mode={mode} onChange={onModeChange} />
          {isMobile && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1 hover:bg-purple-100 rounded"
            >
              <ChevronUp className="w-4 h-4 text-purple-400" />
            </button>
          )}
        </div>
      </div>

      {/* Message List */}
      <div
        ref={scrollRef}
        className="px-4 py-3 space-y-3 max-h-[400px] overflow-y-auto"
      >
        {messages.length === 0 ? (
          <EmptyState onAnalyze={onAnalyzeScript} />
        ) : (
          messages.map(msg => (
            <MiaMessageBubble
              key={msg.id}
              message={msg}
              onAction={(action, data) => handleActionClick(action, data, msg.id)}
              isActionDisabled={(action) => clickedActions.has(`${msg.id}-${action}`)}
            />
          ))
        )}
        {isTyping && <TypingIndicator />}
      </div>

      {/* Render Plan Summary */}
      {renderPlan && currentStep !== 'idle' && (
        <RenderPlanSummary
          plan={renderPlan}
          activeRenders={activeRenders}
          currentStep={currentStep}
        />
      )}

      {/* Quick Actions */}
      <QuickActions
        currentStep={currentStep}
        hasMessages={messages.length > 0}
        onAnalyze={onAnalyzeScript}
        onRenderAll={onRenderAll}
        renderPlan={renderPlan}
      />
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────

function ModeToggle({
  mode,
  onChange,
}: {
  mode: MiaCopilotMode
  onChange: (mode: MiaCopilotMode) => void
}) {
  return (
    <div className="flex items-center bg-purple-100/80 rounded-full p-0.5">
      <button
        onClick={() => onChange('guided')}
        className={cn(
          'flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
          mode === 'guided'
            ? 'bg-white text-purple-700 shadow-sm'
            : 'text-purple-500 hover:text-purple-700',
        )}
      >
        <Sparkles className="w-3 h-3" />
        <span>Guided</span>
      </button>
      <button
        onClick={() => onChange('autopilot')}
        className={cn(
          'flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
          mode === 'autopilot'
            ? 'bg-white text-purple-700 shadow-sm'
            : 'text-purple-500 hover:text-purple-700',
        )}
      >
        <Zap className="w-3 h-3" />
        <span>Autopilot</span>
      </button>
    </div>
  )
}

function StepBadge({ step }: { step: MiaWorkflowStep }) {
  if (step === 'idle') return null

  const labels: Record<MiaWorkflowStep, string> = {
    idle: '',
    'analyzing-script': 'Analyzing...',
    'awaiting-approval': 'Plan Ready',
    rendering: 'Rendering',
    reviewing: 'Review',
    complete: 'Done',
  }

  const colors: Record<MiaWorkflowStep, string> = {
    idle: '',
    'analyzing-script': 'bg-blue-100 text-blue-700',
    'awaiting-approval': 'bg-amber-100 text-amber-700',
    rendering: 'bg-purple-100 text-purple-700',
    reviewing: 'bg-emerald-100 text-emerald-700',
    complete: 'bg-emerald-100 text-emerald-700',
  }

  return (
    <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', colors[step])}>
      {step === 'analyzing-script' && <Loader2 className="w-2.5 h-2.5 inline animate-spin mr-1" />}
      {labels[step]}
    </span>
  )
}

function MiaMessageBubble({
  message,
  onAction,
  isActionDisabled,
}: {
  message: MiaMessage
  onAction: (action: string, data?: Record<string, unknown>) => void
  isActionDisabled: (action: string) => boolean
}) {
  const isWarning = message.type === 'warning'
  const isCelebration = message.type === 'celebration'

  return (
    <div
      className={cn(
        'rounded-lg p-3',
        isWarning
          ? 'bg-amber-50 border border-amber-200'
          : isCelebration
            ? 'bg-emerald-50 border border-emerald-200'
            : 'bg-white border border-purple-100',
      )}
    >
      {/* Message content */}
      <div className="flex items-start space-x-2">
        {isWarning ? (
          <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        ) : (
          <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <MessageContent text={message.content} />
        </div>
      </div>

      {/* Scene Breakdown (for script-analysis messages) */}
      {message.type === 'script-analysis' && message.metadata?.scenes && (
        <SceneBreakdown scenes={message.metadata.scenes} />
      )}

      {/* Cost Summary */}
      {message.metadata?.estimatedCost != null && message.metadata.estimatedCost > 0 && (
        <div className="mt-2 flex items-center space-x-3 text-xs text-purple-600">
          <span>~${message.metadata.estimatedCost.toFixed(2)} estimated</span>
          {message.metadata.estimatedDuration && (
            <span>~{message.metadata.estimatedDuration}s total</span>
          )}
          {message.metadata.sceneCount && (
            <span>{message.metadata.sceneCount} scene{message.metadata.sceneCount > 1 ? 's' : ''}</span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {message.actions && message.actions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {message.actions.map((action) => (
            <ActionButton
              key={action.action}
              button={action}
              onClick={() => onAction(action.action, action.data)}
              disabled={isActionDisabled(action.action)}
            />
          ))}
        </div>
      )}

      {/* Confidence badge */}
      {message.confidence && (
        <div className="mt-2">
          <span
            className={cn(
              'text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider',
              message.confidence === 'high'
                ? 'bg-emerald-100 text-emerald-700'
                : message.confidence === 'medium'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-600',
            )}
          >
            {message.confidence} confidence
          </span>
        </div>
      )}
    </div>
  )
}

function MessageContent({ text }: { text: string }) {
  // Simple markdown-light: **bold** and line breaks
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <p className="text-sm text-slate-700 leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>
        }
        // Handle line breaks
        const lines = part.split('\n')
        return lines.map((line, j) => (
          <span key={`${i}-${j}`}>
            {j > 0 && <br />}
            {line}
          </span>
        ))
      })}
    </p>
  )
}

function SceneBreakdown({ scenes }: { scenes: MiaSceneAnalysis[] }) {
  const PROVIDER_NAMES: Record<string, string> = {
    sora: 'Sora 2',
    'sora-2': 'Sora 2 Standard',
    'sora-2-pro': 'Sora 2 Pro',
    runway: 'Runway Gen-4.5',
    heygen: 'HeyGen Avatar',
    template: 'Template (Free)',
  }

  return (
    <div className="mt-3 space-y-2">
      {scenes.map(scene => (
        <div
          key={scene.sceneNumber}
          className="flex items-start space-x-3 p-2 bg-purple-50/50 rounded-lg"
        >
          <div className="w-6 h-6 rounded-full bg-purple-200 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-purple-700">{scene.sceneNumber}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-800">{scene.label} ({scene.estimatedDuration}s)</span>
              <span className="text-[10px] text-purple-600">
                {scene.estimatedCost > 0 ? `$${scene.estimatedCost.toFixed(2)}` : 'Free'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {PROVIDER_NAMES[scene.recommendedModel || scene.recommendedProvider] || scene.recommendedProvider}
              {' \u00B7 '}
              &ldquo;{scene.scriptExcerpt}&rdquo;
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function ActionButton({
  button,
  onClick,
  disabled,
}: {
  button: MiaActionButton
  onClick: () => void
  disabled: boolean
}) {
  const styles = {
    primary: 'bg-purple-600 text-white hover:bg-purple-700 disabled:bg-purple-400',
    secondary: 'border border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-50',
    ghost: 'text-purple-600 hover:bg-purple-50 disabled:opacity-50',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center space-x-1',
        styles[button.variant],
      )}
    >
      {button.variant === 'primary' && button.action.includes('render') && (
        <Play className="w-3 h-3" />
      )}
      <span>{button.label}</span>
    </button>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center space-x-2 p-3">
      <Sparkles className="w-4 h-4 text-purple-400" />
      <div className="flex space-x-1">
        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

function EmptyState({ onAnalyze }: { onAnalyze: () => void }) {
  return (
    <div className="text-center py-4">
      <Sparkles className="w-8 h-8 mx-auto mb-2 text-purple-300" />
      <p className="text-sm text-slate-500 mb-3">
        Mia is ready to help plan your video production.
      </p>
      <button
        onClick={onAnalyze}
        className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
      >
        Analyze Script
      </button>
    </div>
  )
}

function RenderPlanSummary({
  plan,
  activeRenders,
  currentStep,
}: {
  plan: MiaRenderPlan
  activeRenders: number[]
  currentStep: MiaWorkflowStep
}) {
  const totalScenes = plan.scenes.length
  const completedScenes = totalScenes - activeRenders.length
  const progress = totalScenes > 0 ? Math.round((completedScenes / totalScenes) * 100) : 0

  if (currentStep !== 'rendering' && currentStep !== 'reviewing') return null

  return (
    <div className="px-4 py-2 border-t border-purple-100 bg-purple-50/50">
      <div className="flex items-center justify-between text-xs text-purple-700 mb-1">
        <span>
          {currentStep === 'rendering'
            ? `Rendering ${activeRenders.length} of ${totalScenes} scenes...`
            : `${totalScenes} scenes complete`}
        </span>
        <span>{progress}%</span>
      </div>
      {currentStep === 'rendering' && (
        <div className="w-full h-1.5 bg-purple-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

function QuickActions({
  currentStep,
  hasMessages,
  onAnalyze,
  onRenderAll,
  renderPlan,
}: {
  currentStep: MiaWorkflowStep
  hasMessages: boolean
  onAnalyze: () => void
  onRenderAll: () => void
  renderPlan: MiaRenderPlan | null
}) {
  if (currentStep === 'rendering') return null

  return (
    <div className="px-4 py-2 border-t border-purple-100 flex items-center space-x-2">
      {currentStep === 'idle' && (
        <button
          onClick={onAnalyze}
          className="px-3 py-1.5 text-xs font-medium text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
        >
          Analyze Script
        </button>
      )}
      {currentStep === 'awaiting-approval' && renderPlan && (
        <button
          onClick={onRenderAll}
          className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-1"
        >
          <Play className="w-3 h-3" />
          <span>
            Render All
            {renderPlan.totalEstimatedCost > 0 && ` ($${renderPlan.totalEstimatedCost.toFixed(2)})`}
          </span>
        </button>
      )}
    </div>
  )
}
