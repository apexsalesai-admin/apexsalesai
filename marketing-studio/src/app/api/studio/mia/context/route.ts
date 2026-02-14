/**
 * Mia Creative Context API (Wave 1)
 *
 * POST /api/studio/mia/context
 * Fetches brand voice + last 5 content items, generates personalized greeting.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { getBrandVoiceForWorkspace } from '@/lib/brand-voice'
import { getBestProvider } from '@/lib/ai-gateway'
import type { MiaContextRequest, MiaContextResponse } from '@/lib/studio/mia-creative-types'

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
        max_tokens: 512,
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
          generationConfig: { maxOutputTokens: 512, temperature: 0.8 },
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
        max_tokens: 512,
        messages: [
          { role: 'system', content: 'You are Mia, a friendly AI content strategist. Be warm and concise.' },
          { role: 'user', content: prompt },
        ],
      }),
    })
    if (!res.ok) throw new Error(`OpenAI API error (${res.status})`)
    const data = await res.json()
    return data.choices[0].message.content
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, greeting: '', brandName: '', recentTopics: [], error: 'Unauthorized' } satisfies MiaContextResponse, { status: 401 })
    }

    const body: MiaContextRequest = await request.json()
    const workspace = await getOrCreateWorkspace(session.user.id)
    const brandVoice = await getBrandVoiceForWorkspace(workspace.id)

    // Fetch last 5 content items for personalization
    const recentContent = await prisma.scheduledContent.findMany({
      where: { createdById: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { title: true, aiTopic: true, contentType: true },
    })

    const recentTopics = recentContent
      .map((c) => c.aiTopic || c.title)
      .filter(Boolean)

    // Generate personalized greeting via small AI call
    const userName = session.user.name?.split(' ')[0] || 'there'
    const channelList = body.channels.join(', ') || 'social media'
    const brandContext = brandVoice.brandName
      ? `Their brand is "${brandVoice.brandName}" in the ${brandVoice.industry || 'business'} industry.`
      : ''
    const recentContext = recentTopics.length > 0
      ? `They recently wrote about: ${recentTopics.slice(0, 3).join(', ')}.`
      : ''

    const prompt = `You are Mia, a warm, creative AI content strategist. Write a personalized 2-sentence greeting for ${userName} who is creating ${body.contentType} content for ${channelList}. ${brandContext} ${recentContext}

Be encouraging, reference their brand or past topics if available. Keep it under 40 words. Do NOT use markdown, just plain text.`

    let greeting: string
    try {
      greeting = await callAI(prompt)
    } catch {
      // Fallback greeting when AI is unavailable
      greeting = `Hey ${userName}! Let's create something amazing for ${channelList} today. I'll guide you through the process step by step.`
    }

    const response: MiaContextResponse = {
      success: true,
      greeting,
      brandName: brandVoice.brandName || '',
      recentTopics,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[API:mia:context] Error:', error)
    return NextResponse.json(
      { success: false, greeting: '', brandName: '', recentTopics: [], error: error instanceof Error ? error.message : 'Context fetch failed' } satisfies MiaContextResponse,
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
