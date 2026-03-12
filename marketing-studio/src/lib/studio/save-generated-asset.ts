import { type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

interface SaveAssetParams {
  title: string
  body: string
  /**
   * Prisma ContentType enum: POST, VIDEO, ARTICLE, THREAD, IMAGE.
   */
  contentType: 'POST' | 'VIDEO' | 'ARTICLE' | 'THREAD' | 'IMAGE'
  aiGenerated?: boolean
  aiTopic?: string
  aiTone?: string
  channels?: string[]
  mediaUrls?: string[]
}

interface SaveResult {
  success: boolean
  contentId?: string
  error?: string
}

/**
 * Save generated content to the content API.
 *
 * The content API requires:
 * - title (string, required)
 * - body (string, required)
 * - channels (string[], required, non-empty; defaults to ['LINKEDIN'])
 * - contentType (string, must map to Prisma ContentType enum)
 */
export async function saveGeneratedAsset(params: SaveAssetParams): Promise<SaveResult> {
  try {
    const res = await fetch('/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: (params.title || 'Untitled').substring(0, 200),
        body: params.body,
        contentType: params.contentType,
        channels: params.channels && params.channels.length > 0
          ? params.channels
          : ['LINKEDIN'],
        aiGenerated: params.aiGenerated ?? true,
        aiTopic: params.aiTopic || params.title,
        aiTone: params.aiTone || 'PROFESSIONAL',
        ...(params.mediaUrls && params.mediaUrls.length > 0 && { mediaUrls: params.mediaUrls }),
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      return {
        success: false,
        error: errData.error || `Save failed (${res.status})`,
      }
    }

    const data = await res.json()
    return {
      success: true,
      contentId: data.data?.id,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Save failed',
    }
  }
}

/**
 * After saving, redirect to content detail page or Library.
 */
export function redirectAfterSave(router: AppRouterInstance, contentId?: string) {
  if (contentId) {
    router.push(`/studio/content/${contentId}`)
  } else {
    router.push('/studio/library')
  }
}
