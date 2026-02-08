/**
 * Platform Connector Base
 *
 * Defines the interface for all platform connectors and provides
 * shared validation/configuration utilities.
 */

export interface PlatformConnector {
  name: string
  validateToken(): Promise<boolean>
  dryRun(content: string): Promise<DryRunResult>
}

export interface DryRunResult {
  success: boolean
  platform: string
  estimatedReach: number
  validation: {
    characterLimitOk: boolean
    formatOk: boolean
    oauthValid: boolean
  }
  message?: string
}

export interface PlatformConfig {
  characterLimit: number
  estimatedReach: number
  supportsMedia: boolean
  supportsHashtags: boolean
}

/** Platform-specific configuration */
const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  linkedin: {
    characterLimit: 3000,
    estimatedReach: 500,
    supportsMedia: true,
    supportsHashtags: true,
  },
  youtube: {
    characterLimit: 5000,
    estimatedReach: 1000,
    supportsMedia: true,
    supportsHashtags: true,
  },
  reddit: {
    characterLimit: 40000,
    estimatedReach: 2000,
    supportsMedia: true,
    supportsHashtags: false,
  },
}

/**
 * Get configuration for a platform.
 */
export function getConnectorConfig(platform: string): PlatformConfig {
  return PLATFORM_CONFIGS[platform.toLowerCase()] ?? {
    characterLimit: 2000,
    estimatedReach: 100,
    supportsMedia: false,
    supportsHashtags: false,
  }
}

/**
 * Validate content against platform-specific rules.
 */
export function validateContent(
  platform: string,
  content: string
): { characterLimitOk: boolean; formatOk: boolean } {
  const config = getConnectorConfig(platform)

  return {
    characterLimitOk: content.length <= config.characterLimit,
    formatOk: content.trim().length > 0,
  }
}
