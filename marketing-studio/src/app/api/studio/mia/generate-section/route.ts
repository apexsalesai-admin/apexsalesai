/**
 * Mia Creative Section Generator API (Wave 1)
 *
 * POST /api/studio/mia/generate-section
 * Generates one section (hook/body/cta) with "thinking" explanation.
 * Also handles polishing (action: 'polish') — analyzes assembled draft for fix suggestions.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { getBrandVoiceForWorkspace } from '@/lib/brand-voice'
import { getBestProvider } from '@/lib/ai-gateway'
import type {
  MiaGenerateSectionRequest,
  MiaGenerateSectionResponse,
  MiaPolishRequest,
  MiaPolishResponse,
  FixSuggestion,
} from '@/lib/studio/mia-creative-types'

async function callAI(prompt: string, maxTokens = 2048): Promise<string> {
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
        max_tokens: maxTokens,
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
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 },
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
        max_tokens: maxTokens,
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

// ─── Section generation ────────────────────────────────────────────────────────

async function handleGenerateSection(
  body: MiaGenerateSectionRequest,
  workspaceId: string
): Promise<NextResponse> {
  const { topic, angle, sectionType, channels, contentType, previousSections, rejectedVersions, goal } = body
  const brandVoice = await getBrandVoiceForWorkspace(workspaceId)

  const channelList = channels.join(', ') || 'social media'
  const goalContext = goal ? `Content goal: ${goal}.` : ''
  const brandContext = brandVoice.brandName
    ? `Brand: "${brandVoice.brandName}". Tones: ${brandVoice.tones.join(', ')}. Forbidden phrases: ${brandVoice.forbiddenPhrases.join(', ') || 'none'}.`
    : ''

  const prevContext = previousSections.length > 0
    ? `\n\nAlready written sections:\n${previousSections.map((s) => `[${s.type.toUpperCase()}]: ${s.content}`).join('\n\n')}`
    : ''

  const rejectedContext = rejectedVersions.length > 0
    ? `\n\nPreviously rejected versions (write something DIFFERENT):\n${rejectedVersions.map((v, i) => `Rejected v${i + 1}: ${v}`).join('\n')}`
    : ''

  const sectionInstructions: Record<string, string> = {
    hook: 'Write an attention-grabbing opening hook (1-3 sentences). Make it scroll-stopping. Use a proven formula: curiosity gap, bold statement, question, or story opener.',
    body: 'Write the main body content (2-5 paragraphs). Deliver value, support the angle with specifics. Use clear structure and engaging language.',
    cta: 'Write a compelling call-to-action (1-2 sentences). Be specific about what the reader should do next. Match the content goal.',
  }

  const prompt = `You are Mia, an expert AI content strategist. Generate the ${sectionType.toUpperCase()} section for ${contentType} content on ${channelList}.

Topic: "${topic}"
Angle: "${angle.title}" — ${angle.description}
${goalContext}
${brandContext}
${prevContext}
${rejectedContext}

Section instructions: ${sectionInstructions[sectionType]}

Return ONLY a JSON object (no markdown):
{
  "content": "The actual section content text (plain text, not markdown)",
  "thinking": "1-2 sentences explaining your creative reasoning for this version"
}`

  const raw = await callAI(prompt)
  const parsed = parseJSON(raw) as { content: string; thinking: string }

  const response: MiaGenerateSectionResponse = {
    success: true,
    content: parsed.content || '',
    thinking: parsed.thinking || '',
  }
  return NextResponse.json(response)
}

// ─── Polish / fix suggestions ──────────────────────────────────────────────────

async function handlePolish(
  body: MiaPolishRequest & { action: string },
  workspaceId: string
): Promise<NextResponse> {
  const { topic, sections, channels, contentType } = body
  const brandVoice = await getBrandVoiceForWorkspace(workspaceId)

  const channelList = channels.join(', ') || 'social media'
  const assembledDraft = sections.map((s) => `[${s.type.toUpperCase()}]:\n${s.content}`).join('\n\n')
  const brandContext = brandVoice.brandName
    ? `Brand: "${brandVoice.brandName}". Tones: ${brandVoice.tones.join(', ')}.`
    : ''

  const prompt = `You are Mia, an expert AI content strategist. Review this assembled ${contentType} draft for ${channelList} and suggest improvements.

Topic: "${topic}"
${brandContext}

Draft:
${assembledDraft}

Analyze for: tone consistency, clarity, engagement, length optimization, CTA strength, and flow between sections.

Return ONLY a JSON object with up to 4 improvement suggestions:
{
  "fixes": [
    {
      "id": "fix-1",
      "category": "tone|clarity|engagement|length|cta|flow",
      "description": "Brief description of the issue",
      "currentText": "The exact text snippet that could be improved",
      "suggestedText": "The improved version of that text snippet",
      "applied": false
    }
  ]
}

If the draft is already excellent, return {"fixes": []}.`

  const raw = await callAI(prompt)
  const parsed = parseJSON(raw) as { fixes: FixSuggestion[] }

  const fixes = (parsed.fixes || []).map((f, i) => ({
    id: f.id || `fix-${i + 1}`,
    category: f.category || 'clarity',
    description: f.description || '',
    currentText: f.currentText || '',
    suggestedText: f.suggestedText || '',
    applied: false,
  })) as FixSuggestion[]

  const response: MiaPolishResponse = { success: true, fixes }
  return NextResponse.json(response)
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const workspace = await getOrCreateWorkspace(session.user.id)

    // Route to polish handler if action is 'polish'
    if (body.action === 'polish') {
      return handlePolish(body, workspace.id)
    }

    // Default: generate section
    return handleGenerateSection(body as MiaGenerateSectionRequest, workspace.id)
  } catch (error) {
    console.error('[API:mia:generate-section] Error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
