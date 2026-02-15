import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getBestProvider } from '@/lib/ai-gateway'
import {
  PLATFORM_REGISTRY,
} from '@/lib/studio/publishing/platform-registry'
import {
  buildAdaptationSystemPrompt,
  buildAdaptationUserPrompt,
  type AdaptationInput,
  type AdaptationOutput,
} from '@/lib/studio/publishing/content-adapter'

async function callAIWithSystem(system: string, user: string): Promise<string> {
  const provider = getBestProvider()
  if (!provider) throw new Error('No AI provider configured')

  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    })
    if (!res.ok) throw new Error(`Anthropic API error (${res.status})`)
    const data = await res.json()
    return data.content[0].text
  } else if (provider === 'gemini') {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${system}\n\n${user}` }] }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.7 },
        }),
      }
    )
    if (!res.ok) throw new Error(`Gemini API error (${res.status})`)
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  } else {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2048,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    })
    if (!res.ok) throw new Error(`OpenAI API error (${res.status})`)
    const data = await res.json()
    return data.choices[0].message.content
  }
}

function parseJSON(raw: string): unknown {
  let cleaned = raw.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  return JSON.parse(cleaned.trim())
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { contentId, platforms, creatorVoice } = body as {
      contentId: string
      platforms: string[]
      creatorVoice?: string
    }

    if (!contentId || !platforms?.length) {
      return NextResponse.json({ error: 'contentId and platforms[] are required' }, { status: 400 })
    }

    // Load content
    const content = await prisma.scheduledContent.findUnique({ where: { id: contentId } })
    if (!content) return NextResponse.json({ error: 'Content not found' }, { status: 404 })

    const adaptationInput: AdaptationInput = {
      title: content.title,
      body: content.body,
      hashtags: (content.hashtags as string[]) || [],
      callToAction: content.callToAction || undefined,
      contentType: (content.contentType as string) || 'article',
      creatorVoice,
    }

    // Adapt for each platform in parallel
    const results: AdaptationOutput[] = []
    const variants: { platform: string; variantId: string }[] = []

    await Promise.all(
      platforms.map(async (platformId) => {
        const platformConfig = PLATFORM_REGISTRY[platformId]
        if (!platformConfig) return

        const systemPrompt = buildAdaptationSystemPrompt(platformConfig, creatorVoice)
        const userPrompt = buildAdaptationUserPrompt(adaptationInput)

        const raw = await callAIWithSystem(systemPrompt, userPrompt)
        const parsed = parseJSON(raw) as Partial<AdaptationOutput>

        const adapted: AdaptationOutput = {
          platform: platformId,
          title: parsed.title ?? null,
          body: parsed.body ?? content.body,
          hashtags: parsed.hashtags ?? [],
          callToAction: parsed.callToAction ?? '',
          mediaType: parsed.mediaType ?? 'text',
          aspectRatio: platformConfig.aspectRatios[0]?.ratio ?? '1:1',
          charCount: (parsed.body ?? content.body).length,
          charLimit: platformConfig.maxTextLength,
          adaptationNotes: parsed.adaptationNotes ?? '',
          threadParts: parsed.threadParts,
        }

        results.push(adapted)

        // Save as ContentVariant
        const variant = await prisma.contentVariant.create({
          data: {
            contentId,
            platform: platformId,
            title: adapted.title,
            body: adapted.body,
            hashtags: adapted.hashtags,
            callToAction: adapted.callToAction,
            mediaType: adapted.mediaType,
            charCount: adapted.charCount,
            charLimit: adapted.charLimit,
            aspectRatio: adapted.aspectRatio,
            threadParts: adapted.threadParts || [],
            adaptationNotes: adapted.adaptationNotes,
          },
        })

        variants.push({ platform: platformId, variantId: variant.id })
      })
    )

    return NextResponse.json({
      success: true,
      adaptations: results,
      variants,
    })
  } catch (error) {
    console.error('[API:publish/adapt] error:', error)
    return NextResponse.json(
      { success: false, error: 'Adaptation failed' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
