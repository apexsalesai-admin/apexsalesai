/**
 * Mia Script Intelligence Engine
 *
 * Analyzes scripts/storyboards to detect scenes, estimate per-scene duration,
 * and recommend the optimal provider for each scene based on content type,
 * platform, connected providers, and budget.
 */

import type { MiaSceneAnalysis } from './mia-types'

// ─── Public Types ───────────────────────────────────────────

export interface ScriptAnalysisResult {
  scenes: MiaSceneAnalysis[]
  totalWords: number
  totalEstimatedDuration: number
  totalEstimatedCost: number
  warnings: string[]
  platform: string
  // AI-enriched fields (P20-B)
  overallFeedback?: string
  suggestedRewrites?: Array<{ sceneNumber: number; original: string; rewrite: string; reason: string }>
  narrativeArc?: string
  aiGenerated?: boolean
}

interface DetectedScene {
  sceneNumber: number
  text: string
  wordCount: number
  hasDialogue: boolean
  hasBRoll: boolean
  label: string
}

interface ProviderRecommendation {
  provider: string
  model?: string
  duration: number
  cost: number
  reason: string
}

// ─── Constants ──────────────────────────────────────────────

const WORDS_PER_SECOND = 2.5 // ~150 words per minute
const MIN_SCENE_DURATION = 3
const MAX_SCENE_DURATION = 25 // Sora 2 Pro max
const MIN_SCENE_WORDS = 20
const SUPPORTED_DURATIONS = [4, 5, 6, 8, 10, 12, 15, 25]

/** Per-second cost by provider+model */
const COST_PER_SECOND: Record<string, number> = {
  'sora:sora-2': 0.10,
  'sora:sora-2-pro': 0.30,
  'runway:gen4.5': 0.34,
  'heygen': 0.017, // ~$0.50/30s
  'template': 0,
}

// ─── Scene Detection ────────────────────────────────────────

