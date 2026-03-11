'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Check, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const plans = [
  {
    name: 'Free',
    tier: 'free',
    price: { monthly: 0, yearly: 0 },
    description: 'Get started with basic content creation',
    features: [
      '5 AI content pieces per month',
      'Social posts',
      'Articles and emails',
      'Basic templates',
      'Single workspace',
    ],
    excluded: [
      'AI image generation',
      'Video generation',
      'SEO toolkit',
      'Brand voice',
      'Campaign management',
    ],
    cta: 'Current Plan',
    highlighted: false,
  },
  {
    name: 'Pro',
    tier: 'pro',
    price: { monthly: 29, yearly: 290 },
    description: 'Everything you need for professional content',
    features: [
      '100 AI content pieces per month',
      '50 AI image generations',
      '10 video generations',
      'All content types',
      'SEO toolkit',
      'Brand voice',
      'Campaign management',
      'Presentation builder',
    ],
    excluded: [
      'Team collaboration',
      'Approval workflows',
      'API access',
    ],
    cta: 'Upgrade to Pro',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    tier: 'enterprise',
    price: { monthly: 99, yearly: 990 },
    description: 'Unlimited power for growing teams',
    features: [
      'Unlimited content creation',
      'Unlimited image generation',
      'Unlimited video generation',
      'Everything in Pro',
      'Team collaboration',
      'Approval workflows',
      'API access',
      'Priority support',
    ],
    excluded: [],
    cta: 'Upgrade to Enterprise',
    highlighted: false,
  },
]

export default function PricingPage() {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState<string | null>(null)
  const [currentTier, setCurrentTier] = useState<string>('free')
  const [upgradeError, setUpgradeError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  useEffect(() => {
    fetch('/api/stripe/usage')
      .then((r) => r.json())
      .then((d) => {
        if (d.tier) setCurrentTier(d.tier)
      })
      .catch(() => {})
  }, [])

  const handleUpgrade = async (tier: string, selectedInterval: 'monthly' | 'yearly') => {
    if (tier === 'free' || tier === currentTier) return
    setLoading(tier)
    setUpgradeError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, interval: selectedInterval }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setUpgradeError(
          data.error?.includes('Price not configured')
            ? 'This plan is not yet available. Please contact support@lyfye.com'
            : 'Upgrade temporarily unavailable. Please contact support@lyfye.com'
        )
        setLoading(null)
      }
    } catch {
      setUpgradeError('Upgrade temporarily unavailable. Please contact support@lyfye.com')
      setLoading(null)
    }
  }

  const handleManageBilling = async () => {
    setLoading('portal')
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setLoading(null)
      }
    } catch {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-16 px-4">
      <div className="max-w-5xl mx-auto">
        {success && (
          <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-emerald-700 font-medium">
            Payment successful! Your plan has been upgraded.
          </div>
        )}
        {canceled && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-amber-700">
            Checkout was canceled. No charges were made.
          </div>
        )}
        {upgradeError && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-center text-red-700">
            {upgradeError}
          </div>
        )}

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Choose Your Plan
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Start free and scale as you grow. All plans include AI-powered content creation.
          </p>

          <div className="inline-flex items-center mt-8 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setInterval('monthly')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-all',
                interval === 'monthly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('yearly')}
              className={cn(
                'px-4 py-2 text-sm font-medium rounded-lg transition-all',
                interval === 'yearly'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              Yearly
              <span className="ml-1 text-xs text-emerald-600 font-semibold">Save 17%</span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = currentTier === plan.tier
            const price =
              interval === 'monthly' ? plan.price.monthly : plan.price.yearly

            return (
              <div
                key={plan.tier}
                className={cn(
                  'relative rounded-2xl border-2 p-6 transition-all',
                  plan.highlighted
                    ? 'border-purple-500 bg-white shadow-xl shadow-purple-500/10 scale-105'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold rounded-full">
                    Most Popular
                  </div>
                )}

                <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{plan.description}</p>

                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold text-slate-900">
                    ${price}
                  </span>
                  {price > 0 && (
                    <span className="text-slate-500 text-sm">
                      /{interval === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  )}
                </div>

                {isCurrent ? (
                  <div className="flex flex-col gap-2">
                    <button
                      disabled
                      className="w-full py-2.5 px-4 text-sm font-medium rounded-xl bg-slate-100 text-slate-500 cursor-default"
                    >
                      Current Plan
                    </button>
                    {currentTier !== 'free' && (
                      <button
                        onClick={handleManageBilling}
                        disabled={loading === 'portal'}
                        className="w-full py-2 px-4 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {loading === 'portal' ? 'Loading...' : 'Manage Billing'}
                      </button>
                    )}
                  </div>
                ) : plan.tier === 'free' ? (
                  <button
                    disabled
                    className="w-full py-2.5 px-4 text-sm font-medium rounded-xl bg-slate-100 text-slate-400 cursor-default"
                  >
                    Free Forever
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.tier, interval)}
                    disabled={loading !== null}
                    className={cn(
                      'w-full py-2.5 px-4 text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50',
                      plan.highlighted
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/25'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    )}
                  >
                    {loading === plan.tier ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {plan.cta}
                  </button>
                )}

                <div className="mt-6 space-y-2.5">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">{f}</span>
                    </div>
                  ))}
                  {plan.excluded.map((f) => (
                    <div
                      key={f}
                      className="flex items-start gap-2 text-sm text-slate-400"
                    >
                      <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
                        -
                      </span>
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-center mt-12 text-sm text-slate-400">
          <p>All plans include SSL, 99.9% uptime, and email support.</p>
          <p className="mt-1">
            Questions?{' '}
            <Link href="mailto:support@lyfye.com" className="text-purple-600 hover:text-purple-700">
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
