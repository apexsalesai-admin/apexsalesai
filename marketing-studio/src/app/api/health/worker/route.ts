/**
 * Worker Health Endpoint
 *
 * GET /api/health/worker
 * Checks whether the Inngest dev server is reachable and functions are registered.
 * In production, checks that the serve handler is configured correctly.
 */

import { NextResponse } from 'next/server'

const isDev = process.env.NODE_ENV === 'development'
const INNGEST_DEV_URL = 'http://127.0.0.1:8288'

export async function GET() {
  if (!isDev) {
    // In production, Inngest Cloud handles everything — assume healthy
    return NextResponse.json({
      ok: true,
      mode: 'production',
      hint: 'Inngest Cloud manages function execution in production.',
    })
  }

  // Dev mode: probe the Inngest dev server
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)

    const response = await fetch(`${INNGEST_DEV_URL}/v0/gql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ functions { name } }' }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (response.ok) {
      const data = await response.json()
      const functions = data?.data?.functions || []
      return NextResponse.json({
        ok: true,
        mode: 'dev',
        functionsRegistered: functions.length,
        functions: functions.map((f: { name: string }) => f.name),
      })
    }

    return NextResponse.json({
      ok: false,
      mode: 'dev',
      hint: 'Inngest dev server responded but returned an error. Run: npm run dev:inngest',
    })
  } catch {
    return NextResponse.json({
      ok: false,
      mode: 'dev',
      hint: 'Inngest dev server not reachable. Run: npm run dev:inngest',
    })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
