import { prisma } from '@/lib/db'
import { getTierConfig, type FeatureKey } from './tier'

interface AccessResult {
  allowed: boolean
  reason?: string
  tier: string
  usage?: { used: number; limit: number }
  upgradeRequired?: boolean
}

/**
 * Get or initialize a user record in echo_breaker_users.
 * If no record exists, returns null (user is treated as FREE).
 */
async function getUser(userId: string) {
  return prisma.echo_breaker_users.findUnique({
    where: { id: userId },
  })
}

/**
 * Check if a user's tier grants access to a specific feature.
 * Fails open if the DB query errors (e.g. missing columns pre-migration).
 */
export async function checkFeatureAccess(
  userId: string,
  feature: FeatureKey
): Promise<AccessResult> {
  try {
    const user = await getUser(userId)
    const tier = user?.subscriptionTier || 'free'
    const config = getTierConfig(tier)

    if (!config.features[feature]) {
      return {
        allowed: false,
        reason: `${config.label} plan does not include ${feature}. Upgrade to unlock this feature.`,
        tier,
        upgradeRequired: true,
      }
    }

    return { allowed: true, tier }
  } catch (err) {
    console.error('[FEATURE CHECK] DB query failed, allowing through:', err)
    return { allowed: true, tier: 'free' }
  }
}

/**
 * Check if a user has remaining usage quota for a given action.
 * Auto-resets usage counter on the 1st of each month.
 * Fails open if the DB query errors (e.g. missing columns pre-migration).
 */
export async function checkUsageLimit(
  userId: string,
  action: 'content' | 'image' | 'video'
): Promise<AccessResult> {
  try {
    const user = await getUser(userId)
    const tier = user?.subscriptionTier || 'free'
    const config = getTierConfig(tier)

    const limitField =
      action === 'image'
        ? config.monthlyImageLimit
        : action === 'video'
          ? config.monthlyVideoLimit
          : config.monthlyContentLimit

    // Unlimited (-1) means no cap
    if (limitField < 0) {
      return { allowed: true, tier, usage: { used: 0, limit: -1 } }
    }

    // No user record in DB - treat as fresh (0 used)
    if (!user) {
      return {
        allowed: limitField > 0,
        tier,
        usage: { used: 0, limit: limitField },
        ...(limitField === 0 && {
          reason: `${config.label} plan does not include ${action}. Upgrade for access.`,
          upgradeRequired: true,
        }),
      }
    }

    // Auto-reset: if usageResetAt is in the past (or null), reset counters
    if (!user.usageResetAt || user.usageResetAt < new Date()) {
      const now = new Date()
      const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      await prisma.echo_breaker_users.update({
        where: { id: userId },
        data: {
          monthlyContentUsed: 0,
          monthlyImageUsed: 0,
          usageResetAt: nextReset,
        },
      })
      return {
        allowed: true,
        tier,
        usage: { used: 0, limit: limitField },
      }
    }

    const used =
      action === 'image'
        ? (user?.monthlyImageUsed ?? 0)
        : (user?.monthlyContentUsed ?? 0)

    if (used >= limitField) {
      return {
        allowed: false,
        reason: `Monthly ${action} limit reached (${used}/${limitField}). Upgrade for more.`,
        tier,
        usage: { used, limit: limitField },
        upgradeRequired: true,
      }
    }

    return {
      allowed: true,
      tier,
      usage: { used, limit: limitField },
    }
  } catch (err) {
    console.error('[USAGE CHECK] DB query failed, allowing through:', err)
    return { allowed: true, tier: 'free', reason: undefined }
  }
}

/**
 * Record a usage event. Atomically increments the user's monthly counter
 * and creates a UsageRecord for audit.
 * Fails silently if the DB is not yet migrated.
 */
export async function recordUsage(
  userId: string,
  action: string
): Promise<void> {
  try {
    const user = await getUser(userId)
    const tier = user?.subscriptionTier || 'free'

    const isImage = action.includes('image')

    await prisma.$transaction([
      prisma.echo_breaker_users.upsert({
        where: { id: userId },
        update: isImage
          ? { monthlyImageUsed: { increment: 1 } }
          : { monthlyContentUsed: { increment: 1 } },
        create: {
          id: userId,
          updatedAt: new Date(),
          ...(isImage
            ? { monthlyImageUsed: 1 }
            : { monthlyContentUsed: 1 }),
        },
      }),
      prisma.usageRecord.create({
        data: {
          userId,
          action,
          tier,
        },
      }),
    ])
  } catch (err) {
    console.error('[RECORD USAGE] Failed silently:', err)
  }
}
