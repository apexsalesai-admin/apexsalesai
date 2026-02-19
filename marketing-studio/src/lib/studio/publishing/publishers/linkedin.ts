import { decrypt } from '@/lib/encryption'

export interface LinkedInPublishParams {
  accessToken: string
  personUrn: string
  text: string
  imageUrl?: string
  videoUrl?: string
}

export interface LinkedInPublishResult {
  success: boolean
  postUrl?: string
  postId?: string
  error?: string
  errorType?: 'TOKEN' | 'SCOPE' | 'PAYLOAD' | 'RATE_LIMIT' | 'UPSTREAM' | 'UNKNOWN'
}

export async function publishToLinkedIn(params: LinkedInPublishParams): Promise<LinkedInPublishResult> {
  const token = decrypt(params.accessToken)

  const payload: Record<string, unknown> = {
    author: params.personUrn,
    lifecycleState: 'PUBLISHED',
    visibility: 'PUBLIC',
    commentary: params.text,
    distribution: {
      feedDistribution: 'MAIN_FEED',
    },
  }

  try {
    const response = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202601',
      },
      body: JSON.stringify(payload),
    })

    if (response.status === 201) {
      const postId = response.headers.get('x-restli-id') || ''
      return {
        success: true,
        postId,
        postUrl: postId ? `https://www.linkedin.com/feed/update/${postId}` : undefined,
      }
    }

    const errorBody = await response.text()
    let errorType: LinkedInPublishResult['errorType'] = 'UNKNOWN'

    if (response.status === 401) errorType = 'TOKEN'
    else if (response.status === 403) errorType = 'SCOPE'
    else if (response.status === 400) errorType = 'PAYLOAD'
    else if (response.status === 429) errorType = 'RATE_LIMIT'
    else if (response.status >= 500) errorType = 'UPSTREAM'

    return {
      success: false,
      error: `LinkedIn API ${response.status}: ${errorBody}`,
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

export async function validateLinkedInToken(encryptedToken: string): Promise<{
  valid: boolean
  personUrn?: string
  name?: string
  avatar?: string
  error?: string
}> {
  try {
    const token = decrypt(encryptedToken)
    const res = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      return { valid: false, error: `Token validation failed: ${res.status}` }
    }

    const data = await res.json()
    return {
      valid: true,
      personUrn: `urn:li:person:${data.sub}`,
      name: data.name,
      avatar: data.picture,
    }
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function refreshLinkedInToken(encryptedRefreshToken: string): Promise<{
  accessToken: string
  refreshToken?: string
  expiresIn: number
} | null> {
  try {
    const refreshToken = decrypt(encryptedRefreshToken)
    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.LINKEDIN_CLIENT_ID || '',
        client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
      }),
    })

    if (!res.ok) return null
    const data = await res.json()

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || undefined,
      expiresIn: data.expires_in || 5184000,
    }
  } catch {
    return null
  }
}
