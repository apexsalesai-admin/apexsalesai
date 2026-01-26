import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface Diagnostic {
  label: string
  value: string | boolean
  status: 'ok' | 'warning' | 'error' | 'info'
  hint?: string
}

export async function GET() {
  const diagnostics: Diagnostic[] = []

  // Check NEXTAUTH_SECRET
  const hasSecret = !!process.env.NEXTAUTH_SECRET
  diagnostics.push({
    label: 'NEXTAUTH_SECRET',
    value: hasSecret ? '••••••••' : 'Not configured',
    status: hasSecret ? 'ok' : 'error',
    hint: hasSecret ? 'Secret is configured' : 'Required for JWT encryption. Generate with: openssl rand -base64 32',
  })

  // Check NEXTAUTH_URL
  const nextAuthUrl = process.env.NEXTAUTH_URL
  diagnostics.push({
    label: 'NEXTAUTH_URL',
    value: nextAuthUrl || 'Not configured',
    status: nextAuthUrl ? 'ok' : 'warning',
    hint: nextAuthUrl
      ? 'Base URL for auth callbacks'
      : 'Recommended for production. Set to your deployment URL.',
  })

  // Check Demo Mode
  const isDemoMode = process.env.DEMO_MODE === 'true'
  diagnostics.push({
    label: 'Demo Mode',
    value: isDemoMode,
    status: isDemoMode ? 'warning' : 'info',
    hint: isDemoMode
      ? 'Demo mode enabled - auth is bypassed'
      : 'Demo mode disabled - real authentication required',
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

  // Check if any auth method is available
  const hasAnyAuth = isDemoMode || hasGoogle || hasMicrosoft
  diagnostics.push({
    label: 'Authentication Available',
    value: hasAnyAuth,
    status: hasAnyAuth ? 'ok' : 'error',
    hint: hasAnyAuth
      ? 'At least one auth method is available'
      : 'No authentication methods configured! Users cannot log in.',
  })

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

  // Environment
  diagnostics.push({
    label: 'Environment',
    value: process.env.NODE_ENV || 'unknown',
    status: 'info',
  })

  // Vercel deployment
  const isVercel = !!process.env.VERCEL
  diagnostics.push({
    label: 'Vercel Deployment',
    value: isVercel,
    status: 'info',
    hint: isVercel ? `Region: ${process.env.VERCEL_REGION || 'unknown'}` : 'Not on Vercel',
  })

  return NextResponse.json({
    success: true,
    diagnostics,
    timestamp: new Date().toISOString(),
  })
}
