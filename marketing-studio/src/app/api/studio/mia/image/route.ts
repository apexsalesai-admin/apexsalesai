import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit'
import { checkFeatureAccess, checkUsageLimit, recordUsage } from '@/lib/subscription/check-access'
import { put } from '@vercel/blob'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = applyRateLimit(RATE_LIMITS.video, session.user.id)
    if (limited) return limited

    try {
      const featureCheck = await checkFeatureAccess(session.user.id, 'images')
      if (!featureCheck.allowed) {
        return NextResponse.json(
          { error: featureCheck.reason },
          { status: 403 }
        )
      }

      const usageCheck = await checkUsageLimit(session.user.id, 'image')
      if (!usageCheck.allowed) {
        return NextResponse.json(
          { error: usageCheck.reason },
          { status: 403 }
        )
      }
    } catch (err) {
      console.error('[API:mia:image] Usage/feature check failed, proceeding:', err)
    }

    const body = await request.json()
    const { prompt, size = '1024x1024' } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    const validSizes = ['1024x1024', '1792x1024', '1024x1792']
    if (!validSizes.includes(size)) {
      return NextResponse.json(
        { error: `Invalid size. Valid: ${validSizes.join(', ')}` },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Set OPENAI_API_KEY in environment variables.' },
        { status: 500 }
      )
    }

    console.log('[IMAGE:DALLE] Generating image:', prompt.substring(0, 100))

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: prompt.substring(0, 4000),
        n: 1,
        size,
        quality: 'standard',
        response_format: 'url',
      }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      console.error('[IMAGE:DALLE] OpenAI error:', errData)
      return NextResponse.json(
        { error: errData.error?.message || `OpenAI API error (${response.status})` },
        { status: response.status }
      )
    }

    const data = await response.json()
    const imageUrl = data.data?.[0]?.url
    const revisedPrompt = data.data?.[0]?.revised_prompt

    if (!imageUrl) {
      return NextResponse.json({ error: 'No image URL in response' }, { status: 500 })
    }

    console.log('[IMAGE:DALLE] Image generated successfully')
    await recordUsage(session.user.id, 'image_generate').catch(console.error)

    // Persist to Vercel Blob so the URL does not expire
    let persistentUrl = imageUrl
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const imageResponse = await fetch(imageUrl)
        const imageBuffer = await imageResponse.arrayBuffer()
        const filename = `studio-images/${Date.now()}-${Math.random().toString(36).slice(2)}.png`
        const blob = await put(filename, imageBuffer, {
          access: 'public',
          contentType: 'image/png',
        })
        persistentUrl = blob.url
        console.log('[IMAGE:BLOB] Persisted to Vercel Blob:', persistentUrl)
      } catch (err) {
        console.error('[IMAGE:BLOB] Upload failed, using DALL-E URL:', err)
      }
    }

    return NextResponse.json({
      success: true,
      url: persistentUrl,
      revisedPrompt: revisedPrompt || null,
    })
  } catch (error) {
    console.error('[IMAGE:DALLE] Error:', error)
    return NextResponse.json(
      { error: 'Image generation failed. Please try again.' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
