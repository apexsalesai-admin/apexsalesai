/**
 * Brand Voice Enforcement — post-generation filter
 *
 * Checks generated text against the workspace's forbidden phrases
 * (doNotSayList). Returns a list of violations so the caller can
 * decide how to handle them (block, warn, redact).
 */

import { getBrandVoiceForWorkspace, type BrandVoice } from '@/lib/brand-voice'

export interface EnforcementResult {
  passed: boolean
  violations: string[]
  brandVoice: BrandVoice
}

/**
 * Check generated text against the brand voice guardrails for a workspace.
 *
 * @param workspaceId  The workspace to load guardrails for
 * @param text         The generated text to check
 * @returns            { passed, violations, brandVoice }
 */
export async function enforceBrandVoice(
  workspaceId: string,
  text: string
): Promise<EnforcementResult> {
  const brandVoice = await getBrandVoiceForWorkspace(workspaceId)

  if (brandVoice.forbiddenPhrases.length === 0) {
    return { passed: true, violations: [], brandVoice }
  }

  const lowerText = text.toLowerCase()
  const violations = brandVoice.forbiddenPhrases.filter((phrase) =>
    lowerText.includes(phrase.toLowerCase())
  )

  return {
    passed: violations.length === 0,
    violations,
    brandVoice,
  }
}
