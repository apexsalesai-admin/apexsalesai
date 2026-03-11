import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getTierConfig } from '@/lib/subscription/tier'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.echo_breaker_users.findUnique({
      where: { id: session.user.id },
    })

    const tier = user?.subscriptionTier || 'free'
    const config = getTierConfig(tier)

    return NextResponse.json({
      tier,
      used: user?.monthlyContentUsed ?? 0,
      limit: config.monthlyContentLimit,
      imageUsed: user?.monthlyImageUsed ?? 0,
      imageLimit: config.monthlyImageLimit,
    })
  } catch (error) {
    console.error('[STRIPE:USAGE] Error:', error)
    return NextResponse.json({ tier: 'free', used: 0, limit: 5, imageUsed: 0, imageLimit: 2 })
  }
}
