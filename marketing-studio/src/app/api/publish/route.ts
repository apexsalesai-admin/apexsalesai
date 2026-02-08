import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ContentStatus } from '@prisma/client'
import { getPublishRequirements } from '@/lib/readiness'

// LEGACY Social Media Publishing API
// Deprecated: Use /api/publish/linkedin for LinkedIn or /api/studio/publish for Inngest-based publishing.
// This route is kept for backward compatibility but now enforces auth.

interface PublishResult {
  channel: string
  success: boolean
  postId?: string
  url?: string
  error?: string
}

// LinkedIn Publishing API
// Docs: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api
async function publishToLinkedIn(content: {
  title: string
  body: string
  mediaUrls?: string[]
}): Promise<PublishResult> {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN
  const authorId = process.env.LINKEDIN_AUTHOR_ID // URN format: urn:li:person:{id} or urn:li:organization:{id}

  if (!accessToken || !authorId) {
    return {
      channel: 'LINKEDIN',
      success: false,
      error: 'LinkedIn not configured. Add LINKEDIN_ACCESS_TOKEN and LINKEDIN_AUTHOR_ID in Settings > Integrations',
    }
  }

  try {
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: authorId,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content.body,
            },
            shareMediaCategory: content.mediaUrls?.length ? 'IMAGE' : 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`LinkedIn API: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return {
      channel: 'LINKEDIN',
      success: true,
      postId: data.id,
      url: `https://www.linkedin.com/feed/update/${data.id}`,
    }
  } catch (error) {
    return {
      channel: 'LINKEDIN',
      success: false,
      error: error instanceof Error ? error.message : 'LinkedIn publishing failed',
    }
  }
}

// YouTube Publishing API
// Docs: https://developers.google.com/youtube/v3/docs/videos/insert
async function publishToYouTube(content: {
  title: string
  body: string
  mediaUrls?: string[]
}): Promise<PublishResult> {
  const accessToken = process.env.YOUTUBE_ACCESS_TOKEN

  if (!accessToken) {
    return {
      channel: 'YOUTUBE',
      success: false,
      error: 'YouTube not configured. Add YOUTUBE_ACCESS_TOKEN in Settings > Integrations',
    }
  }

  if (!content.mediaUrls || content.mediaUrls.length === 0) {
    return {
      channel: 'YOUTUBE',
      success: false,
      error: 'YouTube requires a video file. Generate a video first in Video Studio.',
    }
  }

  try {
    // For YouTube, you typically need to upload the video file
    // This is a metadata-only endpoint for creating the video resource
    const response = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet,status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          title: content.title,
          description: content.body,
          tags: ['marketing', 'ai', 'content'],
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`YouTube API: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return {
      channel: 'YOUTUBE',
      success: true,
      postId: data.id,
      url: `https://youtube.com/watch?v=${data.id}`,
    }
  } catch (error) {
    return {
      channel: 'YOUTUBE',
      success: false,
      error: error instanceof Error ? error.message : 'YouTube publishing failed',
    }
  }
}

// X/Twitter Publishing API
// Docs: https://developer.twitter.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
async function publishToTwitter(content: {
  title: string
  body: string
  mediaUrls?: string[]
}): Promise<PublishResult> {
  const bearerToken = process.env.TWITTER_BEARER_TOKEN
  const accessToken = process.env.TWITTER_ACCESS_TOKEN
  const accessTokenSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET

  if (!bearerToken && !accessToken) {
    return {
      channel: 'X_TWITTER',
      success: false,
      error: 'X/Twitter not configured. Add TWITTER_BEARER_TOKEN or OAuth tokens in Settings > Integrations',
    }
  }

  try {
    // Twitter has 280 character limit
    const tweetText = content.body.length > 280
      ? content.body.substring(0, 277) + '...'
      : content.body

    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearerToken || accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: tweetText,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Twitter API: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return {
      channel: 'X_TWITTER',
      success: true,
      postId: data.data?.id,
      url: `https://twitter.com/i/status/${data.data?.id}`,
    }
  } catch (error) {
    return {
      channel: 'X_TWITTER',
      success: false,
      error: error instanceof Error ? error.message : 'Twitter publishing failed',
    }
  }
}

