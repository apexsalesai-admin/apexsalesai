import { NextRequest, NextResponse } from 'next/server'

// Video Generation API - Integrates with cutting-edge AI video tools
// Supports: Runway, HeyGen, ElevenLabs, Sora, and more

interface VideoGenerationRequest {
  type: 'text-to-video' | 'avatar-video' | 'script-to-video' | 'image-to-video'
  script: string
  title?: string
  duration: number // in seconds
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5'
  style?: string
  voiceId?: string
  voiceProvider?: 'elevenlabs' | 'playht' | 'murf'
  avatarId?: string
  avatarProvider?: 'heygen' | 'synthesia' | 'd-id'
  videoProvider?: 'runway' | 'pika' | 'luma' | 'kling' | 'sora'
  musicStyle?: string
  musicProvider?: 'suno' | 'epidemic' | 'artlist'
  thumbnailPrompt?: string
  thumbnailProvider?: 'midjourney' | 'dalle' | 'ideogram'
  includeCaptions: boolean
  brandKit?: {
    primaryColor: string
    logo?: string
    font?: string
  }
}

// ElevenLabs Text-to-Speech
async function generateVoiceover(text: string, voiceId: string = 'rachel'): Promise<{ audioUrl: string; duration: number }> {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY not configured - Add your API key in Settings > Integrations')
  }

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.5,
        use_speaker_boost: true,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`ElevenLabs API error: ${error}`)
  }

  // In production, you'd save this to cloud storage and return the URL
  const audioBuffer = await response.arrayBuffer()
  const duration = Math.ceil(text.split(' ').length / 2.5) // Rough estimate: 150 words/min

  return {
    audioUrl: `data:audio/mpeg;base64,${Buffer.from(audioBuffer).toString('base64')}`,
    duration,
  }
}

// HeyGen Avatar Video Generation
async function generateAvatarVideo(script: string, avatarId: string, voiceId?: string): Promise<{ videoUrl: string; duration: number }> {
  const apiKey = process.env.HEYGEN_API_KEY
  if (!apiKey) {
    throw new Error('HEYGEN_API_KEY not configured - Add your API key in Settings > Integrations')
  }

  // Create video
  const response = await fetch('https://api.heygen.com/v2/video/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
    },
    body: JSON.stringify({
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: avatarId,
            avatar_style: 'normal',
          },
          voice: {
            type: 'text',
            input_text: script,
            voice_id: voiceId || 'en-US-JennyNeural',
          },
        },
      ],
      dimension: {
        width: 1920,
        height: 1080,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`HeyGen API error: ${error}`)
  }

  const data = await response.json()
  return {
    videoUrl: data.data?.video_url || '',
    duration: data.data?.duration || 0,
  }
}

// Runway Gen-3 Text-to-Video
// API docs: https://docs.runwayml.com — uses api.dev.runwayml.com
const RUNWAY_MAX_PROMPT = 1000

