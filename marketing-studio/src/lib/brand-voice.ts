/**
 * Brand Voice Resolver — canonical entry-point
 *
 * Any generation endpoint that needs brand voice context should call
 * getBrandVoiceForWorkspace() rather than hitting Prisma directly.
 * This keeps the mapping logic (DB → app model) in one place.
 */

import { prisma } from '@/lib/db'

export interface BrandVoice {
  brandName: string
  tones: string[]
  industry: string
  industryContext: string
  targetAudience: string
  forbiddenPhrases: string[]
  ctaStyle: string
}

const DEFAULT_BRAND_VOICE: BrandVoice = {
  brandName: '',
  tones: ['professional'],
  industry: '',
  industryContext: '',
  targetAudience: '',
  forbiddenPhrases: [],
  ctaStyle: 'direct',
}

/**
 * Resolve the brand voice for a workspace.
 *
 * Returns a fully-populated BrandVoice object (never null).
 * Falls back to sensible defaults when no guardrails record exists.
 */
export async function getBrandVoiceForWorkspace(
  workspaceId: string
): Promise<BrandVoice> {
  try {
    const record = await prisma.studioBrandGuardrails.findUnique({
      where: { workspaceId },
    })

    if (!record) return { ...DEFAULT_BRAND_VOICE }

    // Decode writingStyle JSON
    let writingStyleData: { brandName?: string; industry?: string; industryContext?: string } = {}
    if (record.writingStyle) {
      try {
        writingStyleData = JSON.parse(record.writingStyle)
      } catch {
        writingStyleData = {}
      }
    }

    // Decode targetAudiences
    let targetAudience = ''
    if (record.targetAudiences) {
      try {
        const audiences =
          typeof record.targetAudiences === 'string'
            ? JSON.parse(record.targetAudiences)
            : record.targetAudiences
        if (typeof audiences === 'string') {
          targetAudience = audiences
        } else if (Array.isArray(audiences) && audiences.length > 0) {
          targetAudience = audiences.join(', ')
        }
      } catch {
        targetAudience = ''
      }
    }

    return {
      brandName: writingStyleData.brandName || '',
      tones: record.voiceTones.length > 0 ? record.voiceTones : ['professional'],
      industry: writingStyleData.industry || '',
      industryContext: writingStyleData.industryContext || '',
      targetAudience,
      forbiddenPhrases: record.doNotSayList || [],
      ctaStyle: record.ctaStyle || 'direct',
    }
  } catch (error) {
    console.error('[BrandVoice] Error resolving brand voice:', error)
    return { ...DEFAULT_BRAND_VOICE }
  }
}
