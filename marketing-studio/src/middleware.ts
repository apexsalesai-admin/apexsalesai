/**
 * Middleware for Route Protection
 *
 * Protected routes: /studio/*, /onboarding/*
 * Public routes: /, /login, /api/auth/*
 *
 * PRODUCTION RULES:
 * - DEMO_MODE is NEVER allowed in production (VERCEL_ENV=production)
 * - Real OAuth session required for all protected routes
 * - No X-Demo-Mode header in production
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Routes that require authentication
const protectedRoutes = ['/studio', '/onboarding']

// Routes that are always public
const publicRoutes = ['/', '/login', '/api/auth', '/api/diagnostics', '/api/ai/status', '/api/health']

/**
 * Check if demo mode is allowed - NEVER in production
 */
function isDemoAllowed(): boolean {
  const isProd = process.env.VERCEL_ENV === 'production'
  if (isProd) {
    return false // NEVER allow demo in production
  }
  return process.env.DEMO_MODE === 'true'
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next()
  }

  // Allow static assets and API routes (except protected ones)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )

  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // Check for demo mode - ONLY allowed in non-production
  if (isDemoAllowed()) {
    const response = NextResponse.next()
    // Add demo mode header ONLY in non-production
    response.headers.set('x-demo-mode', 'true')
    return response
  }

  // Get the session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  // Redirect to login if no token
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // User is authenticated, allow access
  const response = NextResponse.next()

  // Add user info to headers for API routes to use
  response.headers.set('x-user-id', token.id as string)
  response.headers.set('x-user-email', token.email as string)
  response.headers.set('x-user-role', (token.role as string) || 'VIEWER')

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
