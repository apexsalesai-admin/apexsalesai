/**
 * Token Health Verification Engine
 *
 * Checks OAuth token status for all platform integrations.
 * Used by dashboard health widget, integration test endpoint,
 * and publish gates.
 */

import { prisma } from '@/lib/db'
import { safeDecrypt } from '@/lib/encryption'
import { validateLinkedInToken } from '@/lib/publishing/linkedinPublisher'

const LOG_PREFIX = '[INTEGRATIONS]'

export interface IntegrationHealthResult {
  id: string
  platform: string
  status: 'CONNECTED' | 'EXPIRED' | 'ERROR' | 'DISCONNECTED' | 'PENDING'
  lastChecked: string
  externalName: string | null
  message?: string
}

/**
 * Check token health for all integrations in a workspace (or globally).
 *
 * For each integration:
 * - If DB status is not CONNECTED → return as-is
 * - If CONNECTED → verify token exists and is not expired
 */
export async function checkIntegrationHealth(
  workspaceId?: string
): Promise<IntegrationHealthResult[]> {
  console.log(LOG_PREFIX, 'Checking token health', workspaceId ? `(workspace: ${workspaceId})` : '(global)')

  try {
    const integrations = await prisma.studioIntegration.findMany({
      where: workspaceId ? { workspaceId } : {},
      select: {
        id: true,
        type: true,
        status: true,
        accessTokenEncrypted: true,
        tokenExpiresAt: true,
        lastTestedAt: true,
        lastTestResult: true,
        externalName: true,
        errorCount: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const now = new Date()
    const results: IntegrationHealthResult[] = []

    for (const integration of integrations) {
      const platform = integration.type

      // If not marked as CONNECTED, return current status
      if (integration.status !== 'CONNECTED') {
        console.log(LOG_PREFIX, `Platform ${platform} status: ${integration.status}`)
        results.push({
          id: integration.id,
          platform,
          status: integration.status as IntegrationHealthResult['status'],
          lastChecked: now.toISOString(),
          externalName: integration.externalName,
          message: `Status: ${integration.status}`,
        })
        continue
      }

      // CONNECTED — verify token health
      const hasToken = !!integration.accessTokenEncrypted
      const isExpired = integration.tokenExpiresAt
        ? integration.tokenExpiresAt < now
        : false
      const hasError = integration.lastTestResult?.startsWith('error')

      let status: IntegrationHealthResult['status'] = 'CONNECTED'
      let message = 'Token healthy'

      if (!hasToken) {
        status = 'ERROR'
        message = 'Access token missing'
      } else if (isExpired) {
        status = 'EXPIRED'
        message = `Token expired at ${integration.tokenExpiresAt!.toISOString()}`
      } else if (hasError) {
        status = 'ERROR'
        message = `Last test failed: ${integration.lastTestResult}`
      }

      // Live token validation for LinkedIn (real API call)
      if (status === 'CONNECTED' && platform === 'LINKEDIN' && hasToken) {
        try {
          const decryptedToken = safeDecrypt(integration.accessTokenEncrypted)
          if (decryptedToken) {
            console.log(LOG_PREFIX, 'Running live LinkedIn token validation...')
            const validation = await validateLinkedInToken(decryptedToken)

            // Update DB with test result
            await prisma.studioIntegration.update({
              where: { id: integration.id },
              data: {
                lastTestedAt: now,
                lastTestResult: validation.valid
                  ? `ok:${validation.displayName || 'verified'}`
                  : `error:${validation.error || 'validation failed'}`,
              },
            })

            if (!validation.valid) {
              status = 'ERROR'
              message = `Live validation failed: ${validation.error}`
            } else {
              message = `Token verified — ${validation.displayName}`
            }
          } else {
            status = 'ERROR'
            message = 'Token decryption failed'
          }
        } catch (liveErr) {
          console.warn(LOG_PREFIX, 'Live LinkedIn validation error (non-fatal):', liveErr)
          // Non-fatal — keep existing status from static checks
        }
      }

      const healthy = status === 'CONNECTED'
      console.log(LOG_PREFIX, `Platform ${platform} healthy: ${healthy}${!healthy ? ` (${message})` : ''}`)

      results.push({
        id: integration.id,
        platform,
        status,
        lastChecked: now.toISOString(),
        externalName: integration.externalName,
        message,
      })
    }

    console.log(LOG_PREFIX, `Token health check complete: ${results.length} integrations checked`)
    return results
  } catch (error) {
    console.error(LOG_PREFIX, 'Token health check failed:', error)
    // Fail gracefully — return empty array, never crash
    return []
  }
}

/**
 * Get a summary of integration health for dashboard display.
 */
export async function getIntegrationHealthSummary(workspaceId?: string): Promise<{
  total: number
  connected: number
  expired: number
  errors: number
  healthy: boolean
}> {
  const results = await checkIntegrationHealth(workspaceId)

  const connected = results.filter((r) => r.status === 'CONNECTED').length
  const expired = results.filter((r) => r.status === 'EXPIRED').length
  const errors = results.filter((r) => r.status === 'ERROR').length

  return {
    total: results.length,
    connected,
    expired,
    errors,
    healthy: results.length === 0 || (expired === 0 && errors === 0),
  }
}
