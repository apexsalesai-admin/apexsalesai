/**
 * Mia Message Factory
 *
 * Centralized message generators for Mia's conversational UI.
 * All of Mia's personality and voice lives here.
 *
 * Voice guidelines:
 * - Professional but warm. Not robotic, not overly casual.
 * - Uses "I" and "your" — first person, direct.
 * - Gives reasons — explains WHY she recommends something.
 * - Acknowledges cost — transparent about spend.
 * - Single emoji max per message, tasteful.
 */

import type {
  MiaMessage,
  MiaActionButton,
  MiaCopilotMode,
  MiaRenderPlan,
} from './mia-types'
import type { ScriptAnalysisResult } from './mia-script-analyzer'

let _msgId = 0
function nextId(): string {
  return `mia-${Date.now()}-${++_msgId}`
}

function now(): string {
  return new Date().toISOString()
}

// ─── Content Context ────────────────────────────────────────

interface ContentContext {
  title: string
  contentType: string
  channels: string[]
  aiTone?: string | null
}

// ─── Greeting ───────────────────────────────────────────────

export function generateGreeting(content: ContentContext, mode: MiaCopilotMode): MiaMessage {
  const channel = content.channels?.[0]?.replace('_', ' ') || 'your platform'
  const topic = content.title.length > 50 ? content.title.slice(0, 47) + '...' : content.title

  if (mode === 'autopilot') {
    return {
      id: nextId(),
      type: 'greeting',
      content: `Ready to analyze **${topic}** for ${channel}. Select a version and I'll build your render plan.`,
      timestamp: now(),
    }
  }

  return {
    id: nextId(),
    type: 'greeting',
    content: `Hey! I see this is a ${channel} piece about **${topic}**. Want me to analyze the script and plan your video?`,
    timestamp: now(),
    actions: [
      { label: 'Analyze Script', action: 'analyze-script', variant: 'primary' },
      { label: "I'll handle it", action: 'dismiss', variant: 'ghost' },
    ],
  }
}

// ─── Script Analysis ────────────────────────────────────────

export function generateScriptAnalysis(
  analysis: ScriptAnalysisResult,
  mode: MiaCopilotMode,
): MiaMessage {
  const { scenes, totalEstimatedDuration, totalEstimatedCost } = analysis
  const sceneCount = scenes.length
  const costStr = totalEstimatedCost > 0 ? `$${totalEstimatedCost.toFixed(2)}` : 'free'

  const actions: MiaActionButton[] = mode === 'guided'
    ? [
        { label: 'Render All Scenes', action: 'render-all', variant: 'primary', data: { auto: false } },
        { label: 'Render Scene by Scene', action: 'render-sequential', variant: 'secondary' },
        { label: 'Adjust Plan', action: 'adjust', variant: 'ghost' },
      ]
    : [
        { label: 'Start Rendering', action: 'render-all', variant: 'primary', data: { auto: true } },
        { label: 'Review Plan', action: 'review-plan', variant: 'ghost' },
      ]

  // Use AI overallFeedback when available, otherwise fall back to structural summary
  let content: string
  if (analysis.aiGenerated && analysis.overallFeedback) {
    const arc = analysis.narrativeArc ? ` Arc: **${analysis.narrativeArc}**.` : ''
    content = `${analysis.overallFeedback}${arc}\n\n**${sceneCount} scene${sceneCount > 1 ? 's' : ''}** \u00B7 ~${totalEstimatedDuration}s \u00B7 **${costStr}** estimated.`
  } else {
    content = mode === 'guided'
      ? `Your script has **${sceneCount} scene${sceneCount > 1 ? 's' : ''}** (~${totalEstimatedDuration} seconds total). Here's my recommended render plan:`
      : `**${sceneCount} scene${sceneCount > 1 ? 's' : ''}** detected. Ready to render. **${costStr}** estimated.`
  }

  return {
    id: nextId(),
    type: 'script-analysis',
    content,
    timestamp: now(),
    confidence: 'high',
    actions,
    metadata: {
      sceneCount,
      estimatedDuration: totalEstimatedDuration,
      estimatedCost: totalEstimatedCost,
      scenes,
      suggestedRewrites: analysis.suggestedRewrites,
      narrativeArc: analysis.narrativeArc,
      aiGenerated: analysis.aiGenerated,
    },
  }
}

// ─── Render Start ───────────────────────────────────────────

