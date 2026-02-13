/**
 * Mia AI Script Analyzer (P20-B)
 *
 * Replaces regex heuristics with Claude Sonnet for creative intelligence.
 * Mia reads scripts, understands narrative structure, recommends visual
 * treatments per scene, flags weak sections, and suggests rewrites.
 *
 * Defensive layers:
 * 1. server-only import guard
 * 2. Zod schema validation
 * 3. 3-strategy JSON extraction (direct → brace-extract → repair prompt)
 * 4. Deterministic fallback to regex analyzer
 * 5. In-memory response cache by SHA-256 script hash
 * 6. Duration snapping to provider-supported buckets
 * 7. Scene count clamping (1–8)
 */

import 'server-only'

import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { createHash } from 'crypto'
import type { MiaSceneAnalysis } from './mia-types'
import type { ScriptAnalysisResult } from './mia-script-analyzer'

// ─── Constants ──────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 2048
const MAX_SCENES = 8
const MIN_SCENES = 1
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes
const SUPPORTED_DURATIONS = [4, 5, 6, 8, 10, 12, 15, 25]

const COST_PER_SECOND: Record<string, number> = {
  'sora': 0.10,
  'sora-2': 0.10,
  'sora-2-pro': 0.30,
  'runway': 0.34,
  'heygen': 0.017,
  'template': 0,
}

// ─── Zod Schemas ────────────────────────────────────────────

const AiSceneSchema = z.object({
  sceneNumber: z.number().int().min(1).max(MAX_SCENES),
  label: z.string().min(1).max(100),
  scriptExcerpt: z.string().min(1).max(300),
  estimatedDuration: z.number().min(3).max(25),
  recommendedProvider: z.string().min(1),
  visualDirection: z.string().min(1).max(500),
  creativeFeedback: z.string().min(1).max(500),
  strengthRating: z.enum(['strong', 'adequate', 'needs-work']),
  hasDialogue: z.boolean(),
  hasBRoll: z.boolean(),
})

const AiAnalysisSchema = z.object({
  scenes: z.array(AiSceneSchema).min(MIN_SCENES).max(MAX_SCENES),
  overallFeedback: z.string().min(1).max(1000),
  narrativeArc: z.string().min(1).max(300),
  suggestedRewrites: z.array(z.object({
    sceneNumber: z.number().int().min(1),
    original: z.string().min(1),
    rewrite: z.string().min(1),
    reason: z.string().min(1),
  })).optional().default([]),
})

type AiAnalysisRaw = z.infer<typeof AiAnalysisSchema>

// ─── Cache ──────────────────────────────────────────────────

interface CacheEntry {
  result: ScriptAnalysisResult
  timestamp: number
}

const analysisCache = new Map<string, CacheEntry>()

function getCacheKey(script: string, platform: string, providers: string[]): string {
  const hash = createHash('sha256')
    .update(`${script}|${platform}|${providers.sort().join(',')}`)
    .digest('hex')
    .slice(0, 16)
  return `mia-ai-${hash}`
}

function getCached(key: string): ScriptAnalysisResult | null {
  const entry = analysisCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    analysisCache.delete(key)
    return null
  }
  return entry.result
}

function setCache(key: string, result: ScriptAnalysisResult): void {
  // Evict old entries if cache grows beyond 50
  if (analysisCache.size > 50) {
    const entries: Array<[string, CacheEntry]> = []
    analysisCache.forEach((v, k) => entries.push([k, v]))
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    const toDelete = entries.slice(0, 10)
    for (const [k] of toDelete) analysisCache.delete(k)
  }
  analysisCache.set(key, { result, timestamp: Date.now() })
}

// ─── Anthropic Client ───────────────────────────────────────

let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })
  }
  return _client
}

// ─── Prompt ─────────────────────────────────────────────────

