'use client'

import { useReducer, useCallback, useRef } from 'react'
import type {
  MiaSessionState,
  MiaSessionAction,
  MiaCreativePhase,
  SectionDraft,
  AngleCard,
  ThinkingEntry,
  FixSuggestion,
  MomentumScore,
  VideoRecommendationState,
  MiaContextResponse,
  MiaResearchRequest,
  MiaResearchResponse,
  MiaGenerateSectionRequest,
  MiaGenerateSectionResponse,
  MiaPolishRequest,
  MiaPolishResponse,
  MiaCreativeResult,
  SectionType,
} from '@/lib/studio/mia-creative-types'
import type { BudgetBand, QualityTier } from '@/lib/studio/video-scoring'
import type { CreatorProfile } from '@/lib/studio/creator-profile'

// ─── Initial State ─────────────────────────────────────────────────────────────

const SECTION_ORDER: SectionType[] = ['hook', 'body', 'cta']

function createInitialSections(): SectionDraft[] {
  return SECTION_ORDER.map((type) => ({
    type,
    content: '',
    version: 0,
    accepted: false,
    rejectedVersions: [],
  }))
}

const initialVideoState: VideoRecommendationState = {
  mode: 'auto',
  budgetBand: '$5-$25',
  qualityTier: 'balanced',
  durationSeconds: 10,
  recommendation: null,
  selectedProviderId: null,
  isLoadingRecommendation: false,
  testRenderStatus: 'idle',
  testRenderVideoUrl: null,
  testRenderProgress: 0,
  testRenderError: null,
  testRenderCostConfirmed: false,
  fullRenderCostConfirmed: false,
  testRenderCostPaid: 0,
}

const initialState: MiaSessionState = {
  phase: 'greeting',
  greeting: null,
  topic: '',
  brandName: '',
  selectedAngle: null,
  angles: [],
  sections: createInitialSections(),
  currentSectionIndex: 0,
  fixes: [],
  thinking: [],
  momentum: null,
  videoState: null,
  isLoading: false,
  error: null,
}

// ─── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state: MiaSessionState, action: MiaSessionAction): MiaSessionState {
  switch (action.type) {
    case 'SET_GREETING':
      return { ...state, greeting: action.greeting }

    case 'SET_TOPIC':
      return { ...state, topic: action.topic }

    case 'SET_ANGLES':
      return { ...state, angles: action.angles }

    case 'SELECT_ANGLE':
      return { ...state, selectedAngle: action.angle }

    case 'SET_SECTION_CONTENT': {
      const sections = [...state.sections]
      sections[action.index] = {
        ...sections[action.index],
        content: action.content,
        version: sections[action.index].version + 1,
      }
      return { ...state, sections }
    }

    case 'ACCEPT_SECTION': {
      const sections = [...state.sections]
      sections[action.index] = { ...sections[action.index], accepted: true }
      return { ...state, sections }
    }

    case 'RETRY_SECTION': {
      const sections = [...state.sections]
      const current = sections[action.index]
      sections[action.index] = {
        ...current,
        rejectedVersions: [...current.rejectedVersions, current.content],
        content: '',
        accepted: false,
      }
      return { ...state, sections }
    }

    case 'EDIT_SECTION': {
      const sections = [...state.sections]
      sections[action.index] = { ...sections[action.index], content: action.content }
      return { ...state, sections }
    }

    case 'ADVANCE_SECTION':
      return { ...state, currentSectionIndex: state.currentSectionIndex + 1 }

    case 'SET_FIXES':
      return { ...state, fixes: action.fixes }

    case 'APPLY_FIX': {
      const fixes = state.fixes.map((f) =>
        f.id === action.fixId ? { ...f, applied: true } : f
      )
      // Also update the section content with the fix
      const fix = state.fixes.find((f) => f.id === action.fixId)
      if (fix) {
        const sections = state.sections.map((s) => {
          if (s.content.includes(fix.currentText)) {
            return { ...s, content: s.content.replace(fix.currentText, fix.suggestedText) }
          }
          return s
        })
        return { ...state, fixes, sections }
      }
      return { ...state, fixes }
    }

    case 'SET_PHASE':
      return { ...state, phase: action.phase }

    case 'ADD_THINKING':
      return { ...state, thinking: [...state.thinking, action.entry] }

    case 'SET_LOADING':
      return { ...state, isLoading: action.loading }

    case 'SET_ERROR':
      return { ...state, error: action.error }

    case 'SET_MOMENTUM':
      return { ...state, momentum: action.momentum }

    case 'SET_VIDEO_STATE':
      return {
        ...state,
        videoState: state.videoState
          ? { ...state.videoState, ...action.videoState }
          : { ...initialVideoState, ...action.videoState },
      }

    case 'SET_BRAND_NAME':
      return { ...state, brandName: action.brandName }

    case 'REFINE_ANGLES':
      return { ...state, angles: action.angles, isLoading: false }

    case 'REVISE_SECTION_START': {
      const sections = [...state.sections]
      sections[action.sectionIndex] = { ...sections[action.sectionIndex], isRevising: true }
      return { ...state, sections }
    }

    case 'REVISE_SECTION_SUCCESS': {
      const sections = [...state.sections]
      sections[action.sectionIndex] = {
        ...sections[action.sectionIndex],
        content: action.content,
        version: sections[action.sectionIndex].version + 1,
        accepted: false,
        isRevising: false,
      }
      return { ...state, sections }
    }

    case 'REVISE_SECTION_ERROR': {
      const sections = [...state.sections]
      sections[action.sectionIndex] = { ...sections[action.sectionIndex], isRevising: false }
      return { ...state, sections, error: action.error }
    }

    case 'ASSIST_SECTION_START': {
      const sections = [...state.sections]
      sections[action.sectionIndex] = { ...sections[action.sectionIndex], isAssisting: true }
      return { ...state, sections }
    }

    case 'ASSIST_SECTION_SUCCESS': {
      const sections = [...state.sections]
      sections[action.sectionIndex] = {
        ...sections[action.sectionIndex],
        content: action.content,
        isAssisting: false,
      }
      return { ...state, sections }
    }

    case 'ASSIST_SECTION_ERROR': {
      const sections = [...state.sections]
      sections[action.sectionIndex] = { ...sections[action.sectionIndex], isAssisting: false }
      return { ...state, sections, error: action.error }
    }

    case 'RESET':
      return { ...initialState, sections: createInitialSections() }

    default:
      return state
  }
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

