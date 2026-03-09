import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { applyRateLimit, RATE_LIMITS } from '@/lib/middleware/rate-limit'
import { getBestProvider } from '@/lib/ai-gateway'
import { z } from 'zod'

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).min(1).max(50),
  mode: z.enum([
    'article',
    'email',
    'campaign',
    'image',
    'presentation',
    'general',
  ]),
})

const SYSTEM_PROMPTS: Record<string, string> = {
  article: `You are Mia, an AI content strategist at LYFYE Marketing Studio. You are helping the user write a compelling article or blog post.

Your conversation style:
- Be warm, collaborative, and proactive
- Ask clarifying questions when needed (audience, angle, key points)
- When you have enough context, generate the FULL article (800-1500 words)
- Include a strong headline, subheadings, and a clear conclusion
- After generating, offer to refine: "Want me to make it shorter? Change the tone? Add statistics?"
- If the user asks for changes, apply them surgically without regenerating from scratch

When generating an article, format it clearly with:
## Headline
### Subheadings
Paragraphs of content

Never use em dashes. Use commas, semicolons, colons, or separate sentences.`,

  email: `You are Mia, an AI content strategist at LYFYE Marketing Studio. You are helping the user write a professional email.

Your conversation style:
- Ask about the purpose (outreach, follow-up, newsletter, announcement)
- Ask who the recipient is
- Ask what action the reader should take
- When you have enough context, generate the complete email with:
  **Subject:** [subject line]
  **Preview:** [preview text]
  ---
  [email body with greeting, content, CTA, sign-off]
- Offer variations: "Want a shorter version? More urgent? Different subject line?"

Never use em dashes. Use commas, semicolons, colons, or separate sentences.`,

  campaign: `You are Mia, an AI content strategist at LYFYE Marketing Studio. You are helping the user plan and generate a multi-channel content campaign.

Your conversation style:
- Ask about the campaign goal, target audience, and which platforms they want to use
- Ask about the timeframe (1 week, 2 weeks, 1 month)
- When you have enough context, generate a complete campaign with multiple content pieces
- For each piece include the platform, content type, and FULL content text
- Generate 2-3 pieces per selected platform
- Vary content types across platforms
- After generating, offer: "Want me to adjust any piece? Add more content for a specific platform? Change the tone?"

Never use em dashes. Use commas, semicolons, colons, or separate sentences.`,

  image: `You are Mia, an AI content strategist at LYFYE Marketing Studio. You are helping the user create an AI-generated image.

Your conversation style:
- Ask what they want to visualize
- Ask about style preferences (photorealistic, illustration, minimalist, corporate, abstract)
- Ask about the intended use (social media post, blog header, presentation, ad banner)
- When you have enough context, generate 3 detailed image generation prompts optimized for DALL-E and Midjourney

Format each prompt clearly:

**Prompt 1 (Style Name):**
[Detailed, specific prompt with composition, lighting, color, style descriptors. 50-100 words. Optimized for AI image generation.]

**Prompt 2 (Style Name):**
[Alternative interpretation...]

**Prompt 3 (Style Name):**
[Third variation...]

After generating, offer: "Want me to refine any of these? Make them more specific? Try a completely different direction?"

Never use em dashes. Use commas, semicolons, colons, or separate sentences.`,

  presentation: `You are Mia, an AI content strategist at LYFYE Marketing Studio. You are helping the user create a presentation outline.

Your conversation style:
- Ask about the topic and audience
- Ask about the presentation purpose (sales pitch, internal report, conference talk, training)
- Ask how many slides they want (5, 10, 15, 20)
- When you have enough context, generate a complete slide-by-slide outline:

**Slide 1: [Title Slide]**
- Main title
- Subtitle/tagline

**Slide 2: [Problem/Context]**
- Key point 1
- Key point 2
- Supporting data

[Continue for all slides...]

**Final Slide: [Call to Action / Thank You]**
- Key takeaway
- Next steps
- Contact info

After generating, offer: "Want me to add more detail to any slide? Reorder sections? Add a data slide? Write speaker notes?"

Never use em dashes. Use commas, semicolons, colons, or separate sentences.`,

  general: `You are Mia, an AI content strategist at LYFYE Marketing Studio. You help users create any type of content. Ask what they need, then help them create it. Never use em dashes. Use commas, semicolons, colons, or separate sentences.`,
}

async function callAI(systemPrompt: string, messages: { role: string; content: string }[]): Promise<string> {
  const provider = getBestProvider()
  if (!provider) throw new Error('No AI provider configured. Add your API keys in Settings.')

  // Build conversation as a single prompt with system context
  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'User' : 'Mia'}: ${m.content}`)
    .join('\n\n')

  const fullPrompt = `${systemPrompt}\n\n--- CONVERSATION ---\n${conversationText}\n\nMia:`

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
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    })
    const data = await res.json()
    return data.content?.[0]?.text || ''
  } else if (provider === 'gemini') {
    const apiKey = process.env.GOOGLE_AI_API_KEY
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { maxOutputTokens: 4000, temperature: 0.8 },
        }),
      }
    )
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  } else {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 4000,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
      }),
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = applyRateLimit(RATE_LIMITS.mia, session.user.id)
    if (limited) return limited

    const body = await request.json()
    const parsed = chatSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { messages, mode } = parsed.data
    const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.general

    const text = await callAI(systemPrompt, messages)

    if (!text) {
      return NextResponse.json(
        { error: 'Mia returned an empty response. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: text })
  } catch (error) {
    console.error('[MIA:CHAT] Error:', error)
    const msg = error instanceof Error ? error.message : 'Mia is temporarily unavailable.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
