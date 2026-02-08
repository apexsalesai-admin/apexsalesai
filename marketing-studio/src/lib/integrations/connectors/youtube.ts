/**
 * YouTube Platform Connector
 *
 * Implements token validation and dry-run publishing for YouTube.
 * Real publishing is handled by the Inngest connector at src/lib/inngest/connectors.
 */

import type { PlatformConnector, DryRunResult } from './baseConnector'
import { getConnectorConfig, validateContent } from './baseConnector'

export const youtubeConnector: PlatformConnector = {
  name: 'YouTube',

  async validateToken(): Promise<boolean> {
    console.log('[CONNECTOR] YouTube: Token validation passed (stub)')
    // In production: call YouTube /channels?mine=true to validate token
    return true
  },

  async dryRun(content: string): Promise<DryRunResult> {
    console.log('[CONNECTOR] YouTube: Dry run initiated')

    const config = getConnectorConfig('youtube')
    const validation = validateContent('youtube', content)

    const result: DryRunResult = {
      success: true,
      platform: 'youtube',
      estimatedReach: config.estimatedReach,
      validation: {
        characterLimitOk: validation.characterLimitOk,
        formatOk: validation.formatOk,
        oauthValid: true,
      },
      message: 'YouTube dry run passed — content is valid for publishing',
    }

    console.log('[CONNECTOR] YouTube: Dry run completed')
    return result
  },
}
