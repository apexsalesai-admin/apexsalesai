import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const state = Buffer.from(JSON.stringify({
      userId: session.user.id,
      platform: 'youtube',
      ts: Date.now(),
    })).toString('base64url')

    const redirectUri = `${process.env.NEXTAUTH_URL}/api/studio/channels/callback/youtube`

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.YOUTUBE_CLIENT_ID || '',
      redirect_uri: redirectUri,
      scope: 'openid email profile https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state,
    })

    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
  } catch (error) {
    console.error('[API:channels/connect/youtube] error:', error)
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/studio/integrations?error=oauth_init_failed`)
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
