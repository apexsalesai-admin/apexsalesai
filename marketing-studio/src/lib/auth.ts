/**
 * NextAuth Configuration
 *
 * Supports:
 * - Google OAuth
 * - Microsoft (Azure AD) OAuth
 * - Demo Mode (ONLY in non-production environments)
 *
 * PRODUCTION RULES:
 * - DEMO_MODE is NEVER allowed when VERCEL_ENV=production
 * - At least one real OAuth provider must be configured
 *
 * Environment Variables Required:
 * - NEXTAUTH_SECRET: Random secret for JWT encryption
 * - NEXTAUTH_URL: Base URL (e.g., https://studio.lyfye.com)
 *
 * For Google OAuth:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 *
 * For Microsoft OAuth:
 * - AZURE_AD_CLIENT_ID
 * - AZURE_AD_CLIENT_SECRET
 * - AZURE_AD_TENANT_ID
 */

import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AzureADProvider from 'next-auth/providers/azure-ad'
import CredentialsProvider from 'next-auth/providers/credentials'

// Session duration: 8 hours in seconds
const SESSION_MAX_AGE = 8 * 60 * 60

// Structured error logging for OAuth events
function logAuthEvent(
  event: 'signin' | 'callback' | 'session' | 'error',
  details: Record<string, unknown>
) {
  const timestamp = new Date().toISOString()
  const prefix = `[NextAuth:${event.toUpperCase()}]`

  if (event === 'error') {
    console.error(prefix, timestamp, JSON.stringify(details))
  } else {
    console.log(prefix, timestamp, JSON.stringify(details))
  }
}

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

// Demo user for DEMO_MODE (non-production only)
const DEMO_USER = {
  id: 'demo-user',
  name: 'Demo User',
  email: 'demo@lyfye.com',
  image: null,
  role: 'ADMIN' as const,
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Google OAuth
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),

    // Microsoft Azure AD OAuth
    ...(process.env.AZURE_AD_CLIENT_ID &&
    process.env.AZURE_AD_CLIENT_SECRET &&
    process.env.AZURE_AD_TENANT_ID
      ? [
          AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
            tenantId: process.env.AZURE_AD_TENANT_ID,
          }),
        ]
      : []),

    // Demo Mode Credentials Provider - ONLY in non-production
    ...(isDemoAllowed()
      ? [
          CredentialsProvider({
            id: 'demo',
            name: 'Demo Mode',
            credentials: {},
            async authorize() {
              // In demo mode (non-production only), return the demo user
              return DEMO_USER
            },
          }),
        ]
      : []),
  ],

  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      logAuthEvent('signin', {
        provider: account?.provider,
        email: user?.email,
        success: true,
      })
      return true
    },

    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.role = (user as typeof DEMO_USER).role || 'VIEWER'
        token.provider = account?.provider
        token.email = user.email

        logAuthEvent('callback', {
          provider: account?.provider,
          userId: user.id,
          email: user.email,
        })
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.provider = token.provider as string

        logAuthEvent('session', {
          provider: token.provider,
          userId: token.id,
          email: token.email,
        })
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      // Handle callback redirects
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl + '/studio'
    },
  },

  // Event handlers for error logging
  events: {
    async signIn({ user, account }) {
      logAuthEvent('signin', {
        provider: account?.provider,
        userId: user?.id,
        email: user?.email,
        event: 'completed',
      })
    },
    async signOut({ token }) {
      logAuthEvent('session', {
        userId: token?.id,
        event: 'signout',
      })
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE, // 8 hours
  },

  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // Domain set for subdomain support
        domain:
          process.env.NODE_ENV === 'production' ? '.lyfye.com' : undefined,
      },
    },
  },

  // Only enable debug in development
  debug: process.env.NODE_ENV === 'development',

  // Custom logger for production error tracking
  logger: {
    error(code, metadata) {
      logAuthEvent('error', {
        code,
        message: metadata?.message || 'Unknown error',
        stack: metadata?.stack,
      })
    },
    warn(code) {
      console.warn('[NextAuth:WARN]', code)
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[NextAuth:DEBUG]', code, metadata)
      }
    },
  },
}

// Helper to check if demo mode is enabled (production-safe)
export function isDemoMode(): boolean {
  return isDemoAllowed()
}

// Helper to check if any real OAuth provider is configured
export function hasRealOAuthProvider(): boolean {
  return (
    !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ||
    !!(
      process.env.AZURE_AD_CLIENT_ID &&
      process.env.AZURE_AD_CLIENT_SECRET &&
      process.env.AZURE_AD_TENANT_ID
    )
  )
}

// Helper to check if any auth provider is configured
export function hasAuthProvider(): boolean {
  return isDemoAllowed() || hasRealOAuthProvider()
}
