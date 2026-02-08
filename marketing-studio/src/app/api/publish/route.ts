/**
 * Legacy Social Media Publishing API — RETIRED (P10)
 *
 * This route is permanently retired. All publishing flows should use:
 * - /api/publish/linkedin  — Direct LinkedIn publishing (production-hardened)
 * - /api/studio/publish    — Inngest-based multi-channel publishing
 *
 * Returns 410 Gone for all methods.
 */

import { NextResponse } from 'next/server'

const GONE_RESPONSE = {
  success: false,
  error: 'This endpoint has been retired',
  code: 'ROUTE_RETIRED',
  alternatives: {
    linkedin: '/api/publish/linkedin',
    multiChannel: '/api/studio/publish',
  },
  message: 'Use /api/publish/linkedin for LinkedIn or /api/studio/publish for multi-channel publishing.',
}

const HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
}

export async function POST() {
  return NextResponse.json(GONE_RESPONSE, { status: 410, headers: HEADERS })
}

export async function GET() {
  return NextResponse.json(GONE_RESPONSE, { status: 410, headers: HEADERS })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