// Instagram Publishing API (via Facebook Graph API)
// Docs: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
async function publishToInstagram(content: {
  title: string
  body: string
  mediaUrls?: string[]
}): Promise<PublishResult> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN
  const igUserId = process.env.INSTAGRAM_USER_ID

  if (!accessToken || !igUserId) {
    return {
      channel: 'INSTAGRAM',
      success: false,
      error: 'Instagram not configured. Add INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID in Settings > Integrations',
    }
  }

  if (!content.mediaUrls || content.mediaUrls.length === 0) {
    return {
      channel: 'INSTAGRAM',
      success: false,
      error: 'Instagram requires an image or video. Add media to your content first.',
    }
  }

  try {
    // Step 1: Create media container
    const containerResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igUserId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: content.mediaUrls[0],
          caption: content.body,
          access_token: accessToken,
        }),
      }
    )

    if (!containerResponse.ok) {
      const error = await containerResponse.text()
      throw new Error(`Instagram Container API: ${containerResponse.status} - ${error}`)
    }

    const containerData = await containerResponse.json()

    // Step 2: Publish the container
    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igUserId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerData.id,
          access_token: accessToken,
        }),
      }
    )

    if (!publishResponse.ok) {
      const error = await publishResponse.text()
      throw new Error(`Instagram Publish API: ${publishResponse.status} - ${error}`)
    }

    const publishData = await publishResponse.json()
    return {
      channel: 'INSTAGRAM',
      success: true,
      postId: publishData.id,
      url: `https://instagram.com/p/${publishData.id}`,
    }
  } catch (error) {
    return {
      channel: 'INSTAGRAM',
      success: false,
      error: error instanceof Error ? error.message : 'Instagram publishing failed',
    }
  }
}

// TikTok Publishing API
// Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
async function publishToTikTok(content: {
  title: string
  body: string
  mediaUrls?: string[]
}): Promise<PublishResult> {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN

  if (!accessToken) {
    return {
      channel: 'TIKTOK',
      success: false,
      error: 'TikTok not configured. Add TIKTOK_ACCESS_TOKEN in Settings > Integrations',
    }
  }

  if (!content.mediaUrls || content.mediaUrls.length === 0) {
    return {
      channel: 'TIKTOK',
      success: false,
      error: 'TikTok requires a video. Generate a video first in Video Studio.',
    }
  }

  try {
    // TikTok Content Posting API - Initialize upload
    const response = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_info: {
          title: content.title,
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          video_url: content.mediaUrls[0],
        },
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`TikTok API: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return {
      channel: 'TIKTOK',
      success: true,
      postId: data.data?.publish_id,
      url: `https://tiktok.com/@user/video/${data.data?.publish_id}`,
    }
  } catch (error) {
    return {
      channel: 'TIKTOK',
      success: false,
      error: error instanceof Error ? error.message : 'TikTok publishing failed',
    }
  }
}

// Facebook Publishing API
// Docs: https://developers.facebook.com/docs/pages/publishing
async function publishToFacebook(content: {
  title: string
  body: string
  mediaUrls?: string[]
}): Promise<PublishResult> {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN
  const pageId = process.env.FACEBOOK_PAGE_ID

  if (!accessToken || !pageId) {
    return {
      channel: 'FACEBOOK',
      success: false,
      error: 'Facebook not configured. Add FACEBOOK_ACCESS_TOKEN and FACEBOOK_PAGE_ID in Settings > Integrations',
    }
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/feed`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content.body,
          link: content.mediaUrls?.[0],
          access_token: accessToken,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Facebook API: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return {
      channel: 'FACEBOOK',
      success: true,
      postId: data.id,
      url: `https://facebook.com/${data.id}`,
    }
  } catch (error) {
    return {
      channel: 'FACEBOOK',
      success: false,
      error: error instanceof Error ? error.message : 'Facebook publishing failed',
    }
  }
}

const PUBLISHERS: Record<string, (content: any) => Promise<PublishResult>> = {
  LINKEDIN: publishToLinkedIn,
  YOUTUBE: publishToYouTube,
  X_TWITTER: publishToTwitter,
  INSTAGRAM: publishToInstagram,
  TIKTOK: publishToTikTok,
  FACEBOOK: publishToFacebook,
}

