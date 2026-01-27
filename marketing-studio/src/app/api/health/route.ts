import { NextResponse } from 'next/server'

/**
 * Health Check Endpoint
 *
 * Returns system health status for monitoring and deployment verification.
 * This endpoint is public and does not require authentication.
 */
export async function GET() {
  const isProd = process.env.VERCEL_ENV === 'production'

  // Check required environment variables
  const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET
  const hasNextAuthUrl = !!process.env.NEXTAUTH_URL

  // Check OAuth providers
  const hasGoogleOAuth = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  )
  const hasMicrosoftOAuth = !!(
    process.env.AZURE_AD_CLIENT_ID &&
    process.env.AZURE_AD_CLIENT_SECRET &&
    process.env.AZURE_AD_TENANT_ID
  )
  const hasAnyOAuth = hasGoogleOAuth || hasMicrosoftOAuth

  // Check AI providers
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY
  const hasAnyAI = hasAnthropicKey || hasOpenAIKey

  // Check database
  const hasDatabaseUrl = !!process.env.DATABASE_URL

  // Demo mode check
  const demoModeEnvSet = process.env.DEMO_MODE === 'true'
  const demoModeEffective = !isProd && demoModeEnvSet

  // Determine overall health
  const checks = {
    auth: {
      secret: hasNextAuthSecret,
      url: hasNextAuthUrl,
      oauth: hasAnyOAuth,
      google: hasGoogleOAuth,
      microsoft: hasMicrosoftOAuth,
    },
    ai: {
      configured: hasAnyAI,
      anthropic: hasAnthropicKey,
      openai: hasOpenAIKey,
    },
    database: {
      configured: hasDatabaseUrl,
    },
    environment: {
      vercel: !!process.env.VERCEL,
      production: isProd,
      region: process.env.VERCEL_REGION || null,
      demoModeIgnored: isProd && demoModeEnvSet,
    },
  }

  // Production health requires: auth secret, auth url, oauth, and AI
  const isHealthy = isProd
    ? hasNextAuthSecret && hasNextAuthUrl && hasAnyOAuth && hasAnyAI
    : hasNextAuthSecret || demoModeEffective

  const status = isHealthy ? 'healthy' : 'degraded'

  const response = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
    checks,
  }

  // Return 503 if unhealthy in production
  if (!isHealthy && isProd) {
    return NextResponse.json(response, { status: 503 })
  }

  return NextResponse.json(response)
}
