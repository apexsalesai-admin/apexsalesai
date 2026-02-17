/**
 * Platform Publishing Connectors
 *
 * Handles publishing content to various social platforms.
 * Each connector implements the same interface for consistency.
 */

import { StudioIntegrationType } from '@prisma/client'

export interface PublishPayload {
  title: string
  body: string
  hashtags?: string[]
  callToAction?: string
  mediaUrls?: string[]
}

export interface PublishResult {
  success: boolean
  externalPostId?: string
  permalink?: string
  platformResponse: Record<string, unknown>
  error?: string
}

export interface PlatformConnector {
  platform: StudioIntegrationType
  publish(payload: PublishPayload, accessToken?: string): Promise<PublishResult>
  verify?(externalPostId: string, accessToken?: string): Promise<boolean>
}

/**
 * LinkedIn Connector
 * Posts to LinkedIn using the Marketing API
 */
export const linkedinConnector: PlatformConnector = {
  platform: 'LINKEDIN',

  async publish(payload: PublishPayload, accessToken?: string): Promise<PublishResult> {
    const startTime = Date.now()

    console.log('[Connector:LinkedIn] Publishing content', {
      titleLength: payload.title.length,
      bodyLength: payload.body.length,
      hasAccessToken: !!accessToken,
    })

    // If no access token, simulate successful publish for development
    if (!accessToken) {
      console.log('[Connector:LinkedIn] No access token - simulating publish')
      const simulatedPostId = `li_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

      return {
        success: true,
        externalPostId: simulatedPostId,
        permalink: `https://linkedin.com/feed/update/${simulatedPostId}`,
        platformResponse: {
          simulated: true,
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        },
      }
    }

    // Production: Call LinkedIn Marketing API
    try {
      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: 'urn:li:person:me',
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: `${payload.title}\n\n${payload.body}${payload.hashtags?.length ? '\n\n' + payload.hashtags.join(' ') : ''}`,
              },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`LinkedIn API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      return {
        success: true,
        externalPostId: data.id,
        permalink: `https://linkedin.com/feed/update/${data.id}`,
        platformResponse: {
          ...data,
          durationMs: Date.now() - startTime,
        },
      }
    } catch (error) {
      console.error('[Connector:LinkedIn] Publish failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        platformResponse: {
          error: true,
          durationMs: Date.now() - startTime,
        },
      }
    }
  },
}

/**
 * YouTube Connector
 * Uploads videos or creates community posts
 */
export const youtubeConnector: PlatformConnector = {
  platform: 'YOUTUBE',

  async publish(payload: PublishPayload, accessToken?: string): Promise<PublishResult> {
    const startTime = Date.now()

    console.log('[Connector:YouTube] Publishing content', {
      titleLength: payload.title.length,
      bodyLength: payload.body.length,
      hasAccessToken: !!accessToken,
      hasMedia: !!payload.mediaUrls?.length,
    })

    // If no access token, simulate successful publish for development
    if (!accessToken) {
      console.log('[Connector:YouTube] No access token - simulating publish')
      const simulatedVideoId = `yt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

      return {
        success: true,
        externalPostId: simulatedVideoId,
        permalink: `https://youtube.com/watch?v=${simulatedVideoId}`,
        platformResponse: {
          simulated: true,
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        },
      }
    }

    // Production: For community posts (text-only)
    try {
      // Note: YouTube Data API for community posts requires specific scopes
      // This is a simplified implementation
      const response = await fetch('https://www.googleapis.com/youtube/v3/activities', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snippet: {
            description: `${payload.title}\n\n${payload.body}`,
          },
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`YouTube API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()

      return {
        success: true,
        externalPostId: data.id,
        permalink: `https://youtube.com/post/${data.id}`,
        platformResponse: {
          ...data,
          durationMs: Date.now() - startTime,
        },
      }
    } catch (error) {
      console.error('[Connector:YouTube] Publish failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        platformResponse: {
          error: true,
          durationMs: Date.now() - startTime,
        },
      }
    }
  },
}

/**
 * Reddit Connector
 * Posts to subreddits via Reddit API
 */
export const redditConnector: PlatformConnector = {
  platform: 'FACEBOOK', // Using FACEBOOK as proxy since REDDIT isn't in enum

  async publish(payload: PublishPayload, accessToken?: string): Promise<PublishResult> {
    const startTime = Date.now()

    console.log('[Connector:Reddit] Publishing content', {
      titleLength: payload.title.length,
      bodyLength: payload.body.length,
      hasAccessToken: !!accessToken,
    })

    // If no access token, simulate successful publish for development
    if (!accessToken) {
      console.log('[Connector:Reddit] No access token - simulating publish')
      const simulatedPostId = `t3_${Math.random().toString(36).slice(2, 9)}`

      return {
        success: true,
        externalPostId: simulatedPostId,
        permalink: `https://reddit.com/r/marketing/comments/${simulatedPostId}`,
        platformResponse: {
          simulated: true,
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        },
      }
    }

    // Production: Submit to Reddit
    try {
      const response = await fetch('https://oauth.reddit.com/api/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          api_type: 'json',
          kind: 'self',
          sr: 'marketing', // Default subreddit
          title: payload.title,
          text: payload.body,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Reddit API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const postId = data.json?.data?.id

      return {
        success: true,
        externalPostId: postId,
        permalink: data.json?.data?.url,
        platformResponse: {
          ...data,
          durationMs: Date.now() - startTime,
        },
      }
    } catch (error) {
      console.error('[Connector:Reddit] Publish failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        platformResponse: {
          error: true,
          durationMs: Date.now() - startTime,
        },
      }
    }
  },
}

