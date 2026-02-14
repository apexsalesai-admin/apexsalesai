/**
 * Mia Creative Session Types (Wave 1)
 *
 * All interfaces for the guided creative co-creation experience
 * that replaces Step 2 of the content wizard when Mia mode is active.
 */

// ─── Session Phases ────────────────────────────────────────────────────────────

export type MiaCreativePhase =
  | 'greeting'   // Phase 0: personalized greeting + topic input
  | 'angles'     // Phase 1: research + angle selection
  | 'building'   // Phase 2: section-by-section generation
  | 'polishing'  // Phase 3: assembled draft analysis + fix suggestions
  | 'done'       // Phase 4: hand off to parent

// ─── Section Types ─────────────────────────────────────────────────────────────

export type SectionType = 'hook' | 'body' | 'cta'

export interface SectionDraft {
  type: SectionType
  content: string
  version: number
  accepted: boolean
  rejectedVersions: string[]
}

// ─── Angle Cards ───────────────────────────────────────────────────────────────

export interface AngleCard {
  id: string
  title: string
  description: string
  rationale: string
  sources: AngleSource[]
}

export interface AngleSource {
  title: string
  url: string
  snippet: string
}

// ─── Thinking Panel ────────────────────────────────────────────────────────────

export interface ThinkingEntry {
  id: string
  timestamp: number
  phase: MiaCreativePhase
  label: string
  detail: string
}

// ─── Fix Suggestions (Polishing Phase) ─────────────────────────────────────────

export interface FixSuggestion {
  id: string
  category: 'tone' | 'clarity' | 'engagement' | 'length' | 'cta' | 'flow'
  description: string
  currentText: string
  suggestedText: string
  applied: boolean
}

// ─── Session State ─────────────────────────────────────────────────────────────

export interface MiaSessionState {
  phase: MiaCreativePhase
  greeting: string | null
  topic: string
  selectedAngle: AngleCard | null
  angles: AngleCard[]
  sections: SectionDraft[]
  currentSectionIndex: number
  fixes: FixSuggestion[]
  thinking: ThinkingEntry[]
  isLoading: boolean
  error: string | null
}

// ─── Reducer Actions ───────────────────────────────────────────────────────────

export type MiaSessionAction =
  | { type: 'SET_GREETING'; greeting: string }
  | { type: 'SET_TOPIC'; topic: string }
  | { type: 'SET_ANGLES'; angles: AngleCard[] }
  | { type: 'SELECT_ANGLE'; angle: AngleCard }
  | { type: 'SET_SECTION_CONTENT'; index: number; content: string }
  | { type: 'ACCEPT_SECTION'; index: number }
  | { type: 'RETRY_SECTION'; index: number }
  | { type: 'EDIT_SECTION'; index: number; content: string }
  | { type: 'ADVANCE_SECTION' }
  | { type: 'SET_FIXES'; fixes: FixSuggestion[] }
  | { type: 'APPLY_FIX'; fixId: string }
  | { type: 'SET_PHASE'; phase: MiaCreativePhase }
  | { type: 'ADD_THINKING'; entry: ThinkingEntry }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'RESET' }

// ─── API Request / Response Types ──────────────────────────────────────────────

export interface MiaContextRequest {
  channels: string[]
  contentType: string
}

export interface MiaContextResponse {
  success: boolean
  greeting: string
  brandName: string
  recentTopics: string[]
  error?: string
}

export interface MiaResearchRequest {
  topic: string
  channels: string[]
  contentType: string
  goal?: string
}

export interface MiaResearchResponse {
  success: boolean
  angles: AngleCard[]
  error?: string
}

export interface MiaGenerateSectionRequest {
  topic: string
  angle: AngleCard
  sectionType: SectionType
  channels: string[]
  contentType: string
  previousSections: { type: SectionType; content: string }[]
  rejectedVersions: string[]
  goal?: string
}

export interface MiaGenerateSectionResponse {
  success: boolean
  content: string
  thinking: string
  error?: string
}

export interface MiaPolishRequest {
  topic: string
  angle: AngleCard
  sections: { type: SectionType; content: string }[]
  channels: string[]
  contentType: string
}

export interface MiaPolishResponse {
  success: boolean
  fixes: FixSuggestion[]
  error?: string
}

// ─── Completion Payload ────────────────────────────────────────────────────────

export interface MiaCreativeResult {
  title: string
  body: string
  hashtags: string[]
  callToAction: string
}
