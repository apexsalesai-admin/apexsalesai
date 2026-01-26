import { IntegrationType } from '@/types'

/**
 * Social Channel Connectors
 *
 * These are safe mocked connectors for MVP. Each connector follows the
 * production-ready structure with proper OAuth scopes, but uses mock
 * implementations until real OAuth is wired.
 *
 * IMPORTANT: Real OAuth implementation requires:
 * 1. App registration with each platform
 * 2. Secure token storage (encrypted at rest)
 * 3. Token refresh logic
 * 4. Rate limiting compliance
 */

export interface ConnectorConfig {
  type: IntegrationType
  name: string
  description: string
  icon: string
  color: string
  requiredScopes: string[]
  scopeDescriptions: Record<string, string>
  mockEnabled: boolean
  oauthUrl?: string
}

export const CONNECTORS: Record<IntegrationType, ConnectorConfig> = {
  YOUTUBE: {
    type: 'YOUTUBE',
    name: 'YouTube',
    description: 'Connect your YouTube channel to auto-share videos and shorts',
    icon: 'youtube',
    color: '#FF0000',
    requiredScopes: [
      'youtube.readonly',
      'youtube.upload',
      'youtube.force-ssl',
    ],
    scopeDescriptions: {
      'youtube.readonly': 'View your YouTube account and channel information',
      'youtube.upload': 'Upload videos to your channel',
      'youtube.force-ssl': 'Manage your YouTube account securely',
    },
    mockEnabled: true,
    oauthUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  },

  TIKTOK: {
    type: 'TIKTOK',
    name: 'TikTok',
    description: 'Connect your TikTok account to share and repost content',
    icon: 'tiktok',
    color: '#000000',
    requiredScopes: [
      'user.info.basic',
      'video.list',
      'video.upload',
    ],
    scopeDescriptions: {
      'user.info.basic': 'View your basic profile information',
      'video.list': 'View videos on your account',
      'video.upload': 'Upload videos to your account',
    },
    mockEnabled: true,
    oauthUrl: 'https://www.tiktok.com/auth/authorize/',
  },

  LINKEDIN: {
    type: 'LINKEDIN',
    name: 'LinkedIn',
    description: 'Connect your LinkedIn profile or company page',
    icon: 'linkedin',
    color: '#0A66C2',
    requiredScopes: [
      'r_liteprofile',
      'w_member_social',
    ],
    scopeDescriptions: {
      'r_liteprofile': 'View your basic profile information',
      'w_member_social': 'Create and share posts on your behalf',
    },
    mockEnabled: true,
    oauthUrl: 'https://www.linkedin.com/oauth/v2/authorization',
  },

  X_TWITTER: {
    type: 'X_TWITTER',
    name: 'X (Twitter)',
    description: 'Connect your X account to share posts and threads',
    icon: 'twitter',
    color: '#000000',
    requiredScopes: [
      'tweet.read',
      'tweet.write',
      'users.read',
    ],
    scopeDescriptions: {
      'tweet.read': 'View tweets on your timeline',
      'tweet.write': 'Create and delete tweets',
      'users.read': 'View your profile information',
    },
    mockEnabled: true,
    oauthUrl: 'https://twitter.com/i/oauth2/authorize',
  },

  FACEBOOK: {
    type: 'FACEBOOK',
    name: 'Facebook',
    description: 'Connect your Facebook page to share content',
    icon: 'facebook',
    color: '#1877F2',
    requiredScopes: [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
    ],
    scopeDescriptions: {
      'pages_show_list': 'View your pages',
      'pages_read_engagement': 'View page engagement metrics',
      'pages_manage_posts': 'Create and manage posts on your pages',
    },
    mockEnabled: true,
    oauthUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
  },

  INSTAGRAM: {
    type: 'INSTAGRAM',
    name: 'Instagram',
    description: 'Connect your Instagram business account',
    icon: 'instagram',
    color: '#E4405F',
    requiredScopes: [
      'instagram_basic',
      'instagram_content_publish',
    ],
    scopeDescriptions: {
      'instagram_basic': 'View your Instagram profile and media',
      'instagram_content_publish': 'Create posts on your behalf',
    },
    mockEnabled: true,
    oauthUrl: 'https://api.instagram.com/oauth/authorize',
  },
}

/**
 * Mock connector interface for development/testing
 */
export interface MockConnector {
  connect(): Promise<{ success: boolean; channelId: string; channelName: string }>
  disconnect(): Promise<{ success: boolean }>
  publish(content: PublishContent): Promise<{ success: boolean; postId?: string; error?: string }>
  getChannelInfo(): Promise<ChannelInfo | null>
}

export interface PublishContent {
  title?: string
  description?: string
  caption?: string
  mediaUrl?: string
  mediaType: 'video' | 'image' | 'text'
  hashtags?: string[]
  scheduledAt?: Date
}

export interface ChannelInfo {
  id: string
  name: string
  url: string
  followerCount?: number
  avatar?: string
}

/**
 * Create a mock connector for development
 */
export function createMockConnector(type: IntegrationType): MockConnector {
  const config = CONNECTORS[type]

  return {
    async connect() {
      // Simulate OAuth flow delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      return {
        success: true,
        channelId: `mock_${type.toLowerCase()}_${Date.now()}`,
        channelName: `Lyfye ${config.name}`,
      }
    },

    async disconnect() {
      await new Promise(resolve => setTimeout(resolve, 500))
      return { success: true }
    },

    async publish(content: PublishContent) {
      // Simulate publish delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      // 90% success rate for mock
      const success = Math.random() > 0.1

      if (success) {
        return {
          success: true,
          postId: `mock_post_${Date.now()}`,
        }
      }

      return {
        success: false,
        error: 'Mock publish failed (simulated error)',
      }
    },

    async getChannelInfo() {
      return {
        id: `mock_${type.toLowerCase()}_123`,
        name: `Lyfye ${config.name}`,
        url: `https://${type.toLowerCase()}.com/lyfye`,
        followerCount: Math.floor(Math.random() * 10000),
      }
    },
  }
}

/**
 * Get connector configuration by type
 */
export function getConnector(type: IntegrationType): ConnectorConfig {
  return CONNECTORS[type]
}

/**
 * Get all available connectors
 */
export function getAllConnectors(): ConnectorConfig[] {
  return Object.values(CONNECTORS)
}

/**
 * Get connectors that support video content
 */
export function getVideoConnectors(): ConnectorConfig[] {
  return [CONNECTORS.YOUTUBE, CONNECTORS.TIKTOK, CONNECTORS.INSTAGRAM]
}
