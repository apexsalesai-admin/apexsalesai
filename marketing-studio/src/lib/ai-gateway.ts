/**
 * Unified AI Gateway
 *
 * Provides a single interface for AI content generation with:
 * - Provider fallback (Anthropic → OpenAI → Error)
 * - Brand voice integration
 * - Consistent error handling
 */

export interface AIProviderStatus {
  id: 'anthropic' | 'openai' | 'gemini'
  name: string
  configured: boolean
  status: 'ready' | 'error' | 'unconfigured'
  message?: string
}

export interface BrandVoice {
  brandName?: string
  tone?: string
  targetAudience?: string
  industryContext?: string
  forbiddenPhrases?: string
  ctaStyle?: string
}

export interface GenerateContentRequest {
  topic: string
  channel: string
  channels?: string[]
  goal?: string
  format?: string
  tone?: string
  length?: 'short' | 'medium' | 'long'
  constraints?: string[]
  brandVoice?: BrandVoice
  seoKeywords?: string[]
  includeVariations?: boolean
  includeSeoAnalysis?: boolean
}

export interface GeneratedContent {
  title: string
  body: string
  hashtags: string[]
  callToAction: string
  variations?: { channel: string; title: string; body: string }[]
  seoAnalysis?: {
    score: number
    readability: number
    keywordDensity: number
    headlineScore: number
    suggestions: string[]
    metaDescription: string
  }
}

export interface GenerateContentResult {
  success: boolean
  content?: GeneratedContent
  provider?: string
  model?: string
  error?: string
  errorCode?: 'NO_PROVIDER' | 'API_ERROR' | 'PARSE_ERROR' | 'UNKNOWN'
}

// Check which providers are configured (server-side only)
export function getConfiguredProviders(): AIProviderStatus[] {
  const providers: AIProviderStatus[] = []

  // Check Anthropic
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  providers.push({
    id: 'anthropic',
    name: 'Anthropic Claude',
    configured: !!anthropicKey,
    status: anthropicKey ? 'ready' : 'unconfigured',
    message: anthropicKey ? 'API key configured' : 'ANTHROPIC_API_KEY not set',
  })

  // Check OpenAI
  const openaiKey = process.env.OPENAI_API_KEY
  providers.push({
    id: 'openai',
    name: 'OpenAI GPT-4',
    configured: !!openaiKey,
    status: openaiKey ? 'ready' : 'unconfigured',
    message: openaiKey ? 'API key configured' : 'OPENAI_API_KEY not set',
  })

  // Check Gemini
  const geminiKey = process.env.GOOGLE_AI_API_KEY
  providers.push({
    id: 'gemini',
    name: 'Google Gemini',
    configured: !!geminiKey,
    status: geminiKey ? 'ready' : 'unconfigured',
    message: geminiKey ? 'API key configured' : 'GOOGLE_AI_API_KEY not set',
  })

  return providers
}

// Check if any provider is configured
export function hasAnyProvider(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GOOGLE_AI_API_KEY)
}

// Get the best available provider
export function getBestProvider(): 'anthropic' | 'openai' | 'gemini' | null {
  const defaultProvider = process.env.AI_PROVIDER_DEFAULT || 'anthropic'
  const fallbackProvider = process.env.AI_PROVIDER_FALLBACK || 'openai'

  if (defaultProvider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    return 'anthropic'
  }
  if (defaultProvider === 'openai' && process.env.OPENAI_API_KEY) {
    return 'openai'
  }
  if (defaultProvider === 'gemini' && process.env.GOOGLE_AI_API_KEY) {
    return 'gemini'
  }
  if (fallbackProvider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    return 'anthropic'
  }
  if (fallbackProvider === 'openai' && process.env.OPENAI_API_KEY) {
    return 'openai'
  }
  if (fallbackProvider === 'gemini' && process.env.GOOGLE_AI_API_KEY) {
    return 'gemini'
  }

  // Last resort: try any configured provider
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.GOOGLE_AI_API_KEY) return 'gemini'

  return null
}