function buildPrompt(
  script: string,
  platform: string,
  connectedProviders: string[],
  budgetRemaining: number,
): string {
  const providerList = connectedProviders.length > 0
    ? connectedProviders.join(', ')
    : 'template (free only)'

  return `You are Mia, a $300/hour marketing video creative director. Analyze this script for ${platform} video production.

CONNECTED PROVIDERS: ${providerList}
BUDGET REMAINING: $${budgetRemaining.toFixed(2)}

SCRIPT:
"""
${script.slice(0, 3000)}
"""

Return a JSON object (no markdown, no code fences, just raw JSON) with this exact structure:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "label": "Scene 1: Hook",
      "scriptExcerpt": "First 60 chars of scene text...",
      "estimatedDuration": 5,
      "recommendedProvider": "sora",
      "visualDirection": "Close-up product shot with dramatic lighting, slow zoom out to reveal...",
      "creativeFeedback": "Strong emotional hook — the contrast between problem and promise grabs attention immediately.",
      "strengthRating": "strong",
      "hasDialogue": false,
      "hasBRoll": true
    }
  ],
  "overallFeedback": "Your creative director assessment of this script as a whole. Be specific and actionable.",
  "narrativeArc": "hook → problem → solution → proof → CTA",
  "suggestedRewrites": [
    {
      "sceneNumber": 2,
      "original": "Our product is great",
      "rewrite": "Watch how 12,000 marketers cut their production time in half",
      "reason": "Show, don't tell — specific numbers build credibility"
    }
  ]
}

RULES:
- ${MIN_SCENES}–${MAX_SCENES} scenes max. Combine short sections.
- estimatedDuration must be one of: ${SUPPORTED_DURATIONS.join(', ')} seconds.
- recommendedProvider must be one of the CONNECTED PROVIDERS or "template".
- For talking-head/dialogue scenes, prefer "heygen" if connected.
- For cinematic B-roll, prefer "sora" or "runway".
- Only suggest rewrites for "needs-work" or "adequate" scenes.
- Be honest but constructive. You're coaching, not criticizing.
- Keep scriptExcerpt under 80 characters.
- Return ONLY the JSON object. No explanation before or after.`
}

// ─── JSON Extraction (3 strategies) ─────────────────────────

function extractJSON(raw: string): unknown | null {
  // Strategy 1: Direct parse
  try {
    return JSON.parse(raw.trim())
  } catch {
    // continue
  }

  // Strategy 2: Brace extraction — find outermost { }
  const firstBrace = raw.indexOf('{')
  const lastBrace = raw.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(raw.slice(firstBrace, lastBrace + 1))
    } catch {
      // continue
    }
  }

  // Strategy 3: Strip markdown code fences
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim())
    } catch {
      // continue
    }
  }

  return null
}

// ─── Duration Snapping ──────────────────────────────────────

function snapDuration(raw: number): number {
  let best = SUPPORTED_DURATIONS[0]
  let bestDiff = Math.abs(raw - best)
  for (const d of SUPPORTED_DURATIONS) {
    const diff = Math.abs(raw - d)
    if (diff < bestDiff) {
      best = d
      bestDiff = diff
    }
  }
  return best
}

// ─── Cost Estimation ────────────────────────────────────────

function estimateCost(provider: string, duration: number): number {
  const rate = COST_PER_SECOND[provider] ?? COST_PER_SECOND['template'] ?? 0
  return Math.round(rate * duration * 100) / 100
}

// ─── Post-Processing ────────────────────────────────────────

