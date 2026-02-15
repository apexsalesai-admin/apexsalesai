import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/encryption'
import { PLATFORM_REGISTRY } from '@/lib/studio/publishing/platform-registry'
import { validateLinkedInToken } from '@/lib/studio/publishing/publishers/linkedin'

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || ''

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.redirect(`${baseUrl}/studio/integrations?error=unauthorized`)
    }

    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const stateParam = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    if (error) {
      console.error('[API:channels/callback/linkedin] OAuth error:', error)
      return NextResponse.redirect(`${baseUrl}/studio/integrations?error=oauth_denied`)
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(`${baseUrl}/studio/integrations?error=missing_params`)
    }

    // Verify state
    let state: { userId: string; platform: string; ts: number }
    try {
      state = JSON.parse(Buffer.from(stateParam, 'base64url').toString())
    } catch {
      return NextResponse.redirect(`${baseUrl}/studio/integrations?error=invalid_state`)
    }

    if (state.userId !== session.user.id || state.platform !== 'linkedin') {
      return NextResponse.redirect(`${baseUrl}/studio/integrations?error=state_mismatch`)
    }

    // Check state isn't too old (10 min)
    if (Date.now() - state.ts > 600_000) {
      return NextResponse.redirect(`${baseUrl}/studio/integrations?error=state_expired`)
    }

    // Exchange authorization code for tokens
    const redirectUri = `${baseUrl}/api/studio/channels/callback/linkedin`
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: process.env.LINKEDIN_CLIENT_ID || '',
        client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
      }),
    })

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text()
      console.error('[API:channels/callback/linkedin] Token exchange failed:', errBody)
      return NextResponse.redirect(`${baseUrl}/studio/integrations?error=token_exchange_failed`)
    }

    const tokenData = await tokenRes.json()
    const { access_token, refresh_token, expires_in } = tokenData

    if (!access_token) {
      return NextResponse.redirect(`${baseUrl}/studio/integrations?error=no_access_token`)
    }

    // Encrypt tokens
    const encryptedAccessToken = encrypt(access_token)
    const encryptedRefreshToken = refresh_token ? encrypt(refresh_token) : null

    // Validate token and get user info
    const validation = await validateLinkedInToken(encryptedAccessToken)
    if (!validation.valid) {
      console.error('[API:channels/callback/linkedin] Token validation failed:', validation.error)
      return NextResponse.redirect(`${baseUrl}/studio/integrations?error=token_validation_failed`)
    }

    const platform = PLATFORM_REGISTRY.linkedin
    const expiresAt = new Date(Date.now() + (expires_in || 5184000) * 1000)

    // Upsert the channel — update if same user+platform+account exists
    const accountId = validation.personUrn || 'unknown'
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
        displayName: validation.name || 'LinkedIn',
        accountName: validation.name || undefined,
        accountAvatar: validation.avatar || undefined,
        scopes: platform.oauth?.scopes || [],
        isActive: true,
        lastError: null,
        connectedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        platform: 'linkedin',
        tier: platform.tier,
        displayName: validation.name || 'LinkedIn',
        accountId,
        accountName: validation.name || null,
        accountAvatar: validation.avatar || null,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: expiresAt,
        scopes: platform.oauth?.scopes || [],
        metadata: { personUrn: validation.personUrn },
      },
    })

    return NextResponse.redirect(`${baseUrl}/studio/integrations?connected=linkedin`)
  } catch (error) {
    console.error('[API:channels/callback/linkedin] error:', error)
    return NextResponse.redirect(`${baseUrl}/studio/integrations?error=callback_failed`)
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
