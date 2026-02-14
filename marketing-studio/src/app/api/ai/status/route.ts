import { NextRequest, NextResponse } from 'next/server'

interface ProviderStatus {
  id: string
  name: string
  configured: boolean
  status: 'ready' | 'error' | 'unconfigured'
  message?: string
  latencyMs?: number
}

// GET /api/ai/status - Check AI provider status
export async function GET() {
  const providers: ProviderStatus[] = []

  // Check Anthropic
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (anthropicKey) {
    providers.push({
      id: 'anthropic',
      name: 'Anthropic Claude',
      configured: true,
      status: 'ready',
      message: 'API key configured',
    })
  } else {
    providers.push({
      id: 'anthropic',
      name: 'Anthropic Claude',
      configured: false,
      status: 'unconfigured',
      message: 'ANTHROPIC_API_KEY not set',
    })
  }

  // Check OpenAI
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) {
    providers.push({
      id: 'openai',
      name: 'OpenAI GPT-4',
      configured: true,
      status: 'ready',
      message: 'API key configured',
    })
  } else {
    providers.push({
      id: 'openai',
      name: 'OpenAI GPT-4',
      configured: false,
      status: 'unconfigured',
      message: 'OPENAI_API_KEY not set',
    })
  }

  // Check Gemini
  const geminiKey = process.env.GOOGLE_AI_API_KEY
  if (geminiKey) {
    providers.push({
      id: 'gemini',
      name: 'Google Gemini',
      configured: true,
      status: 'ready',
      message: 'API key configured',
    })
  } else {
    providers.push({
      id: 'gemini',
      name: 'Google Gemini',
      configured: false,
      status: 'unconfigured',
      message: 'GOOGLE_AI_API_KEY not set',
    })
  }

  const defaultProvider = process.env.AI_PROVIDER_DEFAULT || 'anthropic'
  const fallbackProvider = process.env.AI_PROVIDER_FALLBACK || 'openai'

  return NextResponse.json({
    success: true,
    data: {
      providers,
      defaultProvider,
      fallbackProvider,
      anyConfigured: providers.some((p) => p.configured),
    },
  })
}

// POST /api/ai/status - Test a specific provider
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { provider } = body

  const startTime = Date.now()

  try {
    if (provider === 'anthropic') {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (!apiKey) {
        return NextResponse.json({
          success: false,
          error: 'ANTHROPIC_API_KEY not configured',
        })
      }

      // Simple test call
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say "OK" and nothing else.' }],
        }),
      })

      const latencyMs = Date.now() - startTime

      if (!response.ok) {
        const error = await response.text()
        return NextResponse.json({
          success: false,
          error: `API error: ${response.status}`,
          details: error,
          latencyMs,
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Anthropic Claude is working',
        latencyMs,
      })
    }

    if (provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) {
        return NextResponse.json({
          success: false,
          error: 'OPENAI_API_KEY not configured',
        })
      }

      // Simple test call
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Say "OK" and nothing else.' }],
        }),
      })

      const latencyMs = Date.now() - startTime

      if (!response.ok) {
        const error = await response.text()
        return NextResponse.json({
          success: false,
          error: `API error: ${response.status}`,
          details: error,
          latencyMs,
        })
      }

      return NextResponse.json({
        success: true,
        message: 'OpenAI GPT-4 is working',
        latencyMs,
      })
    }

    if (provider === 'gemini') {
      const apiKey = process.env.GOOGLE_AI_API_KEY
      if (!apiKey) {
        return NextResponse.json({
          success: false,
          error: 'GOOGLE_AI_API_KEY not configured',
        })
      }

      // Simple test call
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say "OK" and nothing else.' }] }],
            generationConfig: { maxOutputTokens: 10 },
          }),
        }
      )

      const latencyMs = Date.now() - startTime

      if (!response.ok) {
        const error = await response.text()
        return NextResponse.json({
          success: false,
          error: `API error: ${response.status}`,
          details: error,
          latencyMs,
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Google Gemini is working',
        latencyMs,
      })
    }

    return NextResponse.json({
      success: false,
      error: `Unknown provider: ${provider}`,
    })
  } catch (error) {
    const latencyMs = Date.now() - startTime
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test failed',
      latencyMs,
    })
  }
}
