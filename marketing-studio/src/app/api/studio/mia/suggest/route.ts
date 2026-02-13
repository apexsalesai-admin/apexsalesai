/**
 * Mia AI Suggestions API (P21-B Phase 3)
 *
 * POST /api/studio/mia/suggest
 * Actions: viral-hooks, cta-options, content-structure, improve-hook,
 *          improve-executive, improve-proof, improve-shorten, repurpose
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBestProvider } from '@/lib/ai-gateway'

type Action =
  | 'viral-hooks'
  | 'cta-options'
  | 'content-structure'
  | 'improve-hook'
  | 'improve-executive'
  | 'improve-proof'
  | 'improve-shorten'
  | 'repurpose'

interface SuggestRequest {
  action: Action
  topic?: string
  channel?: string
  text?: string
  targetChannel?: string
}

const PROMPTS: Record<Action, (req: SuggestRequest) => string> = {
  'viral-hooks': ({ topic, channel, text }) => `You are Mia, an expert AI content strategist. Generate 3 viral hooks (attention-grabbing opening lines) for this content.

${topic ? `Topic: ${topic}` : ''}
${channel ? `Channel: ${channel}` : ''}
${text ? `Content excerpt: ${text.slice(0, 500)}` : ''}

Requirements:
- Each hook should be 1-2 sentences max
- Use proven hook formulas: curiosity gap, bold statement, question, statistic, story
- Make them scroll-stopping
- Vary the approach across the 3 hooks

Return ONLY a JSON object (no markdown):
{"hooks": [{"text": "hook text", "formula": "curiosity|bold|question|statistic|story"}]}`,

  'cta-options': ({ topic, channel, text }) => `You are Mia, an expert AI content strategist. Generate 3 call-to-action options for this content.

${topic ? `Topic: ${topic}` : ''}
${channel ? `Channel: ${channel}` : ''}
${text ? `Content excerpt: ${text.slice(0, 500)}` : ''}

Requirements:
- Each CTA should be clear and action-oriented
- Vary the urgency level: soft, medium, strong
- Keep each under 15 words
- Consider the channel and audience

Return ONLY a JSON object (no markdown):
{"ctas": [{"text": "CTA text", "urgency": "soft|medium|strong"}]}`,

  'content-structure': ({ topic, channel }) => `You are Mia, an expert AI content strategist. Suggest the optimal content structure for this.

${topic ? `Topic: ${topic}` : 'General content'}
${channel ? `Channel: ${channel}` : 'Multi-channel'}

Requirements:
- Provide a clear outline with 4-6 sections
- Each section has a heading and brief description of what to include
- Optimize for the target channel
- Include estimated word count per section

Return ONLY a JSON object (no markdown):
{"structure": [{"heading": "Section heading", "description": "What to include", "words": 100}], "totalWords": 500, "format": "listicle|how-to|story|opinion|case-study"}`,

  'improve-hook': ({ text }) => `You are Mia, an expert AI content strategist. The user's content has a weak opening hook. Rewrite ONLY the first 1-2 sentences to be more attention-grabbing.

Content:
${(text || '').slice(0, 1000)}

Requirements:
- Make the hook irresistible
- Preserve the original topic and tone
- Use a proven hook formula

Return ONLY a JSON object (no markdown):
{"original": "original first sentence", "improved": "improved hook text", "formula": "what technique you used"}`,

  'improve-executive': ({ text }) => `You are Mia, an expert AI content strategist. Rewrite this content with a more executive, authoritative tone.

Content:
${(text || '').slice(0, 2000)}

Requirements:
- Use confident, decisive language
- Remove hedging words (maybe, perhaps, might)
- Add data-driven framing
- Keep the same length roughly

Return ONLY a JSON object (no markdown):
{"improved": "rewritten content", "changes": ["Change 1", "Change 2"]}`,

  'improve-proof': ({ text }) => `You are Mia, an expert AI content strategist. Add credibility markers and social proof suggestions to this content.

Content:
${(text || '').slice(0, 2000)}

Requirements:
- Suggest where to add statistics, testimonials, or case studies
- Add authority-building phrases
- Include specific numbers where possible

Return ONLY a JSON object (no markdown):
{"improved": "content with proof markers added", "proofPoints": ["Proof point 1", "Proof point 2"]}`,

  'improve-shorten': ({ text }) => `You are Mia, an expert AI content strategist. Shorten this content by approximately 30% while preserving the key message.

Content:
${(text || '').slice(0, 2000)}

Requirements:
- Remove redundant phrases
- Tighten sentences
- Keep the strongest points
- Maintain the tone

Return ONLY a JSON object (no markdown):
{"improved": "shortened content", "originalWords": 0, "newWords": 0, "reduction": "30%"}`,

  'repurpose': ({ text, channel, targetChannel }) => `You are Mia, an expert AI content strategist. Repurpose this content for a different channel.

Original channel: ${channel || 'unknown'}
Target channel: ${targetChannel || 'unknown'}
Content:
${(text || '').slice(0, 2000)}

Requirements:
- Adapt format and length for the target channel
- Adjust tone appropriately
- Preserve the core message
- Add channel-specific elements (hashtags for social, subject line for email, etc.)

Return ONLY a JSON object (no markdown):
{"title": "Repurposed title", "body": "Repurposed content", "notes": "What was changed and why"}`,
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
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body: SuggestRequest = await request.json()
    const { action } = body

    if (!PROMPTS[action]) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }

    const prompt = PROMPTS[action](body)
    const raw = await callAI(prompt)
    const result = parseJSON(raw)

    return NextResponse.json({ success: true, action, data: result })
  } catch (error) {
    console.error('[API:mia:suggest] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Suggestion failed' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
