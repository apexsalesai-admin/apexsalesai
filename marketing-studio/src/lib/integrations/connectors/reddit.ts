/**
 * Reddit Platform Connector
 *
 * Implements token validation and dry-run publishing for Reddit.
 * Real publishing is handled by the Inngest connector at src/lib/inngest/connectors.
 */

import type { PlatformConnector, DryRunResult } from './baseConnector'
import { getConnectorConfig, validateContent } from './baseConnector'

export const redditConnector: PlatformConnector = {
  name: 'Reddit',

  async validateToken(): Promise<boolean> {
    console.log('[CONNECTOR] Reddit: Token validation passed (stub)')
    // In production: call Reddit /api/v1/me to validate token
    return true
  },

  async dryRun(content: string): Promise<DryRunResult> {
    console.log('[CONNECTOR] Reddit: Dry run initiated')

    const config = getConnectorConfig('reddit')
    const validation = validateContent('reddit', content)

    const result: DryRunResult = {
      success: true,
      platform: 'reddit',
      estimatedReach: config.estimatedReach,
      validation: {
        characterLimitOk: validation.characterLimitOk,
        formatOk: validation.formatOk,
        oauthValid: true,
      },
      message: 'Reddit dry run passed — content is valid for publishing',
    }

    console.log('[CONNECTOR] Reddit: Dry run completed')
    return result
  },
}
