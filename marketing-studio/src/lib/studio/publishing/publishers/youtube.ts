import { decrypt } from '@/lib/encryption'

export interface YouTubePublishParams {
  accessToken: string
  title: string
  description: string
  tags?: string[]
  privacyStatus?: 'private' | 'unlisted' | 'public'
  categoryId?: string
}

export interface YouTubePublishResult {
  success: boolean
  videoId?: string
  postUrl?: string
  error?: string
  errorType?: 'TOKEN' | 'SCOPE' | 'PAYLOAD' | 'RATE_LIMIT' | 'QUOTA' | 'UPSTREAM' | 'UNKNOWN'
}

export async function publishToYouTube(params: YouTubePublishParams): Promise<YouTubePublishResult> {
  const token = decrypt(params.accessToken)

  const metadata = {
    snippet: {
      title: params.title.slice(0, 100),
      description: params.description.slice(0, 5000),
      tags: params.tags?.slice(0, 500) || [],
      categoryId: params.categoryId || '22', // People & Blogs
    },
    status: {
      privacyStatus: params.privacyStatus || 'private',
      selfDeclaredMadeForKids: false,
    },
  }

  try {
    // YouTube Data API v3 — videos.insert (metadata only, no video upload)
    // For text-based publishing, we create a video metadata entry
    // Full video upload would require resumable upload protocol
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/videos?part=snippet,status',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      }
    )

    if (response.ok) {
      const data = await response.json()
      return {
        success: true,
        videoId: data.id,
        postUrl: `https://www.youtube.com/watch?v=${data.id}`,
      }
    }

    const errorBody = await response.text()
    let errorType: YouTubePublishResult['errorType'] = 'UNKNOWN'

    if (response.status === 401) errorType = 'TOKEN'
    else if (response.status === 403) {
      errorType = errorBody.includes('quotaExceeded') ? 'QUOTA' : 'SCOPE'
    }
    else if (response.status === 400) errorType = 'PAYLOAD'
    else if (response.status === 429) errorType = 'RATE_LIMIT'
    else if (response.status >= 500) errorType = 'UPSTREAM'

    return {
      success: false,
      error: `YouTube API ${response.status}: ${errorBody}`,
      errorType,
    }
  } catch (err) {
    return {
      success: false,
      error: `Network error: ${err instanceof Error ? err.message : 'Unknown'}`,
      errorType: 'UNKNOWN',
    }
  }
}

export async function validateYouTubeToken(encryptedToken: string): Promise<{
  valid: boolean
  channelId?: string
  channelTitle?: string
  avatar?: string
  error?: string
}> {
  try {
    const token = decrypt(encryptedToken)

    // Verify token with Google userinfo
    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!userinfoRes.ok) {
      return { valid: false, error: `Token validation failed: ${userinfoRes.status}` }
    }

    // Get YouTube channel info
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!channelRes.ok) {
      return { valid: false, error: `Channel lookup failed: ${channelRes.status}` }
    }

    const channelData = await channelRes.json()
    const channel = channelData.items?.[0]

    return {
      valid: true,
      channelId: channel?.id,
      channelTitle: channel?.snippet?.title,
      avatar: channel?.snippet?.thumbnails?.default?.url,
    }
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function refreshYouTubeToken(encryptedRefreshToken: string): Promise<{
  accessToken: string
  refreshToken?: string
  expiresIn: number
} | null> {
  try {
    const refreshToken = decrypt(encryptedRefreshToken)
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.YOUTUBE_CLIENT_ID || '',
        client_secret: process.env.YOUTUBE_CLIENT_SECRET || '',
      }),
    })

    if (!res.ok) return null
    const data = await res.json()

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || undefined,
      expiresIn: data.expires_in || 3600,
    }
  } catch {
    return null
  }
}
