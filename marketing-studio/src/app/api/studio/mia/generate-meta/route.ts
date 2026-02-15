import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBestProvider } from '@/lib/ai-gateway'

async function callAI(prompt: string): Promise<string> {
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
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
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
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 256, temperature: 0.7 },
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
        max_tokens: 256,
        messages: [
          { role: 'system', content: 'Generate a compelling meta description under 160 characters that includes the primary keyword and encourages clicks. Return only the description text, nothing else.' },
          { role: 'user', content: prompt },
        ],
      }),
    })
    if (!res.ok) throw new Error(`OpenAI API error (${res.status})`)
    const data = await res.json()
    return data.choices[0].message.content
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { title, body: contentBody, keywords } = body as {
      title: string
      body?: string
      keywords?: string[]
    }

    if (!title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const keywordList = keywords?.length ? `Target keywords: ${keywords.join(', ')}.` : ''

    const prompt = `Generate a compelling SEO meta description for this content. It MUST be under 160 characters. Include the primary keyword naturally. Write something that makes searchers want to click.

Title: "${title}"
${contentBody ? `Content excerpt: "${contentBody.slice(0, 300)}"` : ''}
${keywordList}

Return ONLY the meta description text — no quotes, no labels, no explanation. Under 160 characters.`

    const raw = await callAI(prompt)
    const metaDescription = raw.trim().replace(/^["']|["']$/g, '').slice(0, 160)

    return NextResponse.json({ success: true, metaDescription })
  } catch (error) {
    console.error('[API:mia/generate-meta] error:', error)
    return NextResponse.json(
      { success: false, error: 'Meta description generation failed' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
