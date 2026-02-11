/**
 * Dev Mode Utilities
 *
 * Centralized helpers for development-mode fallbacks and structured logging.
 * All external API calls should check shouldUseFallback() first.
 */

const isDev = process.env.NODE_ENV === 'development'

/**
 * Returns true when external service calls should use mock/fallback data.
 * Checks: dev environment AND the specific service API key is missing.
 */
export function shouldUseFallback(service: 'runway' | 'blob' | 'inngest' | 'elevenlabs' | 'heygen'): boolean {
  if (!isDev) return false

  const keyMap: Record<string, string> = {
    runway: 'RUNWAY_API_KEY',
    blob: 'BLOB_READ_WRITE_TOKEN',
    inngest: 'INNGEST_EVENT_KEY',
    elevenlabs: 'ELEVENLABS_API_KEY',
    heygen: 'HEYGEN_API_KEY',
  }

  const envVar = keyMap[service]
  if (!envVar) return false

  const value = process.env[envVar]
  return !value || value.startsWith('REPLACE_WITH_')
}

/**
 * Returns true when the video ingest pipeline feature flag is enabled.
 */
export function isVideoPipelineEnabled(): boolean {
  return process.env.ENABLE_VIDEO_INGEST_PIPELINE !== 'false'
}

/**
 * Structured console logger with prefixed format.
 * Usage: log('UPLOAD', 'File received:', filename)
 */
export function log(prefix: string, ...args: unknown[]): void {
  console.log(`[${prefix}]`, ...args)
}

/**
 * Structured error logger with prefixed format.
 */
export function logError(prefix: string, ...args: unknown[]): void {
  console.error(`[${prefix}]`, ...args)
}