function postProcess(
  raw: AiAnalysisRaw,
  platform: string,
  connectedProviders: string[],
  budgetRemaining: number,
): ScriptAnalysisResult {
  // Clamp scene count
  const scenes = raw.scenes.slice(0, MAX_SCENES)

  // Snap durations and validate providers
  const validProviders = new Set([...connectedProviders, 'template'])

  let runningBudget = budgetRemaining
  const defaultRatio = ['tiktok', 'instagram'].includes(platform) ? '9:16' : '16:9'

  const processedScenes: MiaSceneAnalysis[] = scenes.map((s, i) => {
    const duration = snapDuration(s.estimatedDuration)
    const provider = validProviders.has(s.recommendedProvider)
      ? s.recommendedProvider
      : 'template'
    const cost = estimateCost(provider, duration)

    // Budget guard — downgrade to template if over budget
    const finalProvider = cost > runningBudget ? 'template' : provider
    const finalCost = finalProvider === 'template' ? 0 : cost
    runningBudget = Math.max(0, runningBudget - finalCost)

    return {
      sceneNumber: i + 1,
      label: s.label,
      scriptExcerpt: s.scriptExcerpt.slice(0, 80),
      estimatedDuration: duration,
      recommendedProvider: finalProvider,
      estimatedCost: finalCost,
      aspectRatio: defaultRatio,
      hasDialogue: s.hasDialogue,
      hasBRoll: s.hasBRoll,
      visualDirection: s.visualDirection,
      creativeFeedback: s.creativeFeedback,
      strengthRating: s.strengthRating,
    }
  })

  const totalEstimatedDuration = processedScenes.reduce((sum, s) => sum + s.estimatedDuration, 0)
  const totalEstimatedCost = Math.round(processedScenes.reduce((sum, s) => sum + s.estimatedCost, 0) * 100) / 100

  const warnings: string[] = []
  if (totalEstimatedDuration > 25 && scenes.length === 1) {
    warnings.push(`Script runs ~${totalEstimatedDuration}s but max single render is 25s. Consider splitting.`)
  }
  if (totalEstimatedCost > budgetRemaining) {
    warnings.push(`Render plan costs ~$${totalEstimatedCost.toFixed(2)} but $${budgetRemaining.toFixed(2)} remaining.`)
  }
  if (platform === 'tiktok' && totalEstimatedDuration > 60) {
    warnings.push('TikTok performs best with videos under 60 seconds.')
  }

  const totalWords = processedScenes.reduce((sum, s) => {
    return sum + s.scriptExcerpt.split(/\s+/).length
  }, 0)

  return {
    scenes: processedScenes,
    totalWords,
    totalEstimatedDuration,
    totalEstimatedCost,
    warnings,
    platform,
    overallFeedback: raw.overallFeedback,
    suggestedRewrites: raw.suggestedRewrites,
    narrativeArc: raw.narrativeArc,
    aiGenerated: true,
  }
}

// ─── Repair Prompt ──────────────────────────────────────────

async function repairJSON(brokenJSON: string): Promise<unknown | null> {
  try {
    const client = getClient()
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{
        role: 'user',
        content: `The following JSON is malformed. Fix it and return ONLY the corrected JSON, nothing else:\n\n${brokenJSON.slice(0, 2000)}`,
      }],
    })

    const text = response.content[0]?.type === 'text' ? response.content[0].text : ''
    return extractJSON(text)
  } catch {
    return null
  }
}

// ─── Main Export ─────────────────────────────────────────────

export async function analyzeScriptWithAI(
  script: string,
  platform: string,
  connectedProviders: string[],
  budgetRemaining: number,
): Promise<ScriptAnalysisResult | null> {
  // Check API key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('[MIA:AI] No ANTHROPIC_API_KEY — falling back to regex analyzer')
    return null
  }

  // Check cache
  const cacheKey = getCacheKey(script, platform, connectedProviders)
  const cached = getCached(cacheKey)
  if (cached) {
    console.log('[MIA:AI] Cache hit — returning cached analysis')
    return cached
  }

  try {
    const client = getClient()
    const prompt = buildPrompt(script, platform, connectedProviders, budgetRemaining)

    console.log('[MIA:AI] Calling Claude Sonnet for script analysis...')

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = response.content[0]?.type === 'text' ? response.content[0].text : ''

    if (!rawText) {
      console.error('[MIA:AI] Empty response from Claude')
      return null
    }

    // Extract JSON (3 strategies)
    let parsed = extractJSON(rawText)

    // Strategy 4: Repair prompt if all extraction failed
    if (!parsed) {
      console.log('[MIA:AI] JSON extraction failed — attempting repair prompt')
      parsed = await repairJSON(rawText)
    }

    if (!parsed) {
      console.error('[MIA:AI] All JSON extraction strategies failed')
      return null
    }

    // Validate with Zod
    const validation = AiAnalysisSchema.safeParse(parsed)
    if (!validation.success) {
      console.error('[MIA:AI] Zod validation failed:', validation.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', '))
      // Try to be lenient — partial parse
      return null
    }

    // Post-process: snap durations, validate providers, clamp scenes
    const result = postProcess(validation.data, platform, connectedProviders, budgetRemaining)

    // Cache the result
    setCache(cacheKey, result)

    console.log(`[MIA:AI] Analysis complete — ${result.scenes.length} scenes, arc: ${result.narrativeArc}`)

    return result
  } catch (error) {
    console.error('[MIA:AI:ERROR]', error)
    return null
  }
}
