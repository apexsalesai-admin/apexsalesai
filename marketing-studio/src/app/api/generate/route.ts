import { NextRequest, NextResponse } from 'next/server'

// Types
interface GenerateRequest {
  topic: string
  tone: string
  tones?: string[] // Multi-tone support
  channels: string[]
  contentType: string
  contentStyle?: string
  goal?: string
  template?: string
  additionalContext?: string
  model?: 'claude' | 'gpt4' | 'auto'
  seoKeywords?: string[]
  targetAudience?: string
  includeSeoAnalysis?: boolean
  videoOptions?: {
    length: 'short' | 'medium' | 'long'
    generateScript: boolean
    generateThumbnails: boolean
    generateTimestamps: boolean
  }
}

interface GeneratedContent {
  title: string
  body: string
  hashtags: string[]
  callToAction: string
  variations?: {
    channel: string
    title: string
    body: string
  }[]
  seoAnalysis?: {
    score: number
    readability: number
    keywordDensity: number
    suggestions: string[]
    metaDescription: string
    headlineScore: number
  }
  // Video-specific fields
  videoScript?: string
  videoHook?: string
  thumbnailIdeas?: string[]
  timestamps?: { time: string; label: string }[]
  bRollSuggestions?: string[]
}

// Content style descriptions
const STYLE_PROMPTS: Record<string, string> = {
  minimal: 'Keep it concise and impactful. Every word should earn its place. White space is your friend.',
  detailed: 'Be comprehensive. Cover all angles. Provide thorough explanations and examples.',
  listicle: 'Use numbered points or bullet lists. Make it scannable. Each point should be self-contained.',
  storytelling: 'Tell a story. Use narrative arc. Connect emotionally. Make the reader the hero.',
  'data-driven': 'Lead with statistics and research. Cite sources. Use numbers to prove points.',
}

// Tone descriptions for the AI
const TONE_PROMPTS: Record<string, string> = {
  professional: 'Use a professional, authoritative tone. Be concise and business-focused. Establish credibility.',
  friendly: 'Use a warm, approachable tone. Be conversational and relatable. Connect on a human level.',
  bold: 'Use a confident, attention-grabbing tone. Be provocative and memorable. Challenge conventional thinking.',
  educational: 'Use an informative, helpful tone. Break down complex topics. Provide actionable insights.',
  witty: 'Use a clever, engaging tone. Include subtle humor. Be memorable without being unprofessional.',
  inspirational: 'Use a motivating, uplifting tone. Inspire action and positive change. Share vision.',
  urgent: 'Use a time-sensitive, action-driven tone. Create FOMO. Drive immediate response.',
  storytelling: 'Use a narrative, personal tone. Share stories and experiences. Build emotional connection.',
}

// Channel-specific guidelines
const CHANNEL_GUIDELINES: Record<string, string> = {
  LINKEDIN: 'LinkedIn: Professional network. Use industry insights, thought leadership. 1-3 paragraphs optimal. Include line breaks for readability. Hooks that make people stop scrolling.',
  X_TWITTER: 'X/Twitter: Concise and punchy. Max 280 characters for main post. Strong hooks. Thread-friendly if longer.',
  YOUTUBE: 'YouTube: Video title should be clickable but not clickbait. Description should include timestamps, links, keywords. SEO optimized.',
  TIKTOK: 'TikTok: Casual, trendy, authentic. Hook in first 2 seconds concept. Use trending hashtags. Gen-Z friendly language.',
  FACEBOOK: 'Facebook: Community-focused, shareable content. Questions drive engagement. Longer content performs well.',
  INSTAGRAM: 'Instagram: Visual-first, lifestyle focused. Strong first line as hook. Use emojis strategically. 30 hashtags max.',
}

// Goal-specific prompts
const GOAL_PROMPTS: Record<string, string> = {
  awareness: 'Focus on brand visibility and reach. Make content highly shareable. Introduce brand values.',
  engagement: 'Optimize for comments, shares, and saves. Ask questions. Create controversy or curiosity.',
  leads: 'Include subtle lead magnets. Drive to landing pages. Offer value in exchange for contact info.',
  sales: 'Focus on conversion. Highlight benefits and social proof. Create urgency without being pushy.',
  education: 'Provide genuine value. Teach something actionable. Position as industry expert.',
  community: 'Foster belonging and conversation. Celebrate community wins. Be inclusive.',
}

