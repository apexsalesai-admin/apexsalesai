/**
 * useMiaCopilot Hook
 *
 * Encapsulates all Mia co-pilot state and actions, keeping page.tsx clean.
 * Manages: mode, messages, script analysis, render plan, action dispatch.
 * Persists last session per contentId+versionId in localStorage.
 * Includes concurrency guard (max 2 concurrent renders).
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  MiaMessage,
  MiaCopilotMode,
  MiaCopilotState,
  MiaWorkflowStep,
  MiaSceneAnalysis,
  MiaRenderPlan,
  MiaScenePlan,
} from '@/lib/studio/mia-types'

const MAX_CONCURRENT_RENDERS = 2
const STORAGE_KEY_MODE = 'mia-copilot-mode'

function getStorageKey(contentId: string, versionId?: string): string {
  return `mia-session-${contentId}${versionId ? `-${versionId}` : ''}`
}

interface ContentContext {
  id: string
  title: string
  contentType: string
  channels: string[]
  aiTone?: string | null
}

interface VersionContext {
  id: string
  script: string
  versionNumber: number
}

interface UseMiaCopilotOptions {
  content: ContentContext | null
  version: VersionContext | null
  connectedProviders: string[]
}

interface UseMiaCopilotReturn extends MiaCopilotState {
  /** Switch between guided and autopilot */
  setMode: (mode: MiaCopilotMode) => void
  /** Trigger script analysis */
  analyzeScript: () => Promise<void>
  /** Execute full render plan */
  renderAll: () => Promise<void>
  /** Execute a single scene render */
  renderScene: (sceneNumber: number) => Promise<void>
  /** Handle action button clicks from Mia messages */
  handleAction: (action: string, data?: Record<string, unknown>) => void
  /** Add a message to the conversation */
  addMessage: (message: MiaMessage) => void
  /** Clear messages */
  clearMessages: () => void
  /** Currently rendering scene numbers */
  activeRenders: number[]
  /** Scene render results (sceneNumber → jobId) */
  sceneJobIds: Record<number, string>
}

