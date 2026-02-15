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
        max_tokens: 2048,
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
          { role: 'system', content: 'You are a video script analyst. Return only valid JSON.' },
          { role: 'user', content: prompt },
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
    const { script, platform, duration } = body as {
      script: string
      platform?: string
      duration?: number
    }

    if (!script?.trim()) {
      return NextResponse.json({ error: 'script is required' }, { status: 400 })
    }

    const prompt = `Analyze this video script for marketing effectiveness. The video is ${duration ? `${duration} seconds` : 'short-form'} for ${platform || 'social media'}.

Script:
"""
${script}
"""

Return a JSON object with:
{
  "hookScore": <1-10 how strong is the opening hook>,
  "hookAnalysis": "<why the hook works or doesn't>",
  "pacing": "<analysis of pacing and flow>",
  "pacingScore": <1-10>,
  "ctaEffectiveness": "<analysis of call-to-action>",
  "ctaScore": <1-10>,
  "emotionalArc": "<description of emotional progression>",
  "retentionPrediction": "<high|medium|low>",
  "suggestions": ["<actionable improvement 1>", "<actionable improvement 2>", "<actionable improvement 3>"],
  "estimatedWatchTime": "<percentage of viewers likely to watch to end>",
  "overallScore": <1-100>,
  "rewriteSuggestion": "<optional: rewritten version of weakest section>"
}

Return ONLY the JSON object, no additional text.`

    const raw = await callAI(prompt)
    const analysis = parseJSON(raw)

    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    console.error('[API:mia/analyze-script] error:', error)
    return NextResponse.json(
      { success: false, error: 'Script analysis failed' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
