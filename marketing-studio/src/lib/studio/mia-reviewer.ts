/**
 * Mia Post-Render Review Engine
 *
 * Analyzes completed renders and generates optimization suggestions:
 * - Platform-specific reformats (e.g., vertical for TikTok)
 * - Scene pacing analysis (rushed scenes)
 * - Cost optimization feedback
 * - Quality observations
 */

import type { MiaMessage, MiaActionButton, MiaRenderPlan } from './mia-types'

interface ContentContext {
  title: string
  contentType: string
  channels: string[]
}

let _reviewId = 0
function nextId(): string {
  return `mia-review-${Date.now()}-${++_reviewId}`
}

/**
 * Generate post-render review suggestions based on the completed render plan,
 * actual costs, and content context.
 */
export function generateReviewSuggestions(
  renderPlan: MiaRenderPlan,
  content: ContentContext,
  actualCosts: number[],
): MiaMessage {
  const suggestions: string[] = []
  const actions: MiaActionButton[] = []
  const channels = content.channels.map(c => c.toLowerCase())

  // 1. Platform-specific reformats
  const hasYouTube = channels.includes('youtube')
  const hasTikTok = channels.includes('tiktok')
  const hasInstagram = channels.includes('instagram')
  const hasLinkedIn = channels.includes('linkedin')

  if (hasYouTube && !hasTikTok && !hasInstagram) {
    suggestions.push("This would make a great short-form clip for TikTok or Instagram Reels. Want a 9:16 vertical version?")
    actions.push({
      label: 'Create Vertical Version',
      action: 'reformat-vertical',
      variant: 'secondary',
    })
  }

  if ((hasTikTok || hasInstagram) && !hasYouTube) {
    suggestions.push("This content could perform well on YouTube too. Want a 16:9 landscape version?")
    actions.push({
      label: 'Create YouTube Version',
      action: 'reformat-landscape',
      variant: 'secondary',
    })
  }

  if (hasLinkedIn && renderPlan.scenes.length > 3) {
    suggestions.push("LinkedIn videos perform best under 30 seconds. Consider a tighter cut for LinkedIn.")
  }

  // 2. Scene pacing analysis
  const rushedScenes: number[] = []
  for (const scene of renderPlan.scenes) {
    const wordCount = scene.prompt.split(/\s+/).filter(Boolean).length
    const wordsPerSecond = wordCount / scene.duration
    if (wordsPerSecond > 3.5 && scene.duration < 25) {
      rushedScenes.push(scene.sceneNumber)
    }
  }

  if (rushedScenes.length > 0) {
    const sceneList = rushedScenes.length === 1
      ? `Scene ${rushedScenes[0]}`
      : `Scenes ${rushedScenes.join(', ')}`
    const longerDuration = Math.min(
      renderPlan.scenes[rushedScenes[0] - 1].duration + 4,
      25
    )
    suggestions.push(
      `${sceneList} feel${rushedScenes.length === 1 ? 's' : ''} a bit rushed for the amount of script content. Re-rendering at ${longerDuration}s could improve pacing.`
    )
    actions.push({
      label: `Re-render ${sceneList}`,
      action: 'rerender-scene',
      variant: 'ghost',
      data: { sceneNumbers: rushedScenes },
    })
  }

  // 3. Cost optimization
  const actualTotal = actualCosts.reduce((a, b) => a + b, 0)
  const estimatedTotal = renderPlan.totalEstimatedCost

  if (actualTotal > 0 && actualTotal < estimatedTotal * 0.8) {
    suggestions.push(
      `Actual cost was $${actualTotal.toFixed(2)}, under the $${estimatedTotal.toFixed(2)} estimate. Budget is in good shape.`
    )
  } else if (actualTotal > estimatedTotal * 1.1) {
    suggestions.push(
      `Actual cost was $${actualTotal.toFixed(2)}, slightly over the $${estimatedTotal.toFixed(2)} estimate. Consider using Sora Standard for non-hero scenes to save.`
    )
  }

  // 4. Quality check — template-only renders
  const allTemplate = renderPlan.scenes.every(s => s.provider === 'template')
  if (allTemplate) {
    suggestions.push(
      "These are storyboard previews. Connect a video provider (Sora 2, Runway) in Settings to generate real video."
    )
    actions.push({
      label: 'Connect Provider',
      action: 'open-settings',
      variant: 'secondary',
      data: { href: '/studio/settings/providers' },
    })
  }

  // Final message
  if (suggestions.length === 0) {
    suggestions.push("Everything looks great! Your video is ready to publish.")
  }

  actions.push({
    label: 'Looks great!',
    action: 'dismiss-review',
    variant: 'primary',
  })

  console.log(`[MIA:REVIEW] scenes=${renderPlan.scenes.length} suggestions=${suggestions.length} actualCost=$${actualTotal.toFixed(2)}`)

  return {
    id: nextId(),
    type: 'review',
    content: suggestions.join('\n\n'),
    timestamp: new Date().toISOString(),
    actions,
    metadata: {
      estimatedCost: estimatedTotal,
    },
  }
}
