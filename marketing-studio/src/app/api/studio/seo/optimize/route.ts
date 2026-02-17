/**
 * SEO Optimization API (P21-B)
 *
 * POST /api/studio/seo/optimize
 * Actions: generate-title, suggest-keywords, improve-readability, suggest-links
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBestProvider } from '@/lib/ai-gateway'

type Action = 'generate-title' | 'suggest-keywords' | 'improve-readability' | 'suggest-links'

interface OptimizeRequest {
  action: Action
  title: string
  content: string
  keywords: string[]
  rejectedKeywords?: string[]
  feedbackNote?: string
  iteration?: number
}

const PROMPTS: Record<Action, (req: OptimizeRequest) => string> = {
  'generate-title': ({ title, content, keywords }) => `You are an SEO expert. Generate 3 alternative SEO-optimized titles for this content.

Current title: "${title}"
Keywords: ${keywords.join(', ') || 'none provided'}
Content excerpt: ${content.slice(0, 500)}

Requirements:
- Each title should be 50-60 characters
- Include a primary keyword naturally
- Use power words to increase CTR
- At least one should include a number

Return ONLY a JSON object (no markdown):
{"titles": ["Title 1", "Title 2", "Title 3"]}`,

  'suggest-keywords': ({ title, content, keywords, rejectedKeywords, feedbackNote, iteration }) => {
    let prompt = `You are an SEO expert. Suggest 8 related keywords/phrases for this content.

Title: "${title}"
Existing keywords (already selected — DO NOT repeat): ${keywords.join(', ') || 'none'}
Content excerpt: ${content.slice(0, 500)}

Requirements:
- Mix of short-tail and long-tail keywords
- Include semantic variations
- Consider search intent (informational, transactional, navigational)
- Don't repeat existing keywords`

    if (rejectedKeywords && rejectedKeywords.length > 0) {
      prompt += `\n\nPreviously rejected by user (DO NOT suggest these or similar): ${rejectedKeywords.join(', ')}`
    }

    if (feedbackNote) {
      prompt += `\n\nUser feedback: "${feedbackNote}"\nAdjust suggestions based on this direction.`
    }

    if (iteration && iteration > 1) {
      prompt += `\n\nThis is attempt #${iteration}. Previous suggestions were not satisfactory. Try a COMPLETELY different approach — explore adjacent topics, long-tail conversational queries, competitor terms, or trending patterns. DO NOT reorder or rephrase previous suggestions.`
    }

    prompt += `\n\nReturn ONLY a JSON object (no markdown):
{"keywords": [{"keyword": "phrase", "type": "long-tail|short-tail", "intent": "informational|transactional|navigational"}]}`

    return prompt
  },

  'improve-readability': ({ content }) => `You are a writing clarity expert. Rewrite the following content to improve readability.

Content:
${content.slice(0, 2000)}

Requirements:
- Shorten sentences over 20 words
- Replace jargon with simple language
- Break up long paragraphs
- Use active voice
- Target Flesch score of 60+

Return ONLY a JSON object (no markdown):
{"improved": "The rewritten content here", "changes": ["Simplified X", "Broke up paragraph Y", "Replaced jargon Z"]}`,

  'suggest-links': ({ title, content, keywords }) => `You are an SEO content strategist. Suggest 5 internal link opportunities for this content.

Title: "${title}"
Keywords: ${keywords.join(', ') || 'none'}
Content excerpt: ${content.slice(0, 1000)}

Assume this is a marketing/business blog. Suggest anchor text and target page topics.

Return ONLY a JSON object (no markdown):
{"links": [{"anchorText": "text to link", "targetTopic": "suggested page/article topic", "reason": "why this link helps SEO"}]}`,
}

async function callAI(prompt: string): Promise<string> {
  const provider = getBestProvider()
  if (!provider) {
    throw new Error('No AI provider configured')
  }

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
          { role: 'system', content: 'You are an SEO optimization expert. Return only valid JSON.' },
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
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body: OptimizeRequest = await request.json()
    const { action, title, content, keywords, rejectedKeywords, feedbackNote, iteration } = body

    if (!PROMPTS[action]) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }

    const prompt = PROMPTS[action]({ action, title, content, keywords, rejectedKeywords, feedbackNote, iteration })
    const raw = await callAI(prompt)
    const result = parseJSON(raw)

    return NextResponse.json({ success: true, action, data: result })
  } catch (error) {
    console.error('[API:seo:optimize] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Optimization failed' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
