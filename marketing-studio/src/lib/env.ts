/**
 * Environment Configuration - Single Source of Truth
 *
 * PRODUCTION RULES:
 * - DEMO_MODE is NEVER allowed in production
 * - Production is determined by VERCEL_ENV=production
 * - All demo features must check isDemoAllowed()
 */

/**
 * Check if running in Vercel production environment
 */
export function isProduction(): boolean {
  return process.env.VERCEL_ENV === 'production'
}

/**
 * Check if demo mode is allowed
 * CRITICAL: Demo mode is NEVER allowed in production
 */
export function isDemoAllowed(): boolean {
  if (isProduction()) {
    return false // NEVER allow demo in production
  }
  return process.env.DEMO_MODE === 'true'
}

/**
 * Check if Google OAuth is configured
 */
export function hasGoogleOAuth(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

/**
 * Check if Microsoft/Azure AD OAuth is configured
 */
export function hasMicrosoftOAuth(): boolean {
  return !!(
    process.env.AZURE_AD_CLIENT_ID &&
    process.env.AZURE_AD_CLIENT_SECRET &&
    process.env.AZURE_AD_TENANT_ID
  )
}

/**
 * Check if any real OAuth provider is configured
 */
export function hasRealOAuthProvider(): boolean {
  return hasGoogleOAuth() || hasMicrosoftOAuth()
}

/**
 * Check if any authentication method is available
 * In production: requires real OAuth
 * In non-production: allows demo mode as fallback
 */
export function hasAuthMethod(): boolean {
  if (isProduction()) {
    return hasRealOAuthProvider()
  }
  return hasRealOAuthProvider() || isDemoAllowed()
}

/**
 * Check required environment variables for production
 * Returns array of missing variables
 */
export function getMissingProductionEnvVars(): string[] {
  const missing: string[] = []

  if (!process.env.NEXTAUTH_SECRET) {
    missing.push('NEXTAUTH_SECRET')
  }

  if (!process.env.NEXTAUTH_URL) {
    missing.push('NEXTAUTH_URL')
  }

  // In production, at least one OAuth provider must be configured
  if (isProduction() && !hasRealOAuthProvider()) {
    missing.push('OAuth Provider (GOOGLE_* or AZURE_AD_*)')
  }

  return missing
}

/**
 * Validate production environment
 * Throws if critical variables are missing
 */
export function validateProductionEnv(): { valid: boolean; errors: string[] } {
  const errors = getMissingProductionEnvVars()
  return {
    valid: errors.length === 0,
    errors,
  }
}
