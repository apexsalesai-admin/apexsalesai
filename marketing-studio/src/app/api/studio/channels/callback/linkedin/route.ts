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
    console.error(`[API:channels/callback/linkedin] ${code}:`, detail || '')
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
    if (state.platform !== 'linkedin') {
      return fail('state_mismatch', `Expected platform=linkedin, got ${state.platform}`)
    }

    // Check state isn't too old (10 min)
    const stateAge = Date.now() - state.ts
    if (stateAge > 600_000) {
      return fail('state_expired', `State is ${Math.round(stateAge / 1000)}s old (max 600s)`)
    }

    // Step 4: Exchange authorization code for tokens
    const clientId = process.env.LINKEDIN_CLIENT_ID
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return fail('config_missing', 'LINKEDIN_CLIENT_ID or LINKEDIN_CLIENT_SECRET not set')
    }

    const redirectUri = `${baseUrl}/api/studio/channels/callback/linkedin`
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
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
      console.error('[API:channels/callback/linkedin] Token exchange body:', errBody)
      return fail('token_exchange_failed', `LinkedIn returned ${tokenRes.status}: ${errBody.slice(0, 200)}`)
    }

    const tokenData = await tokenRes.json()
    const { access_token, refresh_token, expires_in } = tokenData

    if (!access_token) {
      return fail('no_access_token', 'LinkedIn response did not include access_token')
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

    // Step 6: Validate token — call LinkedIn userinfo with plaintext token
    let personUrn = ''
    let userName = 'LinkedIn'
    let userAvatar: string | null = null
    try {
      const userinfoRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` },
      })
      if (!userinfoRes.ok) {
        const body = await userinfoRes.text()
        return fail('token_validation_failed', `LinkedIn userinfo ${userinfoRes.status}: ${body.slice(0, 200)}`)
      }
      const userinfo = await userinfoRes.json()
      personUrn = `urn:li:person:${userinfo.sub}`
      userName = userinfo.name || 'LinkedIn'
      userAvatar = userinfo.picture || null
    } catch (valErr) {
      return fail('token_validation_failed', valErr instanceof Error ? valErr.message : 'Unknown validation error')
    }

    // Step 7: Upsert channel
    const platform = PLATFORM_REGISTRY.linkedin
    const expiresAt = new Date(Date.now() + (expires_in || 5184000) * 1000)
    const accountId = personUrn || 'unknown'

    try {
      await prisma.publishingChannel.upsert({
        where: {
          userId_platform_accountId: {
            userId: session.user.id,
            platform: 'linkedin',
            accountId,
          },
        },
        update: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: expiresAt,
          displayName: userName,
          accountName: userName,
          accountAvatar: userAvatar,
          scopes: platform.oauth?.scopes || [],
          isActive: true,
          lastError: null,
          connectedAt: new Date(),
        },
        create: {
          userId: session.user.id,
          platform: 'linkedin',
          tier: platform.tier,
          displayName: userName,
          accountId,
          accountName: userName,
          accountAvatar: userAvatar,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: expiresAt,
          scopes: platform.oauth?.scopes || [],
          metadata: { personUrn },
        },
      })
    } catch (dbErr) {
      console.error('[API:channels/callback/linkedin] DB error:', dbErr)
      return fail('db_save_failed', dbErr instanceof Error ? dbErr.message.slice(0, 200) : 'Database save failed')
    }

    return NextResponse.redirect(`${baseUrl}/studio/integrations?connected=linkedin`)
  } catch (error) {
    console.error('[API:channels/callback/linkedin] Unhandled error:', error)
    return fail('callback_failed', error instanceof Error ? error.message.slice(0, 200) : 'Unknown error')
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