export function useMiaCopilot({
  content,
  version,
  connectedProviders,
}: UseMiaCopilotOptions): UseMiaCopilotReturn {
  // Mode — persisted in localStorage
  const [mode, setModeState] = useState<MiaCopilotMode>(() => {
    if (typeof window === 'undefined') return 'guided'
    return (localStorage.getItem(STORAGE_KEY_MODE) as MiaCopilotMode) || 'guided'
  })

  const [messages, setMessages] = useState<MiaMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [currentStep, setCurrentStep] = useState<MiaWorkflowStep>('idle')
  const [scriptAnalysis, setScriptAnalysis] = useState<MiaSceneAnalysis[] | null>(null)
  const [renderPlan, setRenderPlan] = useState<MiaRenderPlan | null>(null)
  const [activeRenders, setActiveRenders] = useState<number[]>([])
  const [sceneJobIds, setSceneJobIds] = useState<Record<number, string>>({})

  // Track if greeting has been shown for this content
  const greetedRef = useRef<string | null>(null)

  // ── Mode persistence ──────────────────────────────────────
  const setMode = useCallback((newMode: MiaCopilotMode) => {
    setModeState(newMode)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_MODE, newMode)
    }
  }, [])

  // ── Message management ────────────────────────────────────
  const addMessage = useCallback((msg: MiaMessage) => {
    setMessages(prev => [...prev, msg])
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setScriptAnalysis(null)
    setRenderPlan(null)
    setCurrentStep('idle')
    setActiveRenders([])
    setSceneJobIds({})
  }, [])

  // ── Session persistence ───────────────────────────────────
  // Save messages to localStorage on change
  useEffect(() => {
    if (!content?.id || messages.length === 0) return
    if (typeof window === 'undefined') return
    const key = getStorageKey(content.id, version?.id)
    try {
      const session = {
        messages: messages.slice(-20), // Keep last 20 messages
        scriptAnalysis,
        renderPlan,
        currentStep,
        timestamp: Date.now(),
      }
      localStorage.setItem(key, JSON.stringify(session))
    } catch {
      // localStorage full or unavailable — silently ignore
    }
  }, [messages, scriptAnalysis, renderPlan, currentStep, content?.id, version?.id])

  // Restore session on mount
  useEffect(() => {
    if (!content?.id) return
    if (typeof window === 'undefined') return
    const key = getStorageKey(content.id, version?.id)
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        const session = JSON.parse(saved)
        // Only restore if less than 1 hour old
        if (session.timestamp && Date.now() - session.timestamp < 3600000) {
          if (session.messages?.length) setMessages(session.messages)
          if (session.scriptAnalysis) setScriptAnalysis(session.scriptAnalysis)
          if (session.renderPlan) setRenderPlan(session.renderPlan)
          if (session.currentStep) setCurrentStep(session.currentStep)
          greetedRef.current = content.id // Don't re-greet
          return
        }
      }
    } catch {
      // Corrupt data — ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.id, version?.id])

  // ── Auto-greet on content load ────────────────────────────
  useEffect(() => {
    if (!content?.id) return
    if (greetedRef.current === content.id) return
    greetedRef.current = content.id

    // Import dynamically to avoid circular deps
    import('@/lib/studio/mia-messages').then(({ generateGreeting }) => {
      const greeting = generateGreeting(content, mode)
      setMessages(prev => {
        // Don't add if already have a greeting
        if (prev.some(m => m.type === 'greeting')) return prev
        return [greeting]
      })
    })
  }, [content, mode])

  // ── Script Analysis ───────────────────────────────────────
  const analyzeScript = useCallback(async () => {
    if (!content?.id || !version?.id) return
    if (!version.script?.trim()) {
      const { generateNoScript } = await import('@/lib/studio/mia-messages')
      addMessage(generateNoScript())
      return
    }

    setIsTyping(true)
    setCurrentStep('analyzing-script')

    try {
      const res = await fetch('/api/studio/mia/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: content.id,
          versionId: version.id,
          targetPlatform: content.channels?.[0]?.toLowerCase() || 'general',
          mode,
        }),
      })

      const data = await res.json()
      if (data.success && data.data) {
        setScriptAnalysis(data.data.scenes)

        // Build render plan from analysis
        const plan: MiaRenderPlan = {
          scenes: data.data.scenes.map((s: MiaSceneAnalysis) => ({
            sceneNumber: s.sceneNumber,
            provider: s.recommendedProvider,
            model: s.recommendedModel,
            duration: s.estimatedDuration,
            ratio: s.aspectRatio,
            prompt: s.scriptExcerpt, // Will be replaced with full text by API
            estimatedCost: s.estimatedCost,
          })),
          totalEstimatedCost: data.data.totalEstimatedCost,
          totalEstimatedDuration: data.data.totalEstimatedDuration,
          requiresStitching: data.data.scenes.length > 1,
        }
        setRenderPlan(plan)

        // Add Mia messages from API response
        if (data.miaMessages) {
          for (const msg of data.miaMessages) {
            addMessage(msg)
          }
        }

        setCurrentStep('awaiting-approval')
      }
    } catch (e) {
      console.error('[MIA:ANALYZE:ERROR]', e)
      addMessage({
        id: `mia-err-${Date.now()}`,
        type: 'warning',
        content: 'I had trouble analyzing the script. Please try again.',
        timestamp: new Date().toISOString(),
      })
      setCurrentStep('idle')
    } finally {
      setIsTyping(false)
    }
  }, [content, version, mode, addMessage])

  // ── Render All Scenes ─────────────────────────────────────
  const renderAll = useCallback(async () => {
    if (!renderPlan || !content?.id || !version?.id) return

    setCurrentStep('rendering')

    const { generateRenderStart } = await import('@/lib/studio/mia-messages')
    addMessage(generateRenderStart(renderPlan, mode))

    try {
      const res = await fetch('/api/studio/mia/render-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: content.id,
          versionId: version.id,
          renderPlan,
        }),
      })

      const data = await res.json()
      if (data.success) {
        const jobMap: Record<number, string> = {}
        if (data.sceneJobIds) {
          for (const [sceneNum, jobId] of Object.entries(data.sceneJobIds)) {
            jobMap[Number(sceneNum)] = jobId as string
          }
        }
        setSceneJobIds(jobMap)
        setActiveRenders(renderPlan.scenes.map(s => s.sceneNumber))
      } else {
        addMessage({
          id: `mia-err-${Date.now()}`,
          type: 'warning',
          content: data.error || 'Failed to start renders. Please try again.',
          timestamp: new Date().toISOString(),
        })
        setCurrentStep('awaiting-approval')
      }
    } catch (e) {
      console.error('[MIA:RENDER:ERROR]', e)
      setCurrentStep('awaiting-approval')
    }
  }, [renderPlan, content, version, mode, addMessage])

  // ── Render Single Scene ───────────────────────────────────
  const renderScene = useCallback(async (sceneNumber: number) => {
    if (!renderPlan || !content?.id || !version?.id) return
    if (activeRenders.length >= MAX_CONCURRENT_RENDERS) {
      addMessage({
        id: `mia-wait-${Date.now()}`,
        type: 'status',
        content: `Waiting for a render slot (max ${MAX_CONCURRENT_RENDERS} concurrent). I'll start Scene ${sceneNumber} shortly.`,
        timestamp: new Date().toISOString(),
      })
      return
    }

    const scenePlan = renderPlan.scenes.find(s => s.sceneNumber === sceneNumber)
    if (!scenePlan) return

    setActiveRenders(prev => [...prev, sceneNumber])
    setCurrentStep('rendering')

    try {
      const res = await fetch('/api/studio/mia/render-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: content.id,
          versionId: version.id,
          renderPlan: {
            scenes: [scenePlan],
            totalEstimatedCost: scenePlan.estimatedCost,
            totalEstimatedDuration: scenePlan.duration,
            requiresStitching: false,
          },
        }),
      })

      const data = await res.json()
      if (data.success && data.sceneJobIds) {
        setSceneJobIds(prev => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(data.sceneJobIds).map(([k, v]) => [Number(k), v])
          ),
        }))
      }
    } catch (e) {
      console.error('[MIA:RENDER_SCENE:ERROR]', e)
      setActiveRenders(prev => prev.filter(n => n !== sceneNumber))
    }
  }, [renderPlan, content, version, activeRenders, addMessage])

  // ── Action Handler ────────────────────────────────────────
  const handleAction = useCallback((action: string, data?: Record<string, unknown>) => {
    switch (action) {
      case 'analyze-script':
        analyzeScript()
        break
      case 'render-all':
        renderAll()
        break
      case 'render-scene':
        if (data?.sceneNumber) renderScene(data.sceneNumber as number)
        break
      case 'render-sequential':
        // Start with scene 1
        renderScene(1)
        break
      case 'dismiss':
      case 'dismiss-review':
        // No-op, just closes the action
        break
      case 'select-template':
        // Update render plan to use template for all scenes
        if (renderPlan) {
          const templatePlan: MiaRenderPlan = {
            ...renderPlan,
            scenes: renderPlan.scenes.map(s => ({ ...s, provider: 'template', model: undefined, estimatedCost: 0 })),
            totalEstimatedCost: 0,
          }
          setRenderPlan(templatePlan)
        }
        break
      case 'set-duration':
        // Handled by parent component via callback
        break
      case 'open-settings':
        if (typeof window !== 'undefined' && data?.href) {
          window.location.href = data.href as string
        }
        break
      case 'set-final':
      case 'rerender':
      case 'rerender-scene':
      case 'reformat-vertical':
      case 'reformat-landscape':
      case 'change-provider':
      case 'skip-scene':
      case 'review-plan':
      case 'adjust':
        // These are handled by the parent via onAction callback
        break
    }
  }, [analyzeScript, renderAll, renderScene, renderPlan])

  return {
    mode,
    messages,
    isTyping,
    currentStep,
    scriptAnalysis,
    renderPlan,
    setMode,
    analyzeScript,
    renderAll,
    renderScene,
    handleAction,
    addMessage,
    clearMessages,
    activeRenders,
    sceneJobIds,
  }
}
