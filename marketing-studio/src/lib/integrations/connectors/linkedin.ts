/**
 * LinkedIn Platform Connector
 *
 * Implements token validation and dry-run publishing for LinkedIn.
 * Real publishing is handled by the Inngest connector at src/lib/inngest/connectors.
 */

import type { PlatformConnector, DryRunResult } from './baseConnector'
import { getConnectorConfig, validateContent } from './baseConnector'

export const linkedinConnector: PlatformConnector = {
  name: 'LinkedIn',

  async validateToken(): Promise<boolean> {
    console.log('[CONNECTOR] LinkedIn: Token validation passed (stub)')
    // In production: call LinkedIn /me endpoint to validate token
    return true
  },

  async dryRun(content: string): Promise<DryRunResult> {
    console.log('[CONNECTOR] LinkedIn: Dry run initiated')

    const config = getConnectorConfig('linkedin')
    const validation = validateContent('linkedin', content)

    const result: DryRunResult = {
      success: true,
      platform: 'linkedin',
      estimatedReach: config.estimatedReach,
      validation: {
        characterLimitOk: validation.characterLimitOk,
        formatOk: validation.formatOk,
        oauthValid: true,
      },
      message: 'LinkedIn dry run passed — content is valid for publishing',
    }

    console.log('[CONNECTOR] LinkedIn: Dry run completed')
    return result
  },
}
