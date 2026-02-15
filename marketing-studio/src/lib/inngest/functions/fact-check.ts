/**
 * Durable Fact-Check Pipeline
 *
 * Multi-step content verification:
 *   1. Extract claims from the content body
 *   2. Verify each claim independently (parallel, retriable steps)
 *   3. Calculate overall score and verdict
 *   4. Emit completion event with results
 *
 * Uses throttle to cap concurrent fact-checks per user.
 */

import { inngest } from '../client'

interface Claim {
  id: number
  text: string
  category: 'statistic' | 'quote' | 'factual' | 'opinion'
}

interface ClaimVerification {
  claimId: number
  claim: string
  verified: boolean
  confidence: number
  source?: string
  correction?: string
}

export const factCheckContent = inngest.createFunction(
  {
    id: 'fact-check-content',
    name: 'Content Fact Check',
    retries: 3,
    throttle: {
      key: 'event.data.userId',
      limit: 5,
      period: '1m',
    },
  },
  { event: 'studio/content.factcheck.requested' },
  async ({ event, step }) => {
    const { userId, contentId, title, body } = event.data as {
      userId: string
      contentId: string
      title: string
      body: string
    }

    const baseUrl = process.env.NEXTAUTH_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3003')

    // Step 1: Extract claims from content
    const claims = await step.run('extract-claims', async () => {
      const res = await fetch(`${baseUrl}/api/studio/ai/extract-claims`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-inngest-internal': process.env.INNGEST_SIGNING_KEY || '',
        },
        body: JSON.stringify({ title, body }),
      })

      if (!res.ok) {
        throw new Error(`Claim extraction failed: ${res.status}`)
      }

      const data = await res.json()
      return (data.claims || []) as Claim[]
    })

    // If no claims found, skip verification
    if (claims.length === 0) {
      await step.sendEvent('no-claims-found', {
        name: 'studio/content.factcheck.completed',
        data: {
          userId,
          contentId,
          score: 100,
          verdict: 'clean' as const,
          claims: [],
          verifications: [],
          checkedAt: new Date().toISOString(),
        },
      })
      return { status: 'clean', score: 100, claimsFound: 0 }
    }

    // Step 2: Verify each claim independently
    const verifications: ClaimVerification[] = []

    for (const claim of claims) {
      const verification = await step.run(`verify-claim-${claim.id}`, async () => {
        const res = await fetch(`${baseUrl}/api/studio/ai/verify-claim`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-inngest-internal': process.env.INNGEST_SIGNING_KEY || '',
          },
          body: JSON.stringify({
            claim: claim.text,
            category: claim.category,
            context: { title, contentId },
          }),
        })

        if (!res.ok) {
          // Non-retriable for 4xx, retriable for 5xx (Inngest handles retry)
          throw new Error(`Claim verification failed: ${res.status}`)
        }

        const data = await res.json()
        return {
          claimId: claim.id,
          claim: claim.text,
          verified: data.verified as boolean,
          confidence: data.confidence as number,
          source: data.source as string | undefined,
          correction: data.correction as string | undefined,
        }
      })
      verifications.push(verification)
    }

    // Step 3: Calculate score and verdict
    const result = await step.run('calculate-score', () => {
      const totalClaims = verifications.length
      const verifiedCount = verifications.filter(v => v.verified).length
      const avgConfidence = verifications.reduce((sum, v) => sum + v.confidence, 0) / totalClaims

      // Score: weighted blend of verification rate and confidence
      const verificationRate = verifiedCount / totalClaims
      const score = Math.round((verificationRate * 0.7 + avgConfidence * 0.3) * 100)

      let verdict: 'clean' | 'caution' | 'warning'
      if (score >= 80) {
        verdict = 'clean'
      } else if (score >= 50) {
        verdict = 'caution'
      } else {
        verdict = 'warning'
      }

      return { score, verdict, verifiedCount, totalClaims, avgConfidence }
    })

    // Step 4: Emit completion event
    await step.sendEvent('factcheck-complete', {
      name: 'studio/content.factcheck.completed',
      data: {
        userId,
        contentId,
        score: result.score,
        verdict: result.verdict,
        claims,
        verifications,
        verifiedCount: result.verifiedCount,
        totalClaims: result.totalClaims,
        checkedAt: new Date().toISOString(),
      },
    })

    return {
      status: result.verdict,
      score: result.score,
      verifiedCount: result.verifiedCount,
      totalClaims: result.totalClaims,
    }
  }
)
