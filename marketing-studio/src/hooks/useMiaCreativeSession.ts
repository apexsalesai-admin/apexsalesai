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

const initialState: MiaSessionState = {
  phase: 'greeting',
  greeting: null,
  topic: '',
  selectedAngle: null,
  angles: [],
  sections: createInitialSections(),
  currentSectionIndex: 0,
  fixes: [],
  thinking: [],
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
  onComplete: (result: MiaCreativeResult) => void
}

export function useMiaCreativeSession({
  channels,
  contentType,
  goal,
  onComplete,
}: UseMiaCreativeSessionProps) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const thinkingIdRef = useRef(0)

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
        const body: MiaResearchRequest = { topic, channels, contentType, goal }
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
    [channels, contentType, goal, addThinking]
  )

  // ── Phase 2: Select angle & start building ────────────────────────────────

  const selectAngle = useCallback(
    (angle: AngleCard) => {
      dispatch({ type: 'SELECT_ANGLE', angle })
      dispatch({ type: 'SET_PHASE', phase: 'building' })
      addThinking('building', 'Angle selected', `Going with: "${angle.title}"`)
    },
    [addThinking]
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

        const body: MiaGenerateSectionRequest = {
          topic: state.topic,
          angle: state.selectedAngle,
          sectionType: section.type,
          channels,
          contentType,
          previousSections,
          rejectedVersions: section.rejectedVersions,
          goal,
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
    [state.sections, state.selectedAngle, state.topic, channels, contentType, goal, addThinking]
  )

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
    },
    [state.sections, addThinking]
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
        body: JSON.stringify({ ...body, action: 'polish' }),
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
    },
    [state.fixes, addThinking]
  )

  // ── Phase 4: Complete ──────────────────────────────────────────────────────

  const completeSession = useCallback(() => {
    dispatch({ type: 'SET_PHASE', phase: 'done' })
    addThinking('done', 'Content ready!', 'Handing off to preview...')

    const hookSection = state.sections.find((s) => s.type === 'hook')
    const bodySection = state.sections.find((s) => s.type === 'body')
    const ctaSection = state.sections.find((s) => s.type === 'cta')

    // Build the title from the hook (first line or truncated)
    const hookContent = hookSection?.content || ''
    const title = hookContent.split('\n')[0].slice(0, 100) || state.topic

    // Build the full body
    const bodyParts = [hookContent, bodySection?.content || '', ctaSection?.content || ''].filter(Boolean)
    const body = bodyParts.join('\n\n')

    // Extract hashtags from content
    const hashtagMatches = body.match(/#\w+/g) || []

    onComplete({
      title,
      body,
      hashtags: hashtagMatches,
      callToAction: ctaSection?.content || '',
    })
  }, [state.sections, state.topic, onComplete, addThinking])

  // ── Reset ──────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  return {
    state,
    dispatch,
    fetchGreeting,
    fetchAngles,
    selectAngle,
    generateSection,
    acceptSection,
    retrySection,
    editSection,
    fetchPolishSuggestions,
    applyFix,
    completeSession,
    reset,
  }
}
