import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/config'
import { prisma } from '@/lib/db'
import { getTierConfig } from '@/lib/subscription/tier'
import type Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('[STRIPE:WEBHOOK] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const tier = session.metadata?.tier || 'pro'

        if (!userId) {
          console.error('[STRIPE:WEBHOOK] No userId in checkout metadata')
          break
        }

        const config = getTierConfig(tier)
        const expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + 1)

        await prisma.echo_breaker_users.update({
          where: { id: userId },
          data: {
            subscriptionTier: tier,
            stripeSubscriptionId: session.subscription as string,
            subscriptionEndsAt: expiresAt,
            subscriptionStatus: 'active',
            monthlyContentLimit: config.monthlyContentLimit === -1 ? 999999 : config.monthlyContentLimit,
            monthlyContentUsed: 0,
            monthlyImageUsed: 0,
          },
        })

        console.log(`[STRIPE:WEBHOOK] User ${userId} upgraded to ${tier}`)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId =
          typeof invoice.customer === 'string'
            ? invoice.customer
            : invoice.customer?.id

        if (!customerId) break

        const user = await prisma.echo_breaker_users.findFirst({
          where: { stripeCustomerId: customerId },
        })

        if (user) {
          const expiresAt = new Date()
          expiresAt.setMonth(expiresAt.getMonth() + 1)

          await prisma.echo_breaker_users.update({
            where: { id: user.id },
            data: {
              subscriptionEndsAt: expiresAt,
              subscriptionStatus: 'active',
              monthlyContentUsed: 0,
              monthlyImageUsed: 0,
              usageResetAt: new Date(
                new Date().getFullYear(),
                new Date().getMonth() + 1,
                1
              ),
            },
          })
          console.log(`[STRIPE:WEBHOOK] Invoice paid for user ${user.id}`)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const subscriptionId = subscription.id

        const user = await prisma.echo_breaker_users.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        })

        if (user) {
          await prisma.echo_breaker_users.update({
            where: { id: user.id },
            data: {
              subscriptionTier: 'free',
              stripeSubscriptionId: null,
              subscriptionEndsAt: null,
              subscriptionStatus: 'canceled',
              monthlyContentLimit: 5,
            },
          })
          console.log(`[STRIPE:WEBHOOK] Subscription canceled for user ${user.id}`)
        }
        break
      }

      default:
        console.log(`[STRIPE:WEBHOOK] Unhandled event: ${event.type}`)
    }
  } catch (error) {
    console.error(`[STRIPE:WEBHOOK] Error handling ${event.type}:`, error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