/**
 * X/Twitter Connector
 * Posts tweets via X API v2, with automatic thread support for long content
 */
export const xConnector: PlatformConnector = {
  platform: 'X_TWITTER',

  async publish(payload: PublishPayload, accessToken?: string): Promise<PublishResult> {
    const startTime = Date.now()

    console.log('[Connector:X] Publishing content', {
      titleLength: payload.title.length,
      bodyLength: payload.body.length,
      hasAccessToken: !!accessToken,
    })

    // If no access token, simulate successful publish for development
    if (!accessToken) {
      console.log('[Connector:X] No access token - simulating publish')
      const simulatedTweetId = `x_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

      return {
        success: true,
        externalPostId: simulatedTweetId,
        permalink: `https://x.com/i/status/${simulatedTweetId}`,
        platformResponse: {
          simulated: true,
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        },
      }
    }

    // Production: Post to X API v2
    try {
      const fullText = `${payload.title}\n\n${payload.body}${payload.hashtags?.length ? '\n\n' + payload.hashtags.join(' ') : ''}`
      const parts = splitXThread(fullText)
      const tweetIds: string[] = []
      let lastTweetId: string | undefined

      for (const part of parts) {
        const tweetPayload: Record<string, unknown> = { text: part }
        if (lastTweetId) {
          tweetPayload.reply = { in_reply_to_tweet_id: lastTweetId }
        }

        const response = await fetch('https://api.x.com/2/tweets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tweetPayload),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`X API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        const tweetId = data.data?.id
        if (tweetId) {
          tweetIds.push(tweetId)
          lastTweetId = tweetId
        }
      }

      const firstTweetId = tweetIds[0]
      return {
        success: true,
        externalPostId: firstTweetId,
        permalink: firstTweetId ? `https://x.com/i/status/${firstTweetId}` : undefined,
        platformResponse: {
          tweetIds,
          isThread: tweetIds.length > 1,
          durationMs: Date.now() - startTime,
        },
      }
    } catch (error) {
      console.error('[Connector:X] Publish failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        platformResponse: {
          error: true,
          durationMs: Date.now() - startTime,
        },
      }
    }
  },
}

/** Split text into ≤280 char parts respecting sentence/word boundaries */
function splitXThread(text: string): string[] {
  if (text.length <= 280) return [text]

  const parts: string[] = []
  const sentences = text.split(/(?<=[.!?])\s+/)
  let current = ''

  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 <= 280) {
      current = current ? `${current} ${sentence}` : sentence
    } else {
      if (current) parts.push(current)
      if (sentence.length > 280) {
        const words = sentence.split(/\s+/)
        current = ''
        for (const word of words) {
          if (current.length + word.length + 1 <= 280) {
            current = current ? `${current} ${word}` : word
          } else {
            if (current) parts.push(current)
            current = word
          }
        }
      } else {
        current = sentence
      }
    }
  }
  if (current) parts.push(current)
  return parts
}

/**
 * Get connector for a platform
 */
export function getConnector(platform: string): PlatformConnector | null {
  const normalizedPlatform = platform.toUpperCase()

  switch (normalizedPlatform) {
    case 'LINKEDIN':
      return linkedinConnector
    case 'YOUTUBE':
      return youtubeConnector
    case 'X_TWITTER':
    case 'TWITTER':
    case 'X':
      return xConnector
    case 'REDDIT':
    case 'FACEBOOK': // Fallback for Reddit using FACEBOOK enum
      return redditConnector
    default:
      console.warn(`[Connectors] No connector found for platform: ${platform}`)
      return null
  }
}

/**
 * Publish to a platform with structured logging
 */
export async function publishToPlatform(
  platform: string,
  payload: PublishPayload,
  accessToken?: string
): Promise<PublishResult & { platform: string }> {
  const connector = getConnector(platform)

  if (!connector) {
    return {
      platform,
      success: false,
      error: `Unsupported platform: ${platform}`,
      platformResponse: { unsupported: true },
    }
  }

  const result = await connector.publish(payload, accessToken)

  console.log(`[Connectors] Publish result for ${platform}:`, {
    success: result.success,
    externalPostId: result.externalPostId,
    error: result.error,
  })

  return { platform, ...result }
}
