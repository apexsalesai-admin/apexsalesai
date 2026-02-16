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
    console.error(`[API:channels/callback/x] ${code}:`, detail || '')
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

    // Step 3: Verify state and extract code_verifier
    let state: { userId: string; platform: string; ts: number; code_verifier: string }
    try {
      state = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
    } catch {
      return fail('invalid_state', 'Could not decode state parameter')
    }

    if (state.userId !== session.user.id) {
      return fail('state_mismatch', 'User ID does not match session')
    }
    if (state.platform !== 'x') {
      return fail('state_mismatch', `Expected platform=x, got ${state.platform}`)
    }

    const stateAge = Date.now() - state.ts
    if (stateAge > 600_000) {
      return fail('state_expired', `State is ${Math.round(stateAge / 1000)}s old (max 600s)`)
    }

    if (!state.code_verifier) {
      return fail('missing_pkce', 'State parameter missing code_verifier for PKCE')
    }

    // Step 4: Exchange code for tokens with PKCE code_verifier
    const clientId = process.env.X_CLIENT_ID
    const clientSecret = process.env.X_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return fail('config_missing', 'X_CLIENT_ID or X_CLIENT_SECRET not set')
    }

    const redirectUri = `${baseUrl}/api/studio/channels/callback/x`
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const tokenRes = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: state.code_verifier,
      }),
    })

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text()
      console.error('[API:channels/callback/x] Token exchange body:', errBody)
      return fail('token_exchange_failed', `X returned ${tokenRes.status}: ${errBody.slice(0, 200)}`)
    }

    const tokenData = await tokenRes.json()
    const { access_token, refresh_token, expires_in } = tokenData

    if (!access_token) {
      return fail('no_access_token', 'X response did not include access_token')
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

    // Step 6: Validate — get user info
    let xUserId = ''
    let xUsername = 'X'
    let xAvatar: string | null = null
    try {
      const userRes = await fetch('https://api.x.com/2/users/me?user.fields=profile_image_url', {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      if (!userRes.ok) {
        const body = await userRes.text()
        return fail('token_validation_failed', `X users/me ${userRes.status}: ${body.slice(0, 200)}`)
      }
      const userData = await userRes.json()
      xUserId = userData.data?.id || 'unknown'
      xUsername = userData.data?.username || 'X'
      xAvatar = userData.data?.profile_image_url || null
    } catch (valErr) {
      return fail('token_validation_failed', valErr instanceof Error ? valErr.message : 'Unknown validation error')
    }

    // Step 7: Upsert channel
    const platform = PLATFORM_REGISTRY.x
    const expiresAt = new Date(Date.now() + (expires_in || 7200) * 1000)
    const accountId = xUserId || 'unknown'

    try {
      await prisma.publishingChannel.upsert({
        where: {
          userId_platform_accountId: {
            userId: session.user.id,
            platform: 'x',
            accountId,
          },
        },
        update: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: expiresAt,
          displayName: `@${xUsername}`,
          accountName: xUsername,
          accountAvatar: xAvatar,
          scopes: platform.oauth?.scopes || [],
          isActive: true,
          lastError: null,
          connectedAt: new Date(),
        },
        create: {
          userId: session.user.id,
          platform: 'x',
          tier: platform.tier,
          displayName: `@${xUsername}`,
          accountId,
          accountName: xUsername,
          accountAvatar: xAvatar,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: expiresAt,
          scopes: platform.oauth?.scopes || [],
          metadata: { xUserId },
        },
      })
    } catch (dbErr) {
      console.error('[API:channels/callback/x] DB error:', dbErr)
      return fail('db_save_failed', dbErr instanceof Error ? dbErr.message.slice(0, 200) : 'Database save failed')
    }

    return NextResponse.redirect(`${baseUrl}/studio/integrations?connected=x`)
  } catch (error) {
    console.error('[API:channels/callback/x] Unhandled error:', error)
    return fail('callback_failed', error instanceof Error ? error.message.slice(0, 200) : 'Unknown error')
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