export function generateRenderStart(plan: MiaRenderPlan, mode: MiaCopilotMode): MiaMessage {
  const sceneCount = plan.scenes.length
  const cost = plan.totalEstimatedCost > 0 ? `$${plan.totalEstimatedCost.toFixed(2)}` : 'free'

  return {
    id: nextId(),
    type: 'status',
    content: mode === 'guided'
      ? `Starting all ${sceneCount} scene${sceneCount > 1 ? 's' : ''}. Total: **${cost}**. I'll update you as each one completes.`
      : `Rendering ${sceneCount} scene${sceneCount > 1 ? 's' : ''}... **${cost}** estimated.`,
    timestamp: now(),
    metadata: {
      sceneCount,
      estimatedCost: plan.totalEstimatedCost,
      estimatedDuration: plan.totalEstimatedDuration,
    },
  }
}

// ─── Scene Complete ─────────────────────────────────────────

export function generateSceneComplete(
  sceneNumber: number,
  totalScenes: number,
  sceneLabel?: string,
): MiaMessage {
  const remaining = totalScenes - sceneNumber

  return {
    id: nextId(),
    type: 'status',
    content: remaining > 0
      ? `Scene ${sceneNumber}${sceneLabel ? ` (${sceneLabel})` : ''} complete! ${remaining} remaining...`
      : `Scene ${sceneNumber}${sceneLabel ? ` (${sceneLabel})` : ''} complete! All scenes finished.`,
    timestamp: now(),
  }
}

// ─── All Scenes Complete ────────────────────────────────────

export function generateAllComplete(
  plan: MiaRenderPlan,
  actualCost: number,
): MiaMessage {
  const sceneCount = plan.scenes.length
  const duration = plan.totalEstimatedDuration
  const costStr = actualCost > 0 ? `$${actualCost.toFixed(2)}` : 'free'
  const savings = plan.totalEstimatedCost - actualCost

  let content = `Your video is ready! ${sceneCount} scene${sceneCount > 1 ? 's' : ''}, ~${duration}s, **${costStr}** total.`
  if (savings > 0.10) {
    content += ` That's $${savings.toFixed(2)} under estimate.`
  }

  return {
    id: nextId(),
    type: 'celebration',
    content,
    timestamp: now(),
    actions: [
      { label: 'Set as Final', action: 'set-final', variant: 'primary' },
      { label: 'Re-render', action: 'rerender', variant: 'ghost' },
    ],
  }
}

// ─── Post-Render Review ─────────────────────────────────────

export function generatePostRenderReview(
  plan: MiaRenderPlan,
  content: ContentContext,
): MiaMessage {
  const suggestions: string[] = []
  const actions: MiaActionButton[] = []
  const channels = content.channels.map(c => c.toLowerCase())

  // Platform reformat suggestions
  if (channels.includes('youtube') && !channels.includes('tiktok')) {
    suggestions.push("Want me to create a 9:16 vertical cut for TikTok/Reels?")
    actions.push({ label: 'Create TikTok Version', action: 'reformat-vertical', variant: 'secondary' })
  }
  if (channels.includes('tiktok') && !channels.includes('youtube')) {
    suggestions.push("This could work great as a 16:9 YouTube version too.")
    actions.push({ label: 'Create YouTube Version', action: 'reformat-landscape', variant: 'secondary' })
  }

  // Scene pacing analysis
  for (const scene of plan.scenes) {
    const words = scene.prompt.split(/\s+/).length
    const wps = words / scene.duration
    if (wps > 3.5) {
      suggestions.push(
        `Scene ${scene.sceneNumber} feels rushed (${words} words in ${scene.duration}s). Re-render at ${Math.min(scene.duration + 4, 25)}s?`
      )
      actions.push({
        label: `Re-render Scene ${scene.sceneNumber}`,
        action: 'rerender-scene',
        variant: 'ghost',
        data: { sceneNumber: scene.sceneNumber },
      })
      break // Only surface one pacing issue to avoid noise
    }
  }

  if (suggestions.length === 0) {
    suggestions.push("Everything looks solid. Your video is ready to publish!")
  }

  actions.push({ label: 'Looks great!', action: 'dismiss-review', variant: 'primary' })

  return {
    id: nextId(),
    type: 'review',
    content: suggestions.join('\n\n'),
    timestamp: now(),
    actions,
  }
}

// ─── Warnings ───────────────────────────────────────────────

