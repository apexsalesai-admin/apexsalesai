import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stripe } from '@/lib/stripe/config'
import { prisma } from '@/lib/db'
import { getTierConfig } from '@/lib/subscription/tier'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tier, interval = 'monthly' } = body as {
      tier: 'pro' | 'enterprise'
      interval: 'monthly' | 'yearly'
    }

    if (!tier || !['pro', 'enterprise'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }
    if (!['monthly', 'yearly'].includes(interval)) {
      return NextResponse.json({ error: 'Invalid interval' }, { status: 400 })
    }

    const config = getTierConfig(tier)
    const priceId = config.stripePriceId[interval]
    if (!priceId) {
      return NextResponse.json(
        { error: `Price not configured for ${tier} ${interval}` },
        { status: 400 }
      )
    }

    // Get or create Stripe customer
    const user = await prisma.echo_breaker_users.findUnique({
      where: { id: session.user.id },
    })

    let customerId = user?.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name || undefined,
        metadata: { userId: session.user.id },
      })
      customerId = customer.id

      await prisma.echo_breaker_users.upsert({
        where: { id: session.user.id },
        update: { stripeCustomerId: customerId },
        create: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name || null,
          stripeCustomerId: customerId,
          updatedAt: new Date(),
        },
      })
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'https://studio.lyfye.com'
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/studio/pricing?success=true`,
      cancel_url: `${baseUrl}/studio/pricing?canceled=true`,
      metadata: {
        userId: session.user.id,
        tier,
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[STRIPE:CHECKOUT] Error:', errMsg)
    return NextResponse.json(
      { error: errMsg.includes('STRIPE_SECRET_KEY')
          ? 'Stripe is not configured. Contact support@lyfye.com'
          : 'Checkout unavailable. Please try again.' },
      { status: 500 }
    )
  }
}
