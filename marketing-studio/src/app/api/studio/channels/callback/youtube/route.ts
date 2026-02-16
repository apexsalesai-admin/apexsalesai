import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/encryption'
import { PLATFORM_REGISTRY } from '@/lib/studio/publishing/platform-registry'

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || ''

  function fail(code: string, detail?: string) {
    const params = new URLSearchParams({ error: code })
    if (detail) params.set('detail', detail)
    console.error(`[API:channels/callback/youtube] ${code}:`, detail || '')
    return NextResponse.redirect(`${baseUrl}/studio/integrations?${params.toString()}`)
  }

  try {
    // Step 1: Session check
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return fail('unauthorized', 'No active session found. Please log in and try again.')
    }

    // Step 2: Parse OAuth params
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const stateParam = url.searchParams.get('state')
    const error = url.searchParams.get('error')
    const errorDescription = url.searchParams.get('error_description')

    if (error) {
      return fail('oauth_denied', errorDescription || error)
    }

    if (!code || !stateParam) {
      return fail('missing_params', `code=${!!code} state=${!!stateParam}`)
    }

    // Step 3: Verify state
    let state: { userId: string; platform: string; ts: number }
    try {
      state = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
    } catch {
      return fail('invalid_state', 'Could not decode state parameter')
    }

    if (state.userId !== session.user.id) {
      return fail('state_mismatch', 'User ID does not match session')
    }
    if (state.platform !== 'youtube') {
      return fail('state_mismatch', `Expected platform=youtube, got ${state.platform}`)
    }

    const stateAge = Date.now() - state.ts
    if (stateAge > 600_000) {
      return fail('state_expired', `State is ${Math.round(stateAge / 1000)}s old (max 600s)`)
    }

    // Step 4: Exchange authorization code for tokens
    const clientId = process.env.YOUTUBE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return fail('config_missing', 'YOUTUBE_CLIENT_ID/GOOGLE_CLIENT_ID or YOUTUBE_CLIENT_SECRET/GOOGLE_CLIENT_SECRET not set')
    }

    const redirectUri = `${baseUrl}/api/studio/channels/callback/youtube`
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text()
      console.error('[API:channels/callback/youtube] Token exchange body:', errBody)
      return fail('token_exchange_failed', `Google returned ${tokenRes.status}: ${errBody.slice(0, 200)}`)
    }

    const tokenData = await tokenRes.json()
    const { access_token, refresh_token, expires_in } = tokenData

    if (!access_token) {
      return fail('no_access_token', 'Google response did not include access_token')
    }

    // Step 5: Encrypt tokens
    let encryptedAccessToken: string
    let encryptedRefreshToken: string | null = null
    try {
      encryptedAccessToken = encrypt(access_token)
      if (refresh_token) encryptedRefreshToken = encrypt(refresh_token)
    } catch (encErr) {
      return fail('encryption_failed', encErr instanceof Error ? encErr.message : 'Unknown encryption error')
    }

    // Step 6: Validate token — get user info and YouTube channel
    let channelId = ''
    let channelTitle = 'YouTube'
    let channelAvatar: string | null = null
    try {
      // Get basic user info
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      if (!userinfoRes.ok) {
        const body = await userinfoRes.text()
        return fail('token_validation_failed', `Google userinfo ${userinfoRes.status}: ${body.slice(0, 200)}`)
      }

      // Get YouTube channel
      const channelRes = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        { headers: { Authorization: `Bearer ${access_token}` } }
      )
      if (channelRes.ok) {
        const channelData = await channelRes.json()
        const channel = channelData.items?.[0]
        if (channel) {
          channelId = channel.id
          channelTitle = channel.snippet?.title || 'YouTube'
          channelAvatar = channel.snippet?.thumbnails?.default?.url || null
        }
      }

      // Fallback to userinfo if no YouTube channel
      if (!channelId) {
        const userinfo = await userinfoRes.json()
        channelId = userinfo.sub || 'unknown'
        channelTitle = userinfo.name || 'YouTube'
        channelAvatar = userinfo.picture || null
      }
    } catch (valErr) {
      return fail('token_validation_failed', valErr instanceof Error ? valErr.message : 'Unknown validation error')
    }

    // Step 7: Upsert channel
    const platform = PLATFORM_REGISTRY.youtube
    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000)
    const accountId = channelId || 'unknown'

    try {
      await prisma.publishingChannel.upsert({
        where: {
          userId_platform_accountId: {
            userId: session.user.id,
            platform: 'youtube',
            accountId,
          },
        },
        update: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: expiresAt,
          displayName: channelTitle,
          accountName: channelTitle,
          accountAvatar: channelAvatar,
          scopes: platform.oauth?.scopes || [],
          isActive: true,
          lastError: null,
          connectedAt: new Date(),
        },
        create: {
          userId: session.user.id,
          platform: 'youtube',
          tier: platform.tier,
          displayName: channelTitle,
          accountId,
          accountName: channelTitle,
          accountAvatar: channelAvatar,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: expiresAt,
          scopes: platform.oauth?.scopes || [],
          metadata: { channelId },
        },
      })
    } catch (dbErr) {
      console.error('[API:channels/callback/youtube] DB error:', dbErr)
      return fail('db_save_failed', dbErr instanceof Error ? dbErr.message.slice(0, 200) : 'Database save failed')
    }

    return NextResponse.redirect(`${baseUrl}/studio/integrations?connected=youtube`)
  } catch (error) {
    console.error('[API:channels/callback/youtube] Unhandled error:', error)
    return fail('callback_failed', error instanceof Error ? error.message.slice(0, 200) : 'Unknown error')
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
