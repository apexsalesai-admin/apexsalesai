/**
 * Mia Creative Research API (Wave 1)
 *
 * POST /api/studio/mia/research
 * Runs 2-3 Brave searches on topic, AI synthesizes 3 angle cards.
 * Degrades gracefully without Brave key — generates angles from AI alone.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { getBestProvider } from '@/lib/ai-gateway'
import { braveSearch } from '@/lib/integrations/brave-search'
import type {
  MiaResearchRequest,
  MiaResearchResponse,
  AngleCard,
  AngleSource,
} from '@/lib/studio/mia-creative-types'

async function callAI(prompt: string): Promise<string> {
  const provider = getBestProvider()
  if (!provider) throw new Error('No AI provider configured')

  if (provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY!
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
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
    const apiKey = process.env.GOOGLE_AI_API_KEY!
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.8 },
        }),
      }
    )
    if (!res.ok) throw new Error(`Gemini API error (${res.status})`)
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  } else {
    const apiKey = process.env.OPENAI_API_KEY!
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2048,
        messages: [
          { role: 'system', content: 'You are Mia, an expert AI content strategist. Return only valid JSON.' },
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, angles: [], error: 'Unauthorized' } satisfies MiaResearchResponse, { status: 401 })
    }

    const body: MiaResearchRequest = await request.json()
    const { topic, channels, contentType, goal } = body

    if (!topic?.trim()) {
      return NextResponse.json({ success: false, angles: [], error: 'Topic is required' } satisfies MiaResearchResponse, { status: 400 })
    }

    const workspace = await getOrCreateWorkspace(session.user.id)

    // Attempt Brave searches — degrade gracefully if not configured
    let searchResults: AngleSource[] = []
    try {
      const queries = [
        `${topic} ${contentType} best practices`,
        `${topic} trending insights ${new Date().getFullYear()}`,
      ]

      const searchPromises = queries.map((q) =>
        braveSearch(q, workspace.id, { count: 5, freshness: 'month' }).catch(() => null)
      )
      const results = await Promise.all(searchPromises)

      for (const result of results) {
        if (result?.results) {
          for (const r of result.results.slice(0, 3)) {
            searchResults.push({
              title: r.title,
              url: r.url,
              snippet: r.description,
            })
          }
        }
      }
    } catch {
      // Brave not configured — continue without search results
    }

    const sourceContext = searchResults.length > 0
      ? `\n\nResearch sources found:\n${searchResults.map((s, i) => `${i + 1}. "${s.title}" — ${s.snippet}`).join('\n')}`
      : '\n\n(No web search results available — generate angles from your knowledge.)'

    const channelList = channels.join(', ') || 'social media'
    const goalContext = goal ? `Content goal: ${goal}.` : ''

    const prompt = `You are Mia, an expert AI content strategist. Given a topic, suggest 3 distinct creative angles for ${contentType} content on ${channelList}. ${goalContext}

Topic: "${topic}"
${sourceContext}

For each angle, provide:
- A catchy title (5-8 words)
- A 1-sentence description of the approach
- A 2-sentence rationale explaining why this angle works
- 1-2 relevant source references from the research (if available; use empty array if no sources)

Return ONLY a JSON object (no markdown):
{
  "angles": [
    {
      "id": "angle-1",
      "title": "Angle title here",
      "description": "Brief description of the approach",
      "rationale": "Why this angle works well for the audience and channel",
      "sources": [{"title": "Source title", "url": "https://...", "snippet": "Key excerpt"}]
    }
  ]
}`

    const raw = await callAI(prompt)
    const parsed = parseJSON(raw) as { angles: AngleCard[] }

    // Ensure we have valid angle data
    const angles: AngleCard[] = (parsed.angles || []).slice(0, 3).map((a, i) => ({
      id: a.id || `angle-${i + 1}`,
      title: a.title || `Angle ${i + 1}`,
      description: a.description || '',
      rationale: a.rationale || '',
      sources: Array.isArray(a.sources) ? a.sources : [],
    }))

    const response: MiaResearchResponse = { success: true, angles }
    return NextResponse.json(response)
  } catch (error) {
    console.error('[API:mia:research] Error:', error)
    return NextResponse.json(
      { success: false, angles: [], error: error instanceof Error ? error.message : 'Research failed' } satisfies MiaResearchResponse,
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
