/**
 * Video Provider List API
 *
 * GET /api/studio/providers — Returns all registered video providers with config metadata.
 */

import { NextResponse } from 'next/server'
import { listVideoProviders } from '@/lib/providers/video/registry'

export async function GET() {
  const providers = listVideoProviders().map(p => ({
    name: p.name,
    displayName: p.displayName,
    category: p.category,
    supportedDurations: p.supportedDurations,
    supportedAspectRatios: p.supportedAspectRatios,
    maxPromptLength: p.maxPromptLength,
    costPerSecond: p.costPerSecond,
    requiresApiKey: p.requiresApiKey,
    models: p.models?.map(m => ({
      id: m.id,
      displayName: m.displayName,
      supportedDurations: m.supportedDurations,
      costPerSecond: m.costPerSecond,
    })),
  }))

  return NextResponse.json({ success: true, data: providers })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
