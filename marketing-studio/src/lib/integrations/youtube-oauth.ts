/**
 * YouTube OAuth 2.0 Integration (P21)
 *
 * Handles the OAuth flow for YouTube channel access:
 *   1. Generate authorization URL with required scopes
 *   2. Exchange authorization code for access/refresh tokens
 *   3. Refresh expired access tokens
 *   4. Fetch channel info for display
 *
 * Required env vars:
 *   - GOOGLE_CLIENT_ID (same as NextAuth Google provider)
 *   - GOOGLE_CLIENT_SECRET
 *   - NEXTAUTH_URL (for callback URL construction)
 */

import { prisma } from '@/lib/db'
import { safeEncrypt, safeDecrypt } from '@/lib/encryption'

const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
]

const CALLBACK_PATH = '/api/studio/youtube/callback'

function getCallbackUrl(): string {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3003'
  return `${base}${CALLBACK_PATH}`
}

function getClientCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required for YouTube OAuth')
  }
  return { clientId, clientSecret }
}

/**
 * Generate the YouTube OAuth authorization URL.
 */
export function getYouTubeAuthUrl(state: string): string {
  const { clientId } = getClientCredentials()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getCallbackUrl(),
    response_type: 'code',
    scope: YOUTUBE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

/**
 * Exchange an authorization code for tokens.
 */
export async function exchangeYouTubeCode(code: string): Promise<{
  accessToken: string
  refreshToken: string | null
  expiresIn: number
}> {
  const { clientId, clientSecret } = getClientCredentials()

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getCallbackUrl(),
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Token exchange failed: ${text}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresIn: data.expires_in ?? 3600,
  }
}

/**
 * Refresh an expired YouTube access token.
 */
export async function refreshYouTubeToken(refreshToken: string): Promise<{
  accessToken: string
  expiresIn: number
}> {
  const { clientId, clientSecret } = getClientCredentials()

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error('Token refresh failed')
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? 3600,
  }
}

/**
 * Fetch the authenticated user's YouTube channel info.
 */
export async function fetchYouTubeChannelInfo(accessToken: string): Promise<{
  channelId: string
  channelName: string
  channelUrl: string
  thumbnailUrl: string | null
}> {
  const response = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch YouTube channel info')
  }

  const data = await response.json()
  const channel = data.items?.[0]

  if (!channel) {
    throw new Error('No YouTube channel found for this account')
  }

  return {
    channelId: channel.id,
    channelName: channel.snippet.title,
    channelUrl: `https://youtube.com/channel/${channel.id}`,
    thumbnailUrl: channel.snippet.thumbnails?.default?.url ?? null,
  }
}

/**
 * Store YouTube OAuth tokens in the database.
 */
export async function storeYouTubeTokens(params: {
  workspaceId: string
  userId: string
  accessToken: string
  refreshToken: string | null
  expiresIn: number
  channelId: string
  channelName: string
  channelUrl: string
}): Promise<void> {
  const encryptedAccess = safeEncrypt(params.accessToken)
  const encryptedRefresh = params.refreshToken ? safeEncrypt(params.refreshToken) : null

  if (!encryptedAccess) {
    throw new Error('Failed to encrypt YouTube access token')
  }

  await prisma.studioIntegration.upsert({
    where: {
      workspaceId_type: { workspaceId: params.workspaceId, type: 'YOUTUBE' },
    },
    create: {
      workspaceId: params.workspaceId,
      type: 'YOUTUBE',
      status: 'CONNECTED',
      accessTokenEncrypted: encryptedAccess,
      refreshTokenEncrypted: encryptedRefresh,
      tokenExpiresAt: new Date(Date.now() + params.expiresIn * 1000),
      scopesGranted: YOUTUBE_SCOPES,
      scopesRequired: YOUTUBE_SCOPES,
      externalId: params.channelId,
      externalName: params.channelName,
      externalUrl: params.channelUrl,
      connectedBy: params.userId,
      lastTestedAt: new Date(),
      lastTestResult: 'success',
    },
    update: {
      status: 'CONNECTED',
      accessTokenEncrypted: encryptedAccess,
      refreshTokenEncrypted: encryptedRefresh,
      tokenExpiresAt: new Date(Date.now() + params.expiresIn * 1000),
      scopesGranted: YOUTUBE_SCOPES,
      externalId: params.channelId,
      externalName: params.channelName,
      externalUrl: params.channelUrl,
      connectedBy: params.userId,
      revokedAt: null,
      revokedBy: null,
      revokeReason: null,
      errorCount: 0,
      lastTestedAt: new Date(),
      lastTestResult: 'success',
    },
  })

  console.log(`[YOUTUBE:OAUTH] Tokens stored for workspace=${params.workspaceId} channel=${params.channelName}`)
}

/**
 * Get a valid YouTube access token, refreshing if expired.
 */
export async function getYouTubeAccessToken(workspaceId: string): Promise<string> {
  const integration = await prisma.studioIntegration.findUnique({
    where: { workspaceId_type: { workspaceId, type: 'YOUTUBE' } },
    select: {
      accessTokenEncrypted: true,
      refreshTokenEncrypted: true,
      tokenExpiresAt: true,
      status: true,
    },
  })

  if (!integration || integration.status !== 'CONNECTED' || !integration.accessTokenEncrypted) {
    throw new Error('YouTube not connected')
  }

  // Check if token is still valid (with 5-minute buffer)
  const isExpired = integration.tokenExpiresAt
    ? integration.tokenExpiresAt.getTime() < Date.now() + 5 * 60 * 1000
    : true

  if (!isExpired) {
    const token = safeDecrypt(integration.accessTokenEncrypted)
    if (token) return token
  }

  // Refresh the token
  if (!integration.refreshTokenEncrypted) {
    throw new Error('YouTube refresh token not available — reconnect required')
  }

  const refreshToken = safeDecrypt(integration.refreshTokenEncrypted)
  if (!refreshToken) {
    throw new Error('Failed to decrypt YouTube refresh token')
  }

  const refreshed = await refreshYouTubeToken(refreshToken)

  // Update stored access token
  const encryptedNew = safeEncrypt(refreshed.accessToken)
  if (encryptedNew) {
    await prisma.studioIntegration.update({
      where: { workspaceId_type: { workspaceId, type: 'YOUTUBE' } },
      data: {
        accessTokenEncrypted: encryptedNew,
        tokenExpiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
      },
    })
  }

  return refreshed.accessToken
}