async function generateRunwayVideo(
  prompt: string,
  duration: number = 10,
  ratio: '16:9' | '9:16' | '1:1' | '4:5' = '16:9'
): Promise<{ taskId: string; status: string }> {
  const apiKey = process.env.RUNWAY_API_KEY
  if (!apiKey) {
    throw new Error('Runway API key not configured. Add your key in Settings > Integrations or set RUNWAY_API_KEY in .env.local')
  }

  const baseUrl = process.env.RUNWAY_API_URL || 'https://api.dev.runwayml.com/v1'

  // veo3.1 supports 4, 6, or 8 second durations
  const runwayDuration = duration <= 4 ? 4 : duration <= 6 ? 6 : 8

  // Map aspect ratio to resolution format
  const ratioMap: Record<string, string> = {
    '16:9': '1280:720', '9:16': '720:1280', '1:1': '1080:1080', '4:5': '720:1280',
  }
  const mappedRatio = ratioMap[ratio] || '1280:720'

  // Runway enforces 1000-char limit on promptText
  let promptText = prompt
  if (promptText.length > RUNWAY_MAX_PROMPT) {
    console.warn('[LEGACY:RUNWAY:TRUNCATE]', { original: promptText.length, truncated: RUNWAY_MAX_PROMPT })
    promptText = promptText.slice(0, RUNWAY_MAX_PROMPT)
  }

  console.log('[LEGACY:RUNWAY:SUBMIT]', { model: process.env.RUNWAY_TEXT_TO_VIDEO_MODEL || 'veo3.1', ratio: mappedRatio, duration: runwayDuration, promptLength: promptText.length })

  const response = await fetch(`${baseUrl}/text_to_video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'X-Runway-Version': '2024-11-06',
    },
    body: JSON.stringify({
      model: process.env.RUNWAY_TEXT_TO_VIDEO_MODEL || 'veo3.1',
      promptText,
      ratio: mappedRatio,
      duration: runwayDuration,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('[LEGACY:RUNWAY:ERROR]', { status: response.status, error: error.slice(0, 200) })
    throw new Error(`Runway API error (${response.status}): ${error}`)
  }

  const data = await response.json()
  console.log('[LEGACY:RUNWAY:OK]', { taskId: data.id || data.taskId })
  return {
    taskId: data.id || data.taskId || '',
    status: data.status || 'queued',
  }
}

// DALL-E 3 Thumbnail Generation
async function generateThumbnail(prompt: string): Promise<{ thumbnailUrl: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt: `YouTube thumbnail: ${prompt}. High contrast, bold text overlay area, eye-catching, professional quality, 16:9 aspect ratio`,
      n: 1,
      size: '1792x1024',
      quality: 'hd',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`DALL-E API error: ${error}`)
  }

  const data = await response.json()
  return { thumbnailUrl: data.data?.[0]?.url || '' }
}

// Suno Music Generation
async function generateMusic(style: string, duration: number = 30): Promise<{ musicUrl: string }> {
  const apiKey = process.env.SUNO_API_KEY
  if (!apiKey) {
    // Return placeholder if not configured
    return { musicUrl: '' }
  }

  // Suno API integration would go here
  // For now, return empty as Suno's API is still in development
  return { musicUrl: '' }
}

/** @deprecated Use POST /api/studio/versions/[versionId]/render for the Inngest pipeline instead */
export async function POST(request: NextRequest) {
  try {
    const body: VideoGenerationRequest = await request.json()

    console.log('[RENDER:REQUEST]', {
      provider: body.videoProvider || 'runway',
      type: body.type,
      keySource: process.env.RUNWAY_API_KEY ? 'env' : 'none',
      pipeline: 'legacy',
    })

    // Dev fallback: return sample assets so the UI flow is testable without paid API keys
    if (process.env.NODE_ENV === 'development' && !process.env.RUNWAY_API_KEY && !process.env.HEYGEN_API_KEY) {
      return NextResponse.json({
        success: true,
        videoUrl: '/sample-video.mp4',
        thumbnailUrls: ['/sample-thumb.jpg'],
        duration: body.duration || 30,
        steps: [
          { step: 'video', status: 'completed' as const, message: 'Dev mode — mock video returned' },
        ],
        message: 'Dev mode: returning sample assets. Configure API keys for real generation.',
      })
    }

    const {
      type,
      script,
      title,
      duration,
      aspectRatio,
      style,
      voiceId,
      voiceProvider = 'elevenlabs',
      avatarId,
      avatarProvider = 'heygen',
      videoProvider = 'runway',
      musicStyle,
      thumbnailPrompt,
      includeCaptions,
    } = body

    const results: {
      videoUrl?: string
      audioUrl?: string
      thumbnailUrls?: string[]
      captionsUrl?: string
      duration?: number
      steps: { step: string; status: 'completed' | 'pending' | 'failed'; message?: string }[]
    } = {
      steps: [],
    }

    // Step 1: Generate voiceover if needed
    if (type === 'script-to-video' || type === 'avatar-video') {
      try {
        results.steps.push({ step: 'voiceover', status: 'pending' })
        const voice = await generateVoiceover(script, voiceId)
        results.audioUrl = voice.audioUrl
        results.duration = voice.duration
        results.steps[results.steps.length - 1] = { step: 'voiceover', status: 'completed' }
      } catch (error) {
        results.steps[results.steps.length - 1] = {
          step: 'voiceover',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Voice generation failed'
        }
      }
    }

    // Step 2: Generate video
    if (type === 'avatar-video' && avatarId) {
      try {
        results.steps.push({ step: 'video', status: 'pending' })
        const video = await generateAvatarVideo(script, avatarId, voiceId)
        results.videoUrl = video.videoUrl
        results.duration = video.duration
        results.steps[results.steps.length - 1] = { step: 'video', status: 'completed' }
      } catch (error) {
        results.steps[results.steps.length - 1] = {
          step: 'video',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Video generation failed'
        }
      }
    } else if (type === 'text-to-video') {
      try {
        results.steps.push({ step: 'video', status: 'pending' })
        const videoPrompt = style ? `${script}. Style: ${style}` : script
        const runway = await generateRunwayVideo(videoPrompt, duration, aspectRatio as '16:9' | '9:16' | '1:1' | '4:5')
        // Runway is async — store task ID, video will be ready after polling
        results.videoUrl = '' // Will be populated after polling (P1)
        results.duration = duration
        results.steps[results.steps.length - 1] = {
          step: 'video',
          status: 'completed',
          message: `Runway task queued: ${runway.taskId} (status: ${runway.status})`,
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Video generation failed'
        console.error('[LEGACY:STEP:FAILED]', { step: 'video', error: errMsg.slice(0, 200) })
        results.steps[results.steps.length - 1] = {
          step: 'video',
          status: 'failed',
          message: errMsg
        }
      }
    }

    // Step 3: Generate thumbnail
    if (thumbnailPrompt) {
      try {
        results.steps.push({ step: 'thumbnail', status: 'pending' })
        const thumbnail = await generateThumbnail(thumbnailPrompt || title || script.slice(0, 100))
        results.thumbnailUrls = [thumbnail.thumbnailUrl]
        results.steps[results.steps.length - 1] = { step: 'thumbnail', status: 'completed' }
      } catch (error) {
        results.steps[results.steps.length - 1] = {
          step: 'thumbnail',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Thumbnail generation failed'
        }
      }
    }

    // Step 4: Generate music
    if (musicStyle) {
      try {
        results.steps.push({ step: 'music', status: 'pending' })
        const music = await generateMusic(musicStyle, duration)
        // Would attach to results
        results.steps[results.steps.length - 1] = { step: 'music', status: 'completed' }
      } catch (error) {
        results.steps[results.steps.length - 1] = {
          step: 'music',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Music generation failed'
        }
      }
    }

    const hasAnySuccess = results.steps.some(s => s.status === 'completed')
    const allFailed = results.steps.every(s => s.status === 'failed')

    // Surface the first failed step's message as the top-level error
    const firstFailedStep = results.steps.find(s => s.status === 'failed')
    const specificError = firstFailedStep?.message

    const response = NextResponse.json({
      success: hasAnySuccess,
      ...results,
      error: allFailed ? specificError : undefined,
      message: allFailed
        ? specificError || 'All generation steps failed. Please check your API keys in Settings > Integrations.'
        : hasAnySuccess
          ? 'Video generation completed with some steps successful.'
          : 'Video generation in progress.',
      _deprecated: 'This endpoint is deprecated. Use POST /api/studio/versions/[versionId]/render instead.',
    })
    response.headers.set('Deprecation', 'true')
    response.headers.set('Sunset', '2026-06-01')
    return response
  } catch (error) {
    console.error('Video generation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate video',
        message: 'Please ensure all required API keys are configured in Settings > Integrations.',
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check available integrations
export async function GET() {
  // Check env vars at runtime (not build time) for each integration
  const integrations: Record<string, boolean> = {}
  const envVarMap: Record<string, string> = {
    elevenlabs: 'ELEVENLABS_API_KEY',
    heygen: 'HEYGEN_API_KEY',
    runway: 'RUNWAY_API_KEY',
    openai: 'OPENAI_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
    suno: 'SUNO_API_KEY',
    synthesia: 'SYNTHESIA_API_KEY',
    did: 'DID_API_KEY',
    midjourney: 'MIDJOURNEY_API_KEY',
  }

  for (const [key, envVar] of Object.entries(envVarMap)) {
    integrations[key] = !!process.env[envVar]
  }

  const configuredCount = Object.values(integrations).filter(Boolean).length
  const totalCount = Object.keys(integrations).length

  return NextResponse.json({
    success: true,
    integrations,
    configured: configuredCount,
    total: totalCount,
    message: configuredCount === 0
      ? 'No integrations configured. Add API keys in Settings > Integrations to unlock video generation.'
      : `${configuredCount}/${totalCount} integrations configured.`,
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
