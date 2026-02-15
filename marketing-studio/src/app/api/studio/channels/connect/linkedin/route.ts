import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const state = Buffer.from(JSON.stringify({
      userId: session.user.id,
      platform: 'linkedin',
      ts: Date.now(),
    })).toString('base64url')

    const redirectUri = `${process.env.NEXTAUTH_URL}/api/studio/channels/callback/linkedin`

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.LINKEDIN_CLIENT_ID || '',
      redirect_uri: redirectUri,
      scope: 'openid profile w_member_social',
      state,
    })

    return NextResponse.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`)
  } catch (error) {
    console.error('[API:channels/connect/linkedin] error:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/studio/integrations?error=oauth_init_failed`)
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
