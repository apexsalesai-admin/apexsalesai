import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { applyRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit'
import { getBestProvider } from '@/lib/ai-gateway'
import { z } from 'zod'

const repurposeSchema = z.object({
  contentId: z.string().min(1).optional(),
  sourceText: z.string().min(20).optional(),
  targetFormats: z.array(
    z.enum([
      'LINKEDIN_POST',
      'X_THREAD',
      'BLOG_ARTICLE',
      'EMAIL_NEWSLETTER',
      'YOUTUBE_DESCRIPTION',
      'SHORT_SUMMARY',
    ])
  ).min(1).max(6),
}).refine(d => d.contentId || d.sourceText, {
  message: 'Either contentId or sourceText is required',
})

const FORMAT_INSTRUCTIONS: Record<string, string> = {
  LINKEDIN_POST: 'LinkedIn post (professional tone, 1-3 paragraphs, end with a question or CTA)',
  X_THREAD: 'X/Twitter thread (3-5 tweets, each under 280 characters, numbered 1/ 2/ 3/, hook in first tweet)',
  BLOG_ARTICLE: 'Blog article (800-1200 words, headers, introduction, conclusion, SEO-friendly)',
  EMAIL_NEWSLETTER: 'Email newsletter (subject line, preview text, body with clear CTA, scannable format)',
  YOUTUBE_DESCRIPTION: 'YouTube video description (summary, timestamps placeholder, links placeholder, SEO keywords)',
  SHORT_SUMMARY: 'Short summary (2-3 sentences, captures the core message)',
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const limited = applyRateLimit(RATE_LIMITS.mia, session.user.id)
    if (limited) return limited

    const body = await request.json()
    const parsed = repurposeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { contentId, sourceText: rawText, targetFormats } = parsed.data

    let originalTitle = 'Pasted Content'
    let originalBody = rawText || ''
    let originalId = contentId || 'external'

    if (contentId) {
      const original = await prisma.scheduledContent.findUnique({
        where: { id: contentId },
      })

      if (!original || !original.body) {
        return NextResponse.json(
          { error: 'Content not found or has no body text' },
          { status: 404 }
        )
      }
      originalTitle = original.title
      originalBody = original.body
      originalId = original.id
    }

    if (!originalBody) {
      return NextResponse.json(
        { error: 'No source content provided' },
        { status: 400 }
      )
    }

    const provider = getBestProvider()
    if (!provider) {
      return NextResponse.json(
        { error: 'No AI provider configured. Add your API keys in Settings.' },
        { status: 400 }
      )
    }

    const formatList = targetFormats
      .map((f, i) => `${i + 1}. ${FORMAT_INSTRUCTIONS[f]}`)
      .join('\n')

    const formatKeys = targetFormats.join(', ')

    const prompt = `You are Mia, an AI content strategist. Repurpose the following content into the requested formats. Preserve the core message and adapt the tone for each platform. Never use em dashes. Use commas, semicolons, or separate sentences instead.

ORIGINAL CONTENT:
Title: ${originalTitle}
Body: ${originalBody}

TARGET FORMATS:
${formatList}

Return ONLY a valid JSON object. Use these EXACT keys: ${formatKeys}. Each value is the repurposed text as a string. No markdown fences, no explanation, no extra text outside the JSON.`

    let aiResponse: string

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
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await res.json()
      aiResponse = data.content?.[0]?.text || ''
    } else if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      const data = await res.json()
      aiResponse = data.choices?.[0]?.message?.content || ''
    } else {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 4000 },
          }),
        }
      )
      const data = await res.json()
      aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    }

    // Parse JSON from AI response — robust extraction
    let cleaned = aiResponse
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim()

    // Extract JSON object from surrounding text
    const jsonStart = cleaned.indexOf('{')
    const jsonEnd = cleaned.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1)
    }

    let repurposed: Record<string, string>
    try {
      repurposed = JSON.parse(cleaned)
    } catch {
      console.error('[API:Repurpose] JSON parse failed. Raw:', aiResponse.substring(0, 500))
      return NextResponse.json(
        { success: false, error: 'AI response was not valid JSON. Please try again.' },
        { status: 500 }
      )
    }

    // Normalize keys: if AI used display names, map back to enum keys
    const KEY_MAP: Record<string, string> = {
      'LinkedIn Post': 'LINKEDIN_POST',
      'X Thread': 'X_THREAD',
      'Blog Article': 'BLOG_ARTICLE',
      'Email Newsletter': 'EMAIL_NEWSLETTER',
      'YouTube Description': 'YOUTUBE_DESCRIPTION',
      'Short Summary': 'SHORT_SUMMARY',
    }

    const normalized: Record<string, string> = {}
    for (const [key, value] of Object.entries(repurposed)) {
      const mappedKey = KEY_MAP[key] || key
      if (typeof value === 'string') {
        normalized[mappedKey] = value
      } else {
        normalized[mappedKey] = String(value)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        originalId,
        originalTitle,
        repurposed: normalized,
        formats: targetFormats,
      },
    })
  } catch (error) {
    console.error('[API:Repurpose] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to repurpose content. Try again.' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
