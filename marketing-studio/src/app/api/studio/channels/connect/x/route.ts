import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import crypto from 'crypto'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Generate PKCE code_verifier and code_challenge
    const codeVerifier = crypto.randomBytes(64).toString('base64url')
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url')

    // Encode code_verifier in state (base64url JSON, secured by HTTPS in transit)
    const state = Buffer.from(JSON.stringify({
      userId: session.user.id,
      platform: 'x',
      ts: Date.now(),
      code_verifier: codeVerifier,
    })).toString('base64url')

    const redirectUri = `${process.env.NEXTAUTH_URL}/api/studio/channels/callback/x`

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.X_CLIENT_ID || '',
      redirect_uri: redirectUri,
      scope: 'tweet.read tweet.write users.read offline.access',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    })

    return NextResponse.redirect(`https://twitter.com/i/oauth2/authorize?${params.toString()}`)
  } catch (error) {
    console.error('[API:channels/connect/x] error:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/studio/integrations?error=oauth_init_failed`)
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