// POST - Publish content to selected channels
// DEPRECATED: Prefer /api/publish/linkedin or /api/studio/publish
export async function POST(request: NextRequest) {
  try {
    // Auth gate (P9 hardening — was missing)
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { contentId, channels } = await request.json()

    if (!contentId) {
      return NextResponse.json(
        { success: false, error: 'Content ID is required' },
        { status: 400 }
      )
    }

    // Check system readiness before publishing
    const publishRequirements = await getPublishRequirements()

    if (!publishRequirements.canPublish) {
      console.error('[API:Publish] System not ready', {
        missing: publishRequirements.missing,
      })

      return NextResponse.json(
        {
          success: false,
          error: 'System not ready',
          missing: publishRequirements.missing,
        },
        { status: 400 }
      )
    }

    // Fetch the content
    const content = await prisma.scheduledContent.findUnique({
      where: { id: contentId },
    })

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      )
    }

    // Check if content is approved
    if (content.status !== 'APPROVED' && content.status !== 'SCHEDULED') {
      return NextResponse.json(
        { success: false, error: 'Content must be approved before publishing' },
        { status: 400 }
      )
    }

    // Determine which channels to publish to
    const targetChannels = channels || content.channels

    // Publish to each channel
    const results: PublishResult[] = []

    for (const channel of targetChannels) {
      const publisher = PUBLISHERS[channel]
      if (publisher) {
        try {
          const result = await publisher({
            title: content.title,
            body: content.body,
            mediaUrls: content.mediaUrls,
          })
          results.push(result)
        } catch (error) {
          results.push({
            channel,
            success: false,
            error: error instanceof Error ? error.message : 'Publishing failed',
          })
        }
      } else {
        results.push({
          channel,
          success: false,
          error: `No publisher available for ${channel}`,
        })
      }
    }

    // Determine overall status
    const allSuccessful = results.every(r => r.success)
    const someSuccessful = results.some(r => r.success)
    const allFailed = results.every(r => !r.success)

    const finalStatus: ContentStatus = allSuccessful
      ? 'PUBLISHED'
      : someSuccessful
        ? 'PUBLISHED' // Partial success still counts as published
        : 'FAILED'

    // Update content with results
    await prisma.scheduledContent.update({
      where: { id: contentId },
      data: {
        status: finalStatus,
        publishedAt: someSuccessful ? new Date() : null,
        publishResults: results as any,
        errorMessage: !allSuccessful
          ? results.filter(r => !r.success).map(r => `${r.channel}: ${r.error}`).join('; ')
          : null,
      },
    })

    return NextResponse.json({
      success: someSuccessful,
      data: {
        contentId,
        status: finalStatus,
        results,
        publishedAt: someSuccessful ? new Date().toISOString() : null,
      },
      message: allSuccessful
        ? 'Content published successfully to all channels'
        : someSuccessful
          ? 'Content published to some channels. Check results for details.'
          : allFailed
            ? 'Publishing failed. Please configure API keys in Settings > Integrations.'
            : 'Publishing completed with errors',
    })
  } catch (error) {
    console.error('Error publishing content:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to publish content' },
      { status: 500 }
    )
  }
}

// GET - Get publishing status and configured integrations
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const contentId = searchParams.get('contentId')

  // If contentId provided, get status for that content
  if (contentId) {
    try {
      const content = await prisma.scheduledContent.findUnique({
        where: { id: contentId },
        select: {
          id: true,
          status: true,
          publishedAt: true,
          publishResults: true,
          errorMessage: true,
        },
      })

      if (!content) {
        return NextResponse.json(
          { success: false, error: 'Content not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        data: content,
      })
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch publishing status' },
        { status: 500 }
      )
    }
  }

  // Otherwise, return configured integrations status
  const integrations = {
    linkedin: {
      configured: !!(process.env.LINKEDIN_ACCESS_TOKEN && process.env.LINKEDIN_AUTHOR_ID),
      required: ['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_AUTHOR_ID'],
    },
    youtube: {
      configured: !!process.env.YOUTUBE_ACCESS_TOKEN,
      required: ['YOUTUBE_ACCESS_TOKEN'],
    },
    twitter: {
      configured: !!(process.env.TWITTER_BEARER_TOKEN || process.env.TWITTER_ACCESS_TOKEN),
      required: ['TWITTER_BEARER_TOKEN or TWITTER_ACCESS_TOKEN'],
    },
    instagram: {
      configured: !!(process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_USER_ID),
      required: ['INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_USER_ID'],
    },
    tiktok: {
      configured: !!process.env.TIKTOK_ACCESS_TOKEN,
      required: ['TIKTOK_ACCESS_TOKEN'],
    },
    facebook: {
      configured: !!(process.env.FACEBOOK_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_ID),
      required: ['FACEBOOK_ACCESS_TOKEN', 'FACEBOOK_PAGE_ID'],
    },
  }

  const configuredCount = Object.values(integrations).filter(i => i.configured).length
  const totalCount = Object.keys(integrations).length

  return NextResponse.json({
    success: true,
    integrations,
    configured: configuredCount,
    total: totalCount,
    message: configuredCount === 0
      ? 'No publishing integrations configured. Add OAuth tokens in Settings > Integrations.'
      : `${configuredCount}/${totalCount} publishing channels configured.`,
  })
}