// Generate with Anthropic Claude
async function generateWithAnthropic(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic API error (${response.status}): ${error}`)
  }

  const data = await response.json()
  return data.content[0].text
}

// Generate with OpenAI GPT-4
async function generateWithOpenAI(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 4096,
      temperature: 0.8,
      messages: [
        {
          role: 'system',
          content: 'You are Mia, an expert AI content strategist. You create high-converting, engaging content that drives measurable results.',
        },
        { role: 'user', content: prompt },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error (${response.status}): ${error}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

// Generate with Google Gemini
async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY not configured')

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.8,
        },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Gemini API error (${response.status}): ${error}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// Build the content generation prompt
function buildPrompt(request: GenerateContentRequest): string {
  const { topic, channel, channels, goal, format, tone, brandVoice, seoKeywords, includeVariations, includeSeoAnalysis } = request

  const targetChannels = channels || [channel]

  // Channel-specific guidelines
  const channelGuidelines: Record<string, string> = {
    LINKEDIN: 'LinkedIn: Professional network. Use industry insights, thought leadership. 1-3 paragraphs optimal.',
    X_TWITTER: 'X/Twitter: Concise and punchy. Max 280 characters for main post. Strong hooks.',
    YOUTUBE: 'YouTube: Video title should be clickable. Description with timestamps and keywords.',
    TIKTOK: 'TikTok: Casual, trendy, authentic. Hook in first 2 seconds.',
    FACEBOOK: 'Facebook: Community-focused, shareable content. Questions drive engagement.',
    INSTAGRAM: 'Instagram: Visual-first, lifestyle focused. Strong first line as hook.',
  }

  // Goal prompts
  const goalPrompts: Record<string, string> = {
    awareness: 'Focus on brand visibility and reach. Make content highly shareable.',
    engagement: 'Optimize for comments, shares, and saves. Ask questions.',
    leads: 'Include subtle lead magnets. Drive to landing pages.',
    sales: 'Focus on conversion. Highlight benefits and social proof.',
    education: 'Provide genuine value. Teach something actionable.',
    community: 'Foster belonging and conversation. Be inclusive.',
  }

  // Brand voice integration
  let brandContext = ''
  if (brandVoice) {
    brandContext = `
## Brand Voice
${brandVoice.brandName ? `- Brand Name: ${brandVoice.brandName}` : ''}
${brandVoice.tone ? `- Tone: ${brandVoice.tone}` : ''}
${brandVoice.targetAudience ? `- Target Audience: ${brandVoice.targetAudience}` : ''}
${brandVoice.industryContext ? `- Industry: ${brandVoice.industryContext}` : ''}
${brandVoice.forbiddenPhrases ? `- Avoid these phrases: ${brandVoice.forbiddenPhrases}` : ''}
${brandVoice.ctaStyle ? `- CTA Style: ${brandVoice.ctaStyle}` : ''}
`
  }

  return `You are Mia, the AI content strategist for Lyfye Marketing Studio. Generate premium, high-converting marketing content.

## Content Request
Topic: ${topic}
Target Channels: ${targetChannels.join(', ')}
${format ? `Content Format: ${format}` : ''}
${tone ? `Tone: ${tone}` : ''}
${goal ? `Goal: ${goalPrompts[goal] || goal}` : ''}
${seoKeywords?.length ? `SEO Keywords: ${seoKeywords.join(', ')}` : ''}
${brandContext}

## Channel Guidelines
${targetChannels.map(ch => channelGuidelines[ch] || '').filter(Boolean).join('\n')}

## Output Format
Return a JSON object with this exact structure (no markdown, just raw JSON):
{
  "title": "Compelling, SEO-optimized title",
  "body": "Main content body with strong hook, value-driven content, strategic emoji usage",
  "hashtags": ["5-10 relevant hashtags"],
  "callToAction": "Clear, action-oriented CTA"${includeVariations ? `,
  "variations": [${targetChannels.map(ch => `{"channel": "${ch}", "title": "Optimized for ${ch}", "body": "Content for ${ch}"}`).join(', ')}]` : ''}${includeSeoAnalysis ? `,
  "seoAnalysis": {
    "score": 85,
    "readability": 78,
    "keywordDensity": 2.5,
    "headlineScore": 82,
    "suggestions": ["Suggestion 1", "Suggestion 2"],
    "metaDescription": "155-char meta description"
  }` : ''}
}

Return ONLY the JSON object, no additional text or markdown.`
}

// Parse AI response to extract JSON
function parseResponse(response: string): GeneratedContent {
  let cleaned = response.trim()

  // Remove markdown code blocks if present
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  cleaned = cleaned.trim()

  return JSON.parse(cleaned)
}

/**
 * Main content generation function with automatic fallback
 */
export async function generateContent(request: GenerateContentRequest): Promise<GenerateContentResult> {
  // Check if any provider is configured
  const provider = getBestProvider()
  if (!provider) {
    return {
      success: false,
      error: 'No AI provider configured. Please add your API keys in Settings → AI Providers.',
      errorCode: 'NO_PROVIDER',
    }
  }

  const prompt = buildPrompt(request)
  let response: string
  let usedProvider: string
  let usedModel: string

  // Try primary provider, then fallback (Anthropic → OpenAI → Gemini)
  const fallbackOrder: ('anthropic' | 'openai' | 'gemini')[] =
    provider === 'gemini'
      ? ['gemini', 'anthropic', 'openai']
      : provider === 'openai'
        ? ['openai', 'anthropic', 'gemini']
        : ['anthropic', 'openai', 'gemini']

  for (const p of fallbackOrder) {
    try {
      if (p === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
        response = await generateWithAnthropic(prompt)
        usedProvider = 'anthropic'
        usedModel = 'claude-sonnet-4-20250514'
        break
      }
      if (p === 'openai' && process.env.OPENAI_API_KEY) {
        response = await generateWithOpenAI(prompt)
        usedProvider = 'openai'
        usedModel = 'gpt-4o'
        break
      }
      if (p === 'gemini' && process.env.GOOGLE_AI_API_KEY) {
        response = await generateWithGemini(prompt)
        usedProvider = 'gemini'
        usedModel = 'gemini-2.0-flash'
        break
      }
    } catch (error) {
      console.error(`Provider ${p} failed:`, error)
      // Continue to next provider
    }
  }

  if (!response!) {
    return {
      success: false,
      error: 'All AI providers failed. Please check your API keys and try again.',
      errorCode: 'API_ERROR',
    }
  }

  // Parse the response
  try {
    const content = parseResponse(response)
    return {
      success: true,
      content,
      provider: usedProvider!,
      model: usedModel!,
    }
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError)
    return {
      success: false,
      error: 'Failed to parse AI response. Please try again.',
      errorCode: 'PARSE_ERROR',
    }
  }
}

/**
 * Test a specific provider with a minimal prompt
 */
export async function testProvider(providerId: 'anthropic' | 'openai' | 'gemini'): Promise<{
  success: boolean
  latencyMs: number
  message?: string
  error?: string
}> {
  const startTime = Date.now()
  const names: Record<string, string> = {
    anthropic: 'Anthropic Claude',
    openai: 'OpenAI GPT-4',
    gemini: 'Google Gemini',
  }

  try {
    if (providerId === 'anthropic') {
      if (!process.env.ANTHROPIC_API_KEY) {
        return { success: false, latencyMs: 0, error: 'ANTHROPIC_API_KEY not configured' }
      }
      await generateWithAnthropic('Say "OK" and nothing else.')
    } else if (providerId === 'openai') {
      if (!process.env.OPENAI_API_KEY) {
        return { success: false, latencyMs: 0, error: 'OPENAI_API_KEY not configured' }
      }
      await generateWithOpenAI('Say "OK" and nothing else.')
    } else if (providerId === 'gemini') {
      if (!process.env.GOOGLE_AI_API_KEY) {
        return { success: false, latencyMs: 0, error: 'GOOGLE_AI_API_KEY not configured' }
      }
      await generateWithGemini('Say "OK" and nothing else.')
    }

    return {
      success: true,
      latencyMs: Date.now() - startTime,
      message: `${names[providerId]} is working`,
    }
  } catch (error) {
    return {
      success: false,
      latencyMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Test failed',
    }
  }
}