interface UseMiaCreativeSessionProps {
  channels: string[]
  contentType: string
  goal?: string
  profile?: CreatorProfile | null
  onComplete: (result: MiaCreativeResult) => void
}

export function useMiaCreativeSession({
  channels,
  contentType,
  goal,
  profile,
  onComplete,
}: UseMiaCreativeSessionProps) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const thinkingIdRef = useRef(0)
  const seedRef = useRef(0)
  const videoProviderRef = useRef<string | undefined>(undefined)
  const recommendDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const addThinking = useCallback(
    (phase: MiaCreativePhase, label: string, detail: string) => {
      thinkingIdRef.current += 1
      const entry: ThinkingEntry = {
        id: `t-${thinkingIdRef.current}`,
        timestamp: Date.now(),
        phase,
        label,
        detail,
      }
      dispatch({ type: 'ADD_THINKING', entry })
    },
    []
  )

  // ── Phase 0: Fetch context & greeting ──────────────────────────────────────

  const fetchGreeting = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', loading: true })
    dispatch({ type: 'SET_ERROR', error: null })
    addThinking('greeting', 'Loading your profile', 'Fetching brand voice and recent activity...')
    try {
      const res = await fetch('/api/studio/mia/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channels, contentType }),
      })
      const data: MiaContextResponse = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to load context')
      dispatch({ type: 'SET_GREETING', greeting: data.greeting })
      if (data.brandName) {
        dispatch({ type: 'SET_BRAND_NAME', brandName: data.brandName })
      }
      addThinking('greeting', 'Context loaded', `Brand: ${data.brandName || 'default'}. Ready to create!`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load greeting'
      dispatch({ type: 'SET_ERROR', error: msg })
      // Provide a fallback greeting so users can still proceed
      dispatch({
        type: 'SET_GREETING',
        greeting: "Hey! I'm Mia, your creative partner. Let's make something great together.",
      })
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }, [channels, contentType, addThinking])

  // ── Phase 1: Research angles ───────────────────────────────────────────────

  const fetchAngles = useCallback(
    async (topic: string) => {
      dispatch({ type: 'SET_TOPIC', topic })
      dispatch({ type: 'SET_PHASE', phase: 'angles' })
      dispatch({ type: 'SET_LOADING', loading: true })
      dispatch({ type: 'SET_ERROR', error: null })
      addThinking('angles', 'Researching your topic', `Searching for insights on "${topic}"...`)
      try {
        const body: MiaResearchRequest & { brandName?: string; profile?: CreatorProfile | null } = { topic, channels, contentType, goal, brandName: state.brandName || undefined, profile: profile || undefined }
        const res = await fetch('/api/studio/mia/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data: MiaResearchResponse = await res.json()
        if (!data.success) throw new Error(data.error || 'Research failed')
        dispatch({ type: 'SET_ANGLES', angles: data.angles })
        addThinking(
          'angles',
          'Found 3 angles',
          data.angles.map((a) => `- ${a.title}`).join('\n')
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Research failed'
        dispatch({ type: 'SET_ERROR', error: msg })
      } finally {
        dispatch({ type: 'SET_LOADING', loading: false })
      }
    },
    [channels, contentType, goal, state.brandName, profile, addThinking]
  )

  // ── Phase 1b: Refresh angles with a new seed ─────────────────────────────

  const refreshAngles = useCallback(async () => {
    seedRef.current += 1
    dispatch({ type: 'SET_LOADING', loading: true })
    dispatch({ type: 'SET_ERROR', error: null })
    addThinking('angles', 'Generating new angles', `Trying seed variation ${seedRef.current}...`)
    try {
      const body: MiaResearchRequest & { brandName?: string; profile?: CreatorProfile | null } = {
        topic: state.topic,
        channels,
        contentType,
        goal,
        seed: seedRef.current,
        brandName: state.brandName || undefined,
        profile: profile || undefined,
      }
      const res = await fetch('/api/studio/mia/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data: MiaResearchResponse = await res.json()
      if (!data.success) throw new Error(data.error || 'Research failed')
      dispatch({ type: 'SET_ANGLES', angles: data.angles })
      addThinking('angles', 'Fresh angles ready', data.angles.map((a) => `- ${a.title}`).join('\n'))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to refresh angles'
      dispatch({ type: 'SET_ERROR', error: msg })
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }, [state.topic, state.brandName, channels, contentType, goal, profile, addThinking])

  // ── Phase 2: Select angle & start building ────────────────────────────────

  const selectAngle = useCallback(
    (angle: AngleCard) => {
      dispatch({ type: 'SELECT_ANGLE', angle })
      dispatch({ type: 'SET_PHASE', phase: 'building' })
      addThinking('building', 'Angle selected', `Going with: "${angle.title}"`)
    },
    [addThinking]
  )

  // ── Phase 1c: Refine angles based on user feedback ─────────────────────────

  const refineAngles = useCallback(
    async (feedback: string) => {
      dispatch({ type: 'SET_LOADING', loading: true })
      dispatch({ type: 'SET_ERROR', error: null })
      addThinking('angles', 'Listening to your feedback', `Adjusting angles based on: "${feedback.slice(0, 80)}${feedback.length > 80 ? '...' : ''}"`)

      try {
        const res = await fetch('/api/studio/mia/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: state.topic,
            channels,
            contentType,
            goal,
            brandName: state.brandName || undefined,
            action: 'refine',
            currentAngles: state.angles,
            userFeedback: feedback,
            profile: profile || undefined,
          }),
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Refinement failed')

        dispatch({ type: 'REFINE_ANGLES', angles: data.angles })
        addThinking('angles', 'Refined angles ready', data.angles.map((a: AngleCard) => `- ${a.title}`).join('\n'))
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to refine angles'
        dispatch({ type: 'SET_ERROR', error: msg })
        dispatch({ type: 'SET_LOADING', loading: false })
      }
    },
    [state.topic, state.angles, state.brandName, channels, contentType, goal, profile, addThinking]
  )

  // ── Revise a section based on user direction ─────────────────────────────

  const reviseSection = useCallback(
    async (sectionIndex: number, direction: string) => {
      const section = state.sections[sectionIndex]
      if (!section || !state.selectedAngle) return

      dispatch({ type: 'REVISE_SECTION_START', sectionIndex })

      const sectionLabel = section.type === 'hook' ? 'opening hook' : section.type === 'body' ? 'main body' : 'call to action'
      addThinking('building', `Revising ${sectionLabel}`, `Based on your direction: "${direction.slice(0, 80)}${direction.length > 80 ? '...' : ''}"`)

      try {
        const res = await fetch('/api/studio/mia/generate-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'revise',
            sectionType: section.type,
            existingContent: section.content,
            userDirection: direction,
            topic: state.topic,
            angle: state.selectedAngle,
            channels,
            goal,
            brandName: state.brandName || undefined,
            profile: profile || undefined,
          }),
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Revision failed')

        dispatch({ type: 'REVISE_SECTION_SUCCESS', sectionIndex, content: data.content })
        addThinking('building', `${sectionLabel} revised`, data.thinking || 'Updated based on your feedback')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Revision failed'
        dispatch({ type: 'REVISE_SECTION_ERROR', sectionIndex, error: msg })
      }
    },
    [state.sections, state.selectedAngle, state.topic, state.brandName, channels, goal, profile, addThinking]
  )

  // ── Inline Mia Assist — help user during editing ─────────────────────────

  const assistSection = useCallback(
    async (sectionIndex: number, currentContent: string, assistRequest: string) => {
      const section = state.sections[sectionIndex]
      if (!section || !state.selectedAngle) return

      dispatch({ type: 'ASSIST_SECTION_START', sectionIndex })

      const sectionLabel = section.type === 'hook' ? 'opening hook' : section.type === 'body' ? 'main body' : 'call to action'
      addThinking('building', `Assisting with ${sectionLabel}`, `"${assistRequest.slice(0, 80)}${assistRequest.length > 80 ? '...' : ''}"`)

      try {
        const res = await fetch('/api/studio/mia/generate-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'assist',
            sectionType: section.type,
            existingContent: currentContent,
            assistRequest,
            topic: state.topic,
            angle: state.selectedAngle,
            channels,
            goal,
            brandName: state.brandName || undefined,
            profile: profile || undefined,
          }),
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error || 'Assist failed')

        dispatch({ type: 'ASSIST_SECTION_SUCCESS', sectionIndex, content: data.content })
        addThinking('building', `${sectionLabel} updated`, data.changeDescription || data.thinking || 'Applied your request')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Assist failed'
        dispatch({ type: 'ASSIST_SECTION_ERROR', sectionIndex, error: msg })
      }
    },
    [state.sections, state.selectedAngle, state.topic, state.brandName, channels, goal, profile, addThinking]
  )

  // ── Generate a single section ──────────────────────────────────────────────

  const generateSection = useCallback(
    async (sectionIndex: number) => {
      const section = state.sections[sectionIndex]
      if (!state.selectedAngle) return

      dispatch({ type: 'SET_LOADING', loading: true })
      dispatch({ type: 'SET_ERROR', error: null })

      const sectionLabel =
        section.type === 'hook' ? 'opening hook' : section.type === 'body' ? 'main body' : 'call to action'
      addThinking('building', `Writing ${sectionLabel}`, `Crafting section ${sectionIndex + 1} of 3...`)

      try {
        const previousSections = state.sections
          .slice(0, sectionIndex)
          .filter((s) => s.accepted)
          .map((s) => ({ type: s.type, content: s.content }))

        const body: MiaGenerateSectionRequest & { profile?: CreatorProfile | null } = {
          topic: state.topic,
          angle: state.selectedAngle,
          sectionType: section.type,
          channels,
          contentType,
          previousSections,
          rejectedVersions: section.rejectedVersions,
          goal,
          profile: profile || undefined,
        }

        const res = await fetch('/api/studio/mia/generate-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data: MiaGenerateSectionResponse = await res.json()
        if (!data.success) throw new Error(data.error || 'Generation failed')

        dispatch({ type: 'SET_SECTION_CONTENT', index: sectionIndex, content: data.content })
        addThinking('building', `${sectionLabel} ready`, data.thinking || 'Section generated successfully.')
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Generation failed'
        dispatch({ type: 'SET_ERROR', error: msg })
      } finally {
        dispatch({ type: 'SET_LOADING', loading: false })
      }
    },
    [state.sections, state.selectedAngle, state.topic, channels, contentType, goal, profile, addThinking]
  )

  // ── Score content (momentum meter) ──────────────────────────────────────────

  const scoreContent = useCallback(async () => {
    if (!state.selectedAngle) return
    const scoreSections = state.sections.filter((s) => s.content)
    if (scoreSections.length === 0) return

    try {
      const res = await fetch('/api/studio/mia/generate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'score',
          topic: state.topic,
          angle: state.selectedAngle,
          sections: scoreSections.map((s) => ({ type: s.type, content: s.content })),
          channels,
          contentType,
          profile: profile || undefined,
        }),
      })
      const data = await res.json()
      if (data.success && data.scores) {
        dispatch({ type: 'SET_MOMENTUM', momentum: data.scores })
      }
    } catch {
      // Fallback: client-side heuristic scoring
      const allText = state.sections.map((s) => s.content).join(' ')
      const wordCount = allText.split(/\s+/).filter(Boolean).length
      const hasQuestion = allText.includes('?')
      const hasCTA = /click|learn|discover|try|get|start|sign up|subscribe|join/i.test(allText)
      const hasHashtags = /#\w+/.test(allText)

      const hookScore = Math.min(100, 40 + (state.sections[0]?.content ? 30 : 0) + (hasQuestion ? 15 : 0) + (wordCount > 10 ? 15 : 0))
      const clarityScore = Math.min(100, 50 + (wordCount < 500 ? 25 : 0) + (wordCount > 20 ? 25 : 0))
      const ctaScore = hasCTA ? 80 : 35
      const seoScore = Math.min(100, 30 + (hasHashtags ? 30 : 0) + (wordCount > 50 ? 20 : 0) + (state.topic ? 20 : 0))
      const platformFitScore = Math.min(100, 50 + (channels.length > 0 ? 25 : 0) + (wordCount > 30 && wordCount < 400 ? 25 : 0))
      const overallScore = Math.round((hookScore + clarityScore + ctaScore + seoScore + platformFitScore) / 5)

      dispatch({ type: 'SET_MOMENTUM', momentum: { hook: hookScore, clarity: clarityScore, cta: ctaScore, seo: seoScore, platformFit: platformFitScore, overall: overallScore } })
    }
  }, [state.selectedAngle, state.sections, state.topic, channels, contentType])

  // ── Section actions ────────────────────────────────────────────────────────

  const acceptSection = useCallback(
    (index: number) => {
      dispatch({ type: 'ACCEPT_SECTION', index })
      const label = SECTION_ORDER[index]
      addThinking('building', `${label} accepted`, 'Moving to next section...')

      // If all sections accepted, move to polishing
      const updatedSections = [...state.sections]
      updatedSections[index] = { ...updatedSections[index], accepted: true }
      const allAccepted = updatedSections.every((s) => s.accepted)

      if (allAccepted) {
        dispatch({ type: 'SET_PHASE', phase: 'polishing' })
      } else if (index < SECTION_ORDER.length - 1) {
        dispatch({ type: 'ADVANCE_SECTION' })
      }

      // Score content after each acceptance
      setTimeout(() => scoreContent(), 200)
    },
    [state.sections, addThinking, scoreContent]
  )

  const retrySection = useCallback(
    (index: number) => {
      dispatch({ type: 'RETRY_SECTION', index })
      addThinking('building', 'Trying another version', 'Taking a different approach...')
    },
    [addThinking]
  )

  const editSection = useCallback((index: number, content: string) => {
    dispatch({ type: 'EDIT_SECTION', index, content })
  }, [])

  // ── Review edited section (Mia re-analysis) ────────────────────────────────

  const reviewEditedSection = useCallback(
    async (index: number, editedContent: string) => {
      const section = state.sections[index]
      if (!state.selectedAngle) return null
      addThinking('building', 'Reviewing your edit', `Analyzing changes to ${section.type}...`)
      try {
        const res = await fetch('/api/studio/mia/generate-section', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'review-edit',
            sectionType: section.type,
            originalContent: section.content,
            editedContent,
            topic: state.topic,
            angle: state.selectedAngle,
          }),
        })
        const data = await res.json()
        if (!data.success) return null
        if (data.thinking) {
          addThinking('building', 'Edit review', data.thinking)
        }
        return data.feedback as string
      } catch {
        return null
      }
    },
    [state.sections, state.selectedAngle, state.topic, addThinking]
  )

  // ── Phase 3: Polish ────────────────────────────────────────────────────────

  const fetchPolishSuggestions = useCallback(async () => {
    if (!state.selectedAngle) return
    dispatch({ type: 'SET_LOADING', loading: true })
    dispatch({ type: 'SET_ERROR', error: null })
    addThinking('polishing', 'Reviewing your draft', 'Analyzing for improvements...')
    try {
      const body: MiaPolishRequest = {
        topic: state.topic,
        angle: state.selectedAngle,
        sections: state.sections.map((s) => ({ type: s.type, content: s.content })),
        channels,
        contentType,
      }
      const res = await fetch('/api/studio/mia/generate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, action: 'polish', profile: profile || undefined }),
      })
      const data: MiaPolishResponse = await res.json()
      if (!data.success) throw new Error(data.error || 'Polish analysis failed')
      dispatch({ type: 'SET_FIXES', fixes: data.fixes })
      addThinking(
        'polishing',
        `${data.fixes.length} suggestions`,
        data.fixes.map((f) => `- ${f.description}`).join('\n')
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Polish failed'
      dispatch({ type: 'SET_ERROR', error: msg })
      // Still allow completion even if polish fails
      dispatch({ type: 'SET_FIXES', fixes: [] })
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }, [state.selectedAngle, state.topic, state.sections, channels, contentType, addThinking])

  const applyFix = useCallback(
    (fixId: string) => {
      dispatch({ type: 'APPLY_FIX', fixId })
      const fix = state.fixes.find((f) => f.id === fixId)
      if (fix) {
        addThinking('polishing', 'Fix applied', fix.description)
      }
      // Re-score after fix
      setTimeout(() => scoreContent(), 200)
    },
    [state.fixes, addThinking, scoreContent]
  )

  // ── Phase 3.5: Video Intelligence ──────────────────────────────────────────

  const fetchRecommendation = useCallback(
    (budgetBand: BudgetBand, qualityTier: QualityTier, durationSeconds: number) => {
      // Debounce 400ms — prevents thinking-panel spam when slider is dragged
      if (recommendDebounceRef.current) clearTimeout(recommendDebounceRef.current)
      dispatch({ type: 'SET_VIDEO_STATE', videoState: { isLoadingRecommendation: true, budgetBand, qualityTier, durationSeconds } })

      recommendDebounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch('/api/studio/video/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              goal: goal || 'awareness',
              channels,
              budgetBand,
              qualityTier,
              durationSeconds,
            }),
          })
          const data = await res.json()
          if (data.success) {
            dispatch({
              type: 'SET_VIDEO_STATE',
              videoState: {
                recommendation: { recommended: data.recommended, ranking: data.ranking, fallbackUsed: data.fallbackUsed },
                selectedProviderId: data.recommended?.provider.id || null,
                isLoadingRecommendation: false,
              },
            })
            addThinking('video-offer', 'Provider recommended', data.recommended?.reason || 'No providers available')
          } else {
            dispatch({ type: 'SET_VIDEO_STATE', videoState: { isLoadingRecommendation: false } })
          }
        } catch {
          dispatch({ type: 'SET_VIDEO_STATE', videoState: { isLoadingRecommendation: false } })
        }
      }, 400)
    },
    [goal, channels, addThinking]
  )

  const requestTestRender = useCallback(
    async (providerId: string, prompt: string) => {
      dispatch({
        type: 'SET_VIDEO_STATE',
        videoState: { testRenderStatus: 'rendering', testRenderVideoUrl: null, testRenderError: null, testRenderProgress: 0 },
      })
      addThinking('video-offer', 'Test render started', `Generating 10s preview with ${providerId}...`)

      try {
        const res = await fetch('/api/studio/video/test-render', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerId, prompt, durationSeconds: 10 }),
        })
        const data = await res.json()

        if (data.status === 'complete' && data.videoUrl) {
          dispatch({
            type: 'SET_VIDEO_STATE',
            videoState: { testRenderStatus: 'complete', testRenderVideoUrl: data.videoUrl, testRenderCostPaid: data.actualCost || data.estimatedCost || 0 },
          })
          addThinking('video-offer', 'Test render complete', `Preview ready (${data.renderTimeMs}ms)`)
        } else if (data.status === 'processing' && data.pollUrl) {
          dispatch({ type: 'SET_VIDEO_STATE', videoState: { testRenderStatus: 'polling' } })
          pollTestRenderAsync(data.pollUrl)
        } else {
          throw new Error(data.error || 'Unknown render error')
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Test render failed'
        dispatch({
          type: 'SET_VIDEO_STATE',
          videoState: { testRenderStatus: 'error', testRenderError: msg },
        })
      }
    },
    [addThinking] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const pollTestRenderAsync = useCallback(
    (pollUrl: string) => {
      let attempts = 0
      const maxAttempts = 60

      const poll = async () => {
        if (attempts >= maxAttempts) {
          dispatch({
            type: 'SET_VIDEO_STATE',
            videoState: { testRenderStatus: 'error', testRenderError: 'Render timed out after 5 minutes' },
          })
          return
        }
        attempts++

        try {
          const res = await fetch(pollUrl)
          const data = await res.json()

          if (data.status === 'complete' && data.videoUrl) {
            dispatch({
              type: 'SET_VIDEO_STATE',
              videoState: { testRenderStatus: 'complete', testRenderVideoUrl: data.videoUrl, testRenderCostPaid: data.estimatedCost || 0 },
            })
            addThinking('video-offer', 'Test render complete', 'Preview ready')
          } else if (data.status === 'processing') {
            dispatch({ type: 'SET_VIDEO_STATE', videoState: { testRenderProgress: data.progress || 0 } })
            setTimeout(poll, 5000)
          } else if (data.status === 'failed') {
            dispatch({
              type: 'SET_VIDEO_STATE',
              videoState: { testRenderStatus: 'error', testRenderError: data.error || 'Render failed' },
            })
          }
        } catch {
          setTimeout(poll, 5000)
        }
      }

      setTimeout(poll, 5000)
    },
    [addThinking]
  )

  const confirmFullRender = useCallback(
    (providerId: string) => {
      videoProviderRef.current = providerId
      dispatch({ type: 'SET_VIDEO_STATE', videoState: { fullRenderCostConfirmed: true } })
      finishSession()
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const selectVideoProvider = useCallback(
    (provider: string | undefined) => {
      videoProviderRef.current = provider
      finishSession()
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // ── Phase 4: Complete ──────────────────────────────────────────────────────

  const finishSession = useCallback(() => {
    dispatch({ type: 'SET_PHASE', phase: 'done' })
    addThinking('done', 'Content ready!', 'Handing off to preview...')

    const hookSection = state.sections.find((s) => s.type === 'hook')
    const bodySection = state.sections.find((s) => s.type === 'body')
    const ctaSection = state.sections.find((s) => s.type === 'cta')

    const hookContent = hookSection?.content || ''
    const title = hookContent.split('\n')[0].slice(0, 100) || state.topic

    const bodyParts = [hookContent, bodySection?.content || '', ctaSection?.content || ''].filter(Boolean)
    const body = bodyParts.join('\n\n')

    const hashtagMatches = body.match(/#\w+/g) || []

    onComplete({
      title,
      body,
      hashtags: hashtagMatches,
      callToAction: ctaSection?.content || '',
      videoProvider: videoProviderRef.current,
    })
  }, [state.sections, state.topic, onComplete, addThinking])

  const completeSession = useCallback(() => {
    // If video/reel content, go to video-offer phase first
    if (contentType === 'video' || contentType === 'reel') {
      dispatch({ type: 'SET_PHASE', phase: 'video-offer' })
      dispatch({ type: 'SET_VIDEO_STATE', videoState: { ...initialVideoState } })
      addThinking('video-offer', 'Video options', 'Checking available video providers...')
      return
    }
    finishSession()
  }, [contentType, finishSession, addThinking])

  // ── Reset ──────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  return {
    state,
    dispatch,
    fetchGreeting,
    fetchAngles,
    refreshAngles,
    refineAngles,
    selectAngle,
    generateSection,
    reviseSection,
    assistSection,
    acceptSection,
    retrySection,
    editSection,
    reviewEditedSection,
    scoreContent,
    fetchPolishSuggestions,
    applyFix,
    completeSession,
    selectVideoProvider,
    fetchRecommendation,
    requestTestRender,
    confirmFullRender,
    reset,
  }
}
