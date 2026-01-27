import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface Diagnostic {
  label: string
  value: string | boolean
  status: 'ok' | 'warning' | 'error' | 'info'
  hint?: string
}

/**
 * Check if demo mode is allowed - NEVER in production
 */
function isDemoAllowed(): boolean {
  const isProd = process.env.VERCEL_ENV === 'production'
  if (isProd) {
    return false
  }
  return process.env.DEMO_MODE === 'true'
}

/**
 * Check if running in production
 */
function isProduction(): boolean {
  return process.env.VERCEL_ENV === 'production'
}

export async function GET() {
  const diagnostics: Diagnostic[] = []
  const isProd = isProduction()

  // Environment indicator
  diagnostics.push({
    label: 'Environment',
    value: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    status: 'info',
    hint: isProd ? 'Running in production mode' : 'Running in development/preview mode',
  })

  // Check NEXTAUTH_SECRET
  const hasSecret = !!process.env.NEXTAUTH_SECRET
  diagnostics.push({
    label: 'NEXTAUTH_SECRET',
    value: hasSecret ? '••••••••' : 'Not configured',
    status: hasSecret ? 'ok' : 'error',
    hint: hasSecret ? 'Secret is configured' : 'CRITICAL: Required for JWT encryption',
  })

  // Check NEXTAUTH_URL
  const nextAuthUrl = process.env.NEXTAUTH_URL
  diagnostics.push({
    label: 'NEXTAUTH_URL',
    value: nextAuthUrl || 'Not configured',
    status: nextAuthUrl ? 'ok' : (isProd ? 'error' : 'warning'),
    hint: nextAuthUrl
      ? 'Base URL for auth callbacks'
      : isProd ? 'CRITICAL: Required for production' : 'Recommended for callbacks',
  })

  // Check Demo Mode - CRITICAL: must be disabled in production
  const demoModeEnvSet = process.env.DEMO_MODE === 'true'
  const isDemoEffective = isDemoAllowed()
  diagnostics.push({
    label: 'Demo Mode',
    value: isDemoEffective ? 'Enabled (non-prod only)' : 'Disabled',
    status: isProd && demoModeEnvSet ? 'warning' : (isDemoEffective ? 'info' : 'ok'),
    hint: isProd
      ? (demoModeEnvSet ? 'DEMO_MODE env is set but IGNORED in production' : 'Demo mode correctly disabled in production')
      : (isDemoEffective ? 'Demo mode active - bypasses auth in dev/preview only' : 'Real OAuth required'),
  })

  // Check Google OAuth
  const hasGoogle = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  diagnostics.push({
    label: 'Google OAuth',
    value: hasGoogle ? 'Configured' : 'Not configured',
    status: hasGoogle ? 'ok' : 'info',
    hint: hasGoogle
      ? 'Google sign-in enabled'
      : 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable',
  })

  // Check Microsoft OAuth
  const hasMicrosoft = !!(
    process.env.AZURE_AD_CLIENT_ID &&
    process.env.AZURE_AD_CLIENT_SECRET &&
    process.env.AZURE_AD_TENANT_ID
  )
  diagnostics.push({
    label: 'Microsoft OAuth',
    value: hasMicrosoft ? 'Configured' : 'Not configured',
    status: hasMicrosoft ? 'ok' : 'info',
    hint: hasMicrosoft
      ? 'Microsoft sign-in enabled'
      : 'Set AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, and AZURE_AD_TENANT_ID to enable',
  })

  // Check if any REAL auth method is available (excluding demo mode for production)
  const hasRealOAuth = hasGoogle || hasMicrosoft
  const hasAnyAuth = isProd ? hasRealOAuth : (hasRealOAuth || isDemoEffective)

  diagnostics.push({
    label: 'Authentication Available',
    value: hasAnyAuth,
    status: hasAnyAuth ? 'ok' : 'error',
    hint: hasAnyAuth
      ? (isProd ? 'Real OAuth provider configured for production' : 'Auth method available')
      : (isProd ? 'CRITICAL: No OAuth provider configured for production!' : 'No auth methods - configure OAuth or enable demo mode'),
  })

  // Production readiness check
  if (isProd) {
    const productionReady = hasSecret && !!nextAuthUrl && hasRealOAuth
    diagnostics.push({
      label: 'Production Ready',
      value: productionReady,
      status: productionReady ? 'ok' : 'error',
      hint: productionReady
        ? 'All production requirements met'
        : 'Missing: ' + [
            !hasSecret && 'NEXTAUTH_SECRET',
            !nextAuthUrl && 'NEXTAUTH_URL',
            !hasRealOAuth && 'OAuth Provider',
          ].filter(Boolean).join(', '),
    })
  }

  // Check current session
  try {
    const session = await getServerSession(authOptions)
    diagnostics.push({
      label: 'Current Session',
      value: session ? `${session.user?.email}` : 'No session',
      status: session ? 'ok' : 'info',
      hint: session ? 'User is authenticated' : 'No active session on server',
    })
  } catch (error) {
    diagnostics.push({
      label: 'Current Session',
      value: 'Error checking session',
      status: 'error',
      hint: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  // Vercel deployment info
  const isVercel = !!process.env.VERCEL
  diagnostics.push({
    label: 'Vercel Deployment',
    value: isVercel,
    status: 'info',
    hint: isVercel ? `Region: ${process.env.VERCEL_REGION || 'unknown'}` : 'Not on Vercel',
  })

  // Return 500 if production and missing critical config
  if (isProd && (!hasSecret || !nextAuthUrl || !hasRealOAuth)) {
    return NextResponse.json({
      success: false,
      error: 'Production environment missing critical configuration',
      diagnostics,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    diagnostics,
    timestamp: new Date().toISOString(),
  })
}
