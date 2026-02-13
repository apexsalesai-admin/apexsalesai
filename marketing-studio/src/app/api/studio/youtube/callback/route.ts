/**
 * YouTube OAuth Callback (P21)
 *
 * GET /api/studio/youtube/callback — Handles OAuth redirect from Google
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  exchangeYouTubeCode,
  fetchYouTubeChannelInfo,
  storeYouTubeTokens,
} from '@/lib/integrations/youtube-oauth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')
  const error = searchParams.get('error')

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3003'
  const redirectUrl = `${baseUrl}/studio/integrations`

  // Handle OAuth errors
  if (error) {
    console.error('[API:youtube:callback] OAuth error:', error)
    return NextResponse.redirect(`${redirectUrl}?youtube_error=${encodeURIComponent(error)}`)
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(`${redirectUrl}?youtube_error=missing_code`)
  }

  try {
    // Decode state
    const state = JSON.parse(Buffer.from(stateParam, 'base64url').toString()) as {
      workspaceId: string
      userId: string
    }

    // Exchange code for tokens
    const tokens = await exchangeYouTubeCode(code)

    // Fetch channel info
    const channelInfo = await fetchYouTubeChannelInfo(tokens.accessToken)

    // Store everything in the database
    await storeYouTubeTokens({
      workspaceId: state.workspaceId,
      userId: state.userId,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      channelId: channelInfo.channelId,
      channelName: channelInfo.channelName,
      channelUrl: channelInfo.channelUrl,
    })

    console.log(`[API:youtube:callback] Connected channel: ${channelInfo.channelName}`)

    return NextResponse.redirect(`${redirectUrl}?youtube_connected=true`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[API:youtube:callback] Error:', message)
    return NextResponse.redirect(`${redirectUrl}?youtube_error=${encodeURIComponent(message)}`)
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