export function generateDurationWarning(
  scriptDuration: number,
  selectedDuration: number,
): MiaMessage {
  const ratio = scriptDuration / selectedDuration

  if (ratio > 1.5) {
    return {
      id: nextId(),
      type: 'warning',
      content: `Heads up \u2014 your script needs ~${Math.round(scriptDuration)}s but you've selected ${selectedDuration}s. The video will only cover the first part of your script. Want me to split it into scenes?`,
      timestamp: now(),
      confidence: 'high',
      actions: [
        { label: 'Split into Scenes', action: 'analyze-script', variant: 'primary' },
        { label: 'Keep as-is', action: 'dismiss', variant: 'ghost' },
      ],
    }
  }

  if (ratio < 0.5) {
    return {
      id: nextId(),
      type: 'warning',
      content: `Your script is short for ${selectedDuration}s. The video will have filler time. Consider reducing to ${estimateBestDuration(scriptDuration)}s to save money.`,
      timestamp: now(),
      confidence: 'medium',
      actions: [
        { label: `Use ${estimateBestDuration(scriptDuration)}s`, action: 'set-duration', variant: 'secondary', data: { duration: estimateBestDuration(scriptDuration) } },
        { label: 'Keep as-is', action: 'dismiss', variant: 'ghost' },
      ],
    }
  }

  // Mild mismatch — informational
  return {
    id: nextId(),
    type: 'recommendation',
    content: `Your script runs ~${Math.round(scriptDuration)}s. A ${selectedDuration}s render should cover it${ratio > 1 ? ', though it may feel a bit fast' : ' well'}.`,
    timestamp: now(),
    confidence: 'medium',
  }
}

function estimateBestDuration(scriptSeconds: number): number {
  const durations = [4, 5, 6, 8, 10, 12, 15, 25]
  let best = durations[0]
  let bestDiff = Math.abs(scriptSeconds - best)
  for (const d of durations) {
    const diff = Math.abs(scriptSeconds - d)
    if (diff < bestDiff) {
      best = d
      bestDiff = diff
    }
  }
  return best
}

export function generateBudgetWarning(
  estimatedCost: number,
  remaining: number,
): MiaMessage {
  const actions: MiaActionButton[] = [
    { label: 'Use Template (Free)', action: 'select-template', variant: 'secondary' },
  ]

  if (estimatedCost > remaining && remaining > 0) {
    return {
      id: nextId(),
      type: 'warning',
      content: `This render plan costs ~$${estimatedCost.toFixed(2)} but you have $${remaining.toFixed(2)} remaining this month. Want me to suggest a cheaper plan, or use the free template?`,
      timestamp: now(),
      confidence: 'high',
      actions,
    }
  }

  return {
    id: nextId(),
    type: 'warning',
    content: `Your monthly render budget is fully spent. I can still render using the free template provider.`,
    timestamp: now(),
    confidence: 'high',
    actions,
  }
}

// ─── Provider Disconnect ────────────────────────────────────

export function generateProviderDisconnected(
  recommendedProvider: string,
  fallbackProvider: string,
): MiaMessage {
  const displayNames: Record<string, string> = {
    sora: 'Sora 2',
    runway: 'Runway Gen-4.5',
    heygen: 'HeyGen',
    template: 'Template',
  }

  return {
    id: nextId(),
    type: 'warning',
    content: `${displayNames[recommendedProvider] || recommendedProvider} isn't connected yet. I'll use **${displayNames[fallbackProvider] || fallbackProvider}** instead. Connect ${displayNames[recommendedProvider] || recommendedProvider} in Settings for better results.`,
    timestamp: now(),
    confidence: 'medium',
    actions: [
      { label: 'Go to Settings', action: 'open-settings', variant: 'secondary', data: { href: '/studio/settings/providers' } },
      { label: `Use ${displayNames[fallbackProvider] || fallbackProvider}`, action: 'dismiss', variant: 'ghost' },
    ],
  }
}

// ─── No Script ──────────────────────────────────────────────

export function generateNoScript(): MiaMessage {
  return {
    id: nextId(),
    type: 'question',
    content: 'No script detected. Add content to your version for me to analyze, or create a new version with your script.',
    timestamp: now(),
  }
}

// ─── Scene Render Prompt (Guided Mode) ──────────────────────

export function generateScenePrompt(
  sceneNumber: number,
  totalScenes: number,
  provider: string,
  duration: number,
  cost: number,
): MiaMessage {
  const displayNames: Record<string, string> = {
    sora: 'Sora 2',
    'sora-2': 'Sora 2 Standard',
    'sora-2-pro': 'Sora 2 Pro',
    runway: 'Runway Gen-4.5',
    heygen: 'HeyGen',
    template: 'Template',
  }

  return {
    id: nextId(),
    type: 'question',
    content: `Let's render Scene ${sceneNumber} of ${totalScenes}. I recommend **${displayNames[provider] || provider}**, ${duration}s (~$${cost.toFixed(2)}).`,
    timestamp: now(),
    actions: [
      { label: `Render Scene ${sceneNumber}`, action: 'render-scene', variant: 'primary', data: { sceneNumber } },
      { label: 'Change Provider', action: 'change-provider', variant: 'secondary', data: { sceneNumber } },
      { label: 'Skip', action: 'skip-scene', variant: 'ghost', data: { sceneNumber } },
    ],
  }
}