const SCENE_MARKER_RE = /(?:scene|act)\s*(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s*[:.\-\u2013\u2014]/i
const TIMESTAMP_RE = /[[(]?\d{1,2}:\d{2}\s*[-\u2013\u2014]\s*\d{1,2}:\d{2}[)\]]?/

const DIALOGUE_MARKERS = [
  /["'\u201C\u201D].*["'\u201C\u201D]/,  // Quoted speech
  /\b(says?|speaks?|asks?|tells?|explains?|narrat)/i,
  /\b(voiceover|v\.?o\.?|narrator|host|speaker|avatar)\b/i,
  /\b(hey|hello|hi|welcome)\b.*\b(i'm|we're|let me|today)\b/i,
]

const BROLL_MARKERS = [
  /\b(b-?roll|footage|cinematic|aerial|drone|montage|timelapse|slow[- ]?mo)\b/i,
  /\b(wide shot|close[- ]?up|pan|zoom|tracking shot|establishing shot)\b/i,
  /\b(visual|overlay|transition|cut to|fade|dissolve)\b/i,
]

function hasDialogue(text: string): boolean {
  return DIALOGUE_MARKERS.some(re => re.test(text))
}

function hasBRoll(text: string): boolean {
  return BROLL_MARKERS.some(re => re.test(text))
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function labelScene(index: number, text: string): string {
  const lower = text.toLowerCase()
  if (index === 0 && wordCount(text) < 30) return `Scene ${index + 1}: Hook`
  if (/\b(call to action|cta|sign up|get started|visit|learn more|subscribe)\b/i.test(lower)) return `Scene ${index + 1}: CTA`
  if (/\b(problem|challenge|pain point|struggle|frustrat)\b/i.test(lower)) return `Scene ${index + 1}: Problem`
  if (/\b(solution|answer|fix|resolve|introduc|platform|product)\b/i.test(lower)) return `Scene ${index + 1}: Solution`
  if (/\b(benefit|result|outcome|transform|roi|impact)\b/i.test(lower)) return `Scene ${index + 1}: Benefits`
  if (/\b(testimonial|customer|client|review|said|says)\b/i.test(lower)) return `Scene ${index + 1}: Testimonial`
  return `Scene ${index + 1}`
}

/**
 * Detect scenes from raw script text using priority-ordered delimiters.
 */
export function detectScenes(scriptText: string): DetectedScene[] {
  const trimmed = scriptText.trim()
  if (!trimmed) return []

  // 1. Try explicit scene markers
  const sceneMarkerParts = trimmed.split(SCENE_MARKER_RE).filter(s => s.trim().length > 0)
  if (sceneMarkerParts.length >= 2) {
    return buildScenes(sceneMarkerParts)
  }

  // 2. Try timestamp markers
  const timestampParts = trimmed.split(TIMESTAMP_RE).filter(s => s.trim().length > 0)
  if (timestampParts.length >= 2) {
    return buildScenes(timestampParts)
  }

  // 3. Try JSON storyboard
  try {
    const parsed = JSON.parse(trimmed)
    const scenes = parsed?.scenes || (Array.isArray(parsed) ? parsed : null)
    if (scenes && scenes.length >= 2) {
      return scenes.map((s: Record<string, unknown>, i: number) => {
        const text = String(s.description || s.text || s.prompt || s.script || '')
        return {
          sceneNumber: i + 1,
          text,
          wordCount: wordCount(text),
          hasDialogue: hasDialogue(text),
          hasBRoll: hasBRoll(text),
          label: String(s.label || s.title || labelScene(i, text)),
        }
      })
    }
  } catch {
    // Not JSON, continue
  }

  // 4. Paragraph breaks (double newline)
  const paragraphs = trimmed.split(/\n\s*\n/).filter(s => s.trim().length > 0)
  if (paragraphs.length >= 2) {
    // Merge short paragraphs into previous
    const merged: string[] = []
    for (const p of paragraphs) {
      if (merged.length > 0 && wordCount(p) < MIN_SCENE_WORDS) {
        merged[merged.length - 1] += '\n\n' + p
      } else {
        merged.push(p)
      }
    }
    if (merged.length >= 2) {
      return buildScenes(merged)
    }
  }

  // 5. Single block
  return [{
    sceneNumber: 1,
    text: trimmed,
    wordCount: wordCount(trimmed),
    hasDialogue: hasDialogue(trimmed),
    hasBRoll: hasBRoll(trimmed),
    label: labelScene(0, trimmed),
  }]
}

function buildScenes(parts: string[]): DetectedScene[] {
  return parts.map((text, i) => ({
    sceneNumber: i + 1,
    text: text.trim(),
    wordCount: wordCount(text),
    hasDialogue: hasDialogue(text),
    hasBRoll: hasBRoll(text),
    label: labelScene(i, text),
  }))
}

// ─── Duration Estimation ────────────────────────────────────

/**
 * Estimate the optimal scene duration based on word count.
 * Rounds to nearest provider-supported duration bucket.
 */
export function estimateSceneDuration(words: number): number {
  const raw = Math.max(MIN_SCENE_DURATION, words / WORDS_PER_SECOND)
  const clamped = Math.min(raw, MAX_SCENE_DURATION)

  // Find nearest supported duration
  let best = SUPPORTED_DURATIONS[0]
  let bestDiff = Math.abs(clamped - best)
  for (const d of SUPPORTED_DURATIONS) {
    const diff = Math.abs(clamped - d)
    if (diff < bestDiff) {
      best = d
      bestDiff = diff
    }
  }
  return best
}

// ─── Provider Recommendation ────────────────────────────────

const PLATFORM_PREFERENCES: Record<string, { preferLong: boolean; preferVertical: boolean; quality: 'high' | 'standard' }> = {
  youtube: { preferLong: true, preferVertical: false, quality: 'high' },
  tiktok: { preferLong: false, preferVertical: true, quality: 'standard' },
  linkedin: { preferLong: false, preferVertical: false, quality: 'high' },
  instagram: { preferLong: false, preferVertical: true, quality: 'standard' },
  general: { preferLong: false, preferVertical: false, quality: 'standard' },
}

/**
 * Recommend a provider for a single scene based on its characteristics.
 */
export function recommendProviderForScene(
  scene: DetectedScene,
  platform: string,
  connectedProviders: string[],
  budgetRemaining?: number,
): ProviderRecommendation {
  const prefs = PLATFORM_PREFERENCES[platform] || PLATFORM_PREFERENCES.general
  const duration = estimateSceneDuration(scene.wordCount)

  // Build candidate list with scoring
  const candidates: Array<ProviderRecommendation & { score: number }> = []

  const isConnected = (p: string) => connectedProviders.includes(p) || p === 'template'

  // Dialogue/talking head → HeyGen
  if (scene.hasDialogue && isConnected('heygen')) {
    const cost = (COST_PER_SECOND['heygen'] || 0) * duration
    candidates.push({
      provider: 'heygen',
      duration,
      cost,
      reason: 'AI avatar for dialogue — builds authenticity',
      score: 80,
    })
  }

  // Cinematic/B-roll → Sora 2 Pro for long, Standard for short
  if (isConnected('sora')) {
    if (duration > 10 && prefs.quality === 'high') {
      const cost = (COST_PER_SECOND['sora:sora-2-pro'] || 0.30) * duration
      candidates.push({
        provider: 'sora',
        model: 'sora-2-pro',
        duration: clampToProviderDuration(duration, 'sora-2-pro'),
        cost,
        reason: 'Cinematic quality with synced audio — ideal for long scenes',
        score: scene.hasBRoll ? 90 : 75,
      })
    }
    const stdDuration = clampToProviderDuration(Math.min(duration, 12), 'sora-2')
    const stdCost = (COST_PER_SECOND['sora:sora-2'] || 0.10) * stdDuration
    candidates.push({
      provider: 'sora',
      model: 'sora-2',
      duration: stdDuration,
      cost: stdCost,
      reason: scene.wordCount < 15 ? 'Quick hook — Sora Standard is cost-effective' : 'AI video with synced audio by OpenAI',
      score: scene.hasBRoll ? 70 : 65,
    })
  }

  // Runway
  if (isConnected('runway')) {
    const rwDuration = Math.min(duration, 10)
    const cost = (COST_PER_SECOND['runway:gen4.5'] || 0.34) * rwDuration
    candidates.push({
      provider: 'runway',
      model: 'gen4.5',
      duration: rwDuration,
      cost,
      reason: 'Hollywood-grade visual fidelity from Runway Gen-4.5',
      score: scene.hasBRoll ? 75 : 55,
    })
  }

  // Template (always available, always fallback)
  candidates.push({
    provider: 'template',
    duration,
    cost: 0,
    reason: 'Free storyboard preview — no API key needed',
    score: 10,
  })

  // Budget filter
  if (budgetRemaining !== undefined) {
    for (const c of candidates) {
      if (c.cost > budgetRemaining) c.score -= 50
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score)
  const best = candidates[0]

  return {
    provider: best.provider,
    model: best.model,
    duration: best.duration,
    cost: best.cost,
    reason: best.reason,
  }
}

function clampToProviderDuration(d: number, model: string): number {
  if (model === 'sora-2-pro') {
    if (d <= 10) return 10
    if (d <= 15) return 15
    return 25
  }
  // sora-2
  if (d <= 4) return 4
  if (d <= 8) return 8
  return 12
}

// ─── Main Analysis Function ─────────────────────────────────

/**
 * Analyze a script: detect scenes, estimate durations, recommend providers,
 * calculate costs, and generate warnings.
 */
export function analyzeScript(
  scriptText: string,
  targetPlatform: string,
  connectedProviders: string[],
  budgetRemaining?: number,
): ScriptAnalysisResult {
  const scenes = detectScenes(scriptText)
  const warnings: string[] = []
  const platform = targetPlatform.toLowerCase()

  let runningBudget = budgetRemaining
  const prefs = PLATFORM_PREFERENCES[platform] || PLATFORM_PREFERENCES.general
  const defaultRatio = prefs.preferVertical ? '9:16' : '16:9'

  const analyzedScenes: MiaSceneAnalysis[] = scenes.map(scene => {
    const rec = recommendProviderForScene(scene, platform, connectedProviders, runningBudget)

    // Deduct from running budget
    if (runningBudget !== undefined) {
      runningBudget = Math.max(0, runningBudget - rec.cost)
    }

    return {
      sceneNumber: scene.sceneNumber,
      label: scene.label,
      scriptExcerpt: scene.text.slice(0, 80),
      estimatedDuration: rec.duration,
      recommendedProvider: rec.provider,
      recommendedModel: rec.model,
      estimatedCost: Math.round(rec.cost * 100) / 100,
      aspectRatio: defaultRatio,
      hasDialogue: scene.hasDialogue,
      hasBRoll: scene.hasBRoll,
    }
  })

  const totalWords = scenes.reduce((sum, s) => sum + s.wordCount, 0)
  const totalEstimatedDuration = analyzedScenes.reduce((sum, s) => sum + s.estimatedDuration, 0)
  const totalEstimatedCost = Math.round(analyzedScenes.reduce((sum, s) => sum + s.estimatedCost, 0) * 100) / 100

  // Generate warnings
  if (totalEstimatedDuration > 25 && scenes.length === 1) {
    warnings.push(
      `Your script runs ~${totalEstimatedDuration}s but max single render is 25s. I recommend splitting into ${Math.ceil(totalEstimatedDuration / 12)} scenes.`
    )
  }

  if (budgetRemaining !== undefined && totalEstimatedCost > budgetRemaining) {
    warnings.push(
      `This render plan costs ~$${totalEstimatedCost.toFixed(2)} but you have $${budgetRemaining.toFixed(2)} remaining this month.`
    )
  }

  if (totalWords < 5 && scenes.length === 1) {
    warnings.push('Script is very short. Consider adding more detail for a richer video.')
  }

  // Platform-specific warnings
  if (platform === 'tiktok' && totalEstimatedDuration > 60) {
    warnings.push('TikTok performs best with videos under 60 seconds.')
  }

  console.log(`[MIA:ANALYZE] scenes=${scenes.length} totalDuration=${totalEstimatedDuration}s totalCost=$${totalEstimatedCost.toFixed(2)} platform=${platform}`)
  for (const w of warnings) {
    console.log(`[MIA:WARN] ${w}`)
  }

  return {
    scenes: analyzedScenes,
    totalWords,
    totalEstimatedDuration,
    totalEstimatedCost,
    warnings,
    platform,
  }
}
