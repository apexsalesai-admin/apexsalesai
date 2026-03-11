export type TierName = 'free' | 'pro' | 'enterprise'

export interface TierConfig {
  name: TierName
  label: string
  monthlyContentLimit: number
  monthlyImageLimit: number
  monthlyVideoLimit: number
  features: {
    socialPosts: boolean
    articles: boolean
    emails: boolean
    images: boolean
    campaigns: boolean
    presentations: boolean
    videoGeneration: boolean
    seoToolkit: boolean
    brandVoice: boolean
    teamCollaboration: boolean
    approvalsWorkflow: boolean
    apiAccess: boolean
  }
  price: { monthly: number; yearly: number }
  stripePriceId: { monthly: string; yearly: string }
}

export const TIER_CONFIGS: Record<TierName, TierConfig> = {
  free: {
    name: 'free',
    label: 'Free',
    monthlyContentLimit: 5,
    monthlyImageLimit: 2,
    monthlyVideoLimit: 0,
    features: {
      socialPosts: true,
      articles: true,
      emails: true,
      images: false,
      campaigns: false,
      presentations: false,
      videoGeneration: false,
      seoToolkit: false,
      brandVoice: false,
      teamCollaboration: false,
      approvalsWorkflow: false,
      apiAccess: false,
    },
    price: { monthly: 0, yearly: 0 },
    stripePriceId: { monthly: '', yearly: '' },
  },
  pro: {
    name: 'pro',
    label: 'Pro',
    monthlyContentLimit: 100,
    monthlyImageLimit: 50,
    monthlyVideoLimit: 10,
    features: {
      socialPosts: true,
      articles: true,
      emails: true,
      images: true,
      campaigns: true,
      presentations: true,
      videoGeneration: true,
      seoToolkit: true,
      brandVoice: true,
      teamCollaboration: false,
      approvalsWorkflow: false,
      apiAccess: false,
    },
    price: { monthly: 2900, yearly: 29000 },
    stripePriceId: {
      monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
      yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
    },
  },
  enterprise: {
    name: 'enterprise',
    label: 'Enterprise',
    monthlyContentLimit: -1,
    monthlyImageLimit: -1,
    monthlyVideoLimit: -1,
    features: {
      socialPosts: true,
      articles: true,
      emails: true,
      images: true,
      campaigns: true,
      presentations: true,
      videoGeneration: true,
      seoToolkit: true,
      brandVoice: true,
      teamCollaboration: true,
      approvalsWorkflow: true,
      apiAccess: true,
    },
    price: { monthly: 9900, yearly: 99000 },
    stripePriceId: {
      monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || '',
      yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || '',
    },
  },
}

export function getTierConfig(tier: string): TierConfig {
  const normalized = tier.toLowerCase() as TierName
  return TIER_CONFIGS[normalized] || TIER_CONFIGS.free
}

export type FeatureKey = keyof TierConfig['features']
