import { decrypt } from '@/lib/encryption'

export interface XPublishParams {
  accessToken: string
  text: string
  imageUrl?: string
}

export interface XPublishResult {
  success: boolean
  tweetId?: string
  postUrl?: string
  threadIds?: string[]
  error?: string
  errorType?: 'TOKEN' | 'SCOPE' | 'PAYLOAD' | 'RATE_LIMIT' | 'UPSTREAM' | 'UNKNOWN'
}

/**
 * Split text into thread parts respecting word boundaries.
 * Each part stays within the 280-character X limit.
 */
function splitIntoThread(text: string): string[] {
  if (text.length <= 280) return [text]

  const parts: string[] = []
  const sentences = text.split(/(?<=[.!?])\s+/)
  let current = ''

  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 <= 280) {
      current = current ? `${current} ${sentence}` : sentence
    } else {
      if (current) parts.push(current)
      // If a single sentence exceeds 280, split by words
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

export async function publishToX(params: XPublishParams): Promise<XPublishResult> {
  const token = decrypt(params.accessToken)
  const parts = splitIntoThread(params.text)

  try {
    const tweetIds: string[] = []
    let lastTweetId: string | undefined

    for (const part of parts) {
      const payload: Record<string, unknown> = { text: part }
      if (lastTweetId) {
        payload.reply = { in_reply_to_tweet_id: lastTweetId }
      }

      const response = await fetch('https://api.x.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        let errorType: XPublishResult['errorType'] = 'UNKNOWN'

        if (response.status === 401) errorType = 'TOKEN'
        else if (response.status === 403) errorType = 'SCOPE'
        else if (response.status === 400) errorType = 'PAYLOAD'
        else if (response.status === 429) errorType = 'RATE_LIMIT'
        else if (response.status >= 500) errorType = 'UPSTREAM'

        return {
          success: false,
          error: `X API ${response.status}: ${errorBody}`,
          errorType,
          threadIds: tweetIds.length > 0 ? tweetIds : undefined,
        }
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
      tweetId: firstTweetId,
      postUrl: firstTweetId ? `https://x.com/i/status/${firstTweetId}` : undefined,
      threadIds: tweetIds.length > 1 ? tweetIds : undefined,
    }
  } catch (err) {
    return {
      success: false,
      error: `Network error: ${err instanceof Error ? err.message : 'Unknown'}`,
      errorType: 'UNKNOWN',
    }
  }
}

export async function validateXToken(encryptedToken: string): Promise<{
  valid: boolean
  userId?: string
  username?: string
  avatar?: string
  error?: string
}> {
  try {
    const token = decrypt(encryptedToken)
    const res = await fetch('https://api.x.com/2/users/me?user.fields=profile_image_url', {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      return { valid: false, error: `Token validation failed: ${res.status}` }
    }

    const data = await res.json()
    return {
      valid: true,
      userId: data.data?.id,
      username: data.data?.username,
      avatar: data.data?.profile_image_url,
    }
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function refreshXToken(encryptedRefreshToken: string): Promise<{
  accessToken: string
  refreshToken?: string
  expiresIn: number
} | null> {
  try {
    const refreshToken = decrypt(encryptedRefreshToken)
    const clientId = process.env.X_CLIENT_ID || ''
    const clientSecret = process.env.X_CLIENT_SECRET || ''
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const res = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (!res.ok) return null
    const data = await res.json()

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || undefined,
      expiresIn: data.expires_in || 7200,
    }
  } catch {
    return null
  }
}
