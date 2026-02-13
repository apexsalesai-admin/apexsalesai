/**
 * YouTube Video Upload (P21)
 *
 * Handles video upload to YouTube using the Data API v3 resumable upload protocol.
 * Requires a valid OAuth access token (managed by youtube-oauth.ts).
 */

import { getYouTubeAccessToken } from './youtube-oauth'

export interface YouTubeUploadParams {
  workspaceId: string
  title: string
  description: string
  tags?: string[]
  privacyStatus?: 'public' | 'unlisted' | 'private'
  videoUrl: string // URL to the video file (e.g., from Vercel Blob)
}

export interface YouTubeUploadResult {
  success: boolean
  videoId?: string
  permalink?: string
  error?: string
}

/**
 * Upload a video to YouTube via the Data API v3.
 *
 * Uses the resumable upload protocol:
 * 1. Initiate upload session
 * 2. Download video from source URL
 * 3. Upload video bytes to YouTube
 */
export async function uploadToYouTube(params: YouTubeUploadParams): Promise<YouTubeUploadResult> {
  try {
    const accessToken = await getYouTubeAccessToken(params.workspaceId)

    // Step 1: Initiate resumable upload
    const metadata = {
      snippet: {
        title: params.title,
        description: params.description,
        tags: params.tags ?? [],
        categoryId: '22', // People & Blogs
      },
      status: {
        privacyStatus: params.privacyStatus ?? 'private',
        selfDeclaredMadeForKids: false,
      },
    }

    const initResponse = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(metadata),
      }
    )

    if (!initResponse.ok) {
      const text = await initResponse.text()
      return { success: false, error: `Upload init failed: ${text}` }
    }

    const uploadUrl = initResponse.headers.get('Location')
    if (!uploadUrl) {
      return { success: false, error: 'No upload URL returned' }
    }

    // Step 2: Fetch video bytes from source
    const videoResponse = await fetch(params.videoUrl)
    if (!videoResponse.ok) {
      return { success: false, error: 'Failed to fetch video from source URL' }
    }

    const videoBlob = await videoResponse.blob()

    // Step 3: Upload video to YouTube
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': videoBlob.type || 'video/mp4',
        'Content-Length': String(videoBlob.size),
      },
      body: videoBlob,
    })

    if (!uploadResponse.ok) {
      const text = await uploadResponse.text()
      return { success: false, error: `Upload failed: ${text}` }
    }

    const result = await uploadResponse.json()
    const videoId = result.id

    console.log(`[YOUTUBE:UPLOAD] Video uploaded: ${videoId}`)

    return {
      success: true,
      videoId,
      permalink: `https://youtube.com/watch?v=${videoId}`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed'
    console.error('[YOUTUBE:UPLOAD] Error:', message)
    return { success: false, error: message }
  }
}