// Use Anthropic Claude for generation
async function generateWithClaude(prompt: string, model: string = 'claude-sonnet-4-20250514'): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('Claude API error:', error)
    throw new Error(`Claude API error: ${response.status}`)
  }

  const data = await response.json()
  return data.content[0].text
}

// Use OpenAI GPT-4 for generation
async function generateWithOpenAI(prompt: string, model: string = 'gpt-4o'): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are Mia, an expert AI content strategist for Lyfye Marketing Studio. You create high-converting, engaging content that drives measurable results. You understand SEO, social algorithms, and conversion psychology.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 4096,
      temperature: 0.8,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('OpenAI API error:', error)
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json()
    const {
      topic,
      tone,
      tones = [],
      channels,
      contentType,
      contentStyle = 'detailed',
      goal,
      template,
      additionalContext,
      model = 'auto',
      seoKeywords = [],
      targetAudience,
      includeSeoAnalysis = true,
      videoOptions,
    } = body

    // Build the prompt
    const channelGuidelines = channels
      .map(ch => CHANNEL_GUIDELINES[ch] || '')
      .filter(Boolean)
      .join('\n')

    const goalPrompt = goal ? GOAL_PROMPTS[goal] || '' : ''
    const stylePrompt = STYLE_PROMPTS[contentStyle] || ''

    // Build tone prompt for multi-tone support
    let tonePrompt: string
    if (tones.length > 1) {
      const toneDescriptions = tones.map(t => TONE_PROMPTS[t] || t).join('\n- ')
      tonePrompt = `Blend these tones seamlessly:\n- ${toneDescriptions}\n\nThe content should feel natural, not like a mix of separate styles. Find the common thread between these voices.`
    } else {
      tonePrompt = TONE_PROMPTS[tones[0] || tone] || tone
    }

    // Build video-specific output format if needed
    const isVideoContent = contentType === 'video' || contentType === 'reel'
    let videoOutputFormat = ''
    if (isVideoContent && videoOptions) {
      const videoLengthMap = { short: '15-60 seconds', medium: '2-5 minutes', long: '10+ minutes' }
      videoOutputFormat = `
  ${videoOptions.generateScript ? `"videoScript": "Detailed scene-by-scene script with directions, dialogue, and timing. Format as [SCENE 1: Description] [DIALOGUE: What to say] [VISUAL: What to show]",` : ''}
  "videoHook": "Attention-grabbing first 3 seconds that makes viewers stop scrolling",
  ${videoOptions.generateThumbnails ? `"thumbnailIdeas": ["Thumbnail idea 1 with text overlay suggestion", "Thumbnail idea 2 with emotion/expression", "Thumbnail idea 3 with curiosity gap"],` : ''}
  ${videoOptions.generateTimestamps ? `"timestamps": [{"time": "0:00", "label": "Introduction"}, {"time": "0:30", "label": "Main point 1"}, {"time": "2:00", "label": "Key insight"}],` : ''}
  "bRollSuggestions": ["B-roll footage idea 1", "B-roll footage idea 2", "B-roll footage idea 3"],`

      // Add video context to prompt
      videoOutputFormat = `
## Video Requirements
- Target Length: ${videoLengthMap[videoOptions.length]}
- Hook viewers in first 3 seconds
- Include pattern interrupts every 30 seconds
- End with clear call-to-action
${videoOptions.generateScript ? '- Generate detailed scene-by-scene script' : ''}
${videoOptions.generateThumbnails ? '- Suggest 3 clickable thumbnail concepts' : ''}
${videoOptions.generateTimestamps ? '- Include chapter timestamps' : ''}
` + videoOutputFormat
    }

    const prompt = `You are Mia, the AI content strategist for Lyfye Marketing Studio. Generate premium, high-converting marketing content.

## Brand Context
Lyfye is an enterprise AI sales enablement platform that helps B2B companies automate their sales and marketing workflows. Our key value props:
- AI-powered sales agents (Max for outreach, Mia for content)
- Enterprise-grade security and compliance
- Measurable ROI: $125K+ revenue generated, 22 meetings booked, 127 posts created
- Trusted by industry leaders

## Content Request
Topic: ${topic}
Content Type: ${contentType}
Content Style: ${stylePrompt}
Tone: ${tonePrompt}
Target Channels: ${channels.join(', ')}
${goal ? `Content Goal: ${goalPrompt}` : ''}
${template ? `Template Type: ${template}` : ''}
${targetAudience ? `Target Audience: ${targetAudience}` : ''}
${seoKeywords.length > 0 ? `SEO Keywords to Include: ${seoKeywords.join(', ')}` : ''}
${additionalContext ? `Additional Context: ${additionalContext}` : ''}
${isVideoContent && videoOptions ? videoOutputFormat.split('"videoScript"')[0] : ''}

## Channel-Specific Guidelines
${channelGuidelines}

## Output Format
Return a JSON object with this exact structure (no markdown, just raw JSON):
{
  "title": "Compelling, SEO-optimized title (60 chars ideal for search)",
  "body": "Main content body with:\n- Strong hook in first line\n- Value-driven content\n- Strategic emoji usage\n- Clear structure with line breaks\n- Natural keyword integration",
  "hashtags": ["5-10 relevant hashtags", "mix of popular and niche", "brand hashtags"],
  "callToAction": "Clear, action-oriented CTA that aligns with the content goal",
  "variations": [
    ${channels.map(ch => `{
      "channel": "${ch}",
      "title": "Optimized title for ${ch} (respect character limits)",
      "body": "Content optimized for ${ch}'s algorithm and audience expectations"
    }`).join(',\n    ')}
  ]${isVideoContent && videoOptions ? `,
  ${videoOptions.generateScript ? '"videoScript": "Detailed scene-by-scene script with directions, dialogue, and timing",' : ''}
  "videoHook": "Attention-grabbing first 3 seconds",
  ${videoOptions.generateThumbnails ? '"thumbnailIdeas": ["Thumbnail idea 1", "Thumbnail idea 2", "Thumbnail idea 3"],' : ''}
  ${videoOptions.generateTimestamps ? '"timestamps": [{"time": "0:00", "label": "Intro"}, {"time": "0:30", "label": "Main point"}],' : ''}
  "bRollSuggestions": ["B-roll idea 1", "B-roll idea 2"]` : ''}${includeSeoAnalysis ? `,
  "seoAnalysis": {
    "score": 85,
    "readability": 78,
    "keywordDensity": 2.5,
    "headlineScore": 82,
    "suggestions": [
      "Actionable SEO improvement suggestion 1",
      "Actionable SEO improvement suggestion 2",
      "Actionable SEO improvement suggestion 3"
    ],
    "metaDescription": "Compelling 155-char meta description for search results"
  }` : ''}
}

## Quality Requirements
1. Hook readers in the first 2 seconds / 7 words
2. Provide genuine value (not salesy)
3. Optimize for platform algorithms
4. Include social proof where natural
5. Drive the specified content goal
6. SEO optimized for discoverability
7. Mobile-first formatting
${isVideoContent ? '8. Video-first storytelling with visual thinking' : ''}

Return ONLY the JSON object, no additional text or markdown.`

    let result: string
    let usedModel: string

    // Generate based on selected model
    if (model === 'gpt4') {
      result = await generateWithOpenAI(prompt, 'gpt-4o')
      usedModel = 'gpt-4o'
    } else if (model === 'claude') {
      result = await generateWithClaude(prompt, 'claude-sonnet-4-20250514')
      usedModel = 'claude-sonnet-4-20250514'
    } else {
      // Auto mode: try Claude first, fall back to OpenAI
      try {
        result = await generateWithClaude(prompt)
        usedModel = 'claude-sonnet-4-20250514'
      } catch (claudeError) {
        console.log('Claude failed, falling back to OpenAI:', claudeError)
        result = await generateWithOpenAI(prompt)
        usedModel = 'gpt-4o'
      }
    }

    // Parse the JSON response
    let cleanedResult = result.trim()
    if (cleanedResult.startsWith('```json')) {
      cleanedResult = cleanedResult.slice(7)
    }
    if (cleanedResult.startsWith('```')) {
      cleanedResult = cleanedResult.slice(3)
    }
    if (cleanedResult.endsWith('```')) {
      cleanedResult = cleanedResult.slice(0, -3)
    }
    cleanedResult = cleanedResult.trim()

    const content: GeneratedContent = JSON.parse(cleanedResult)

    return NextResponse.json({
      success: true,
      content,
      model: usedModel,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Generation error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate content',
      },
      { status: 500 }
    )
  }
}
