/**
 * Provider Integrations API
 *
 * GET  /api/studio/integrations — List all provider connections with status
 * POST /api/studio/integrations — Connect a provider (encrypt + store key)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getOrCreateWorkspace } from '@/lib/workspace'
import { safeEncrypt } from '@/lib/encryption'
import { listVideoProviders } from '@/lib/providers/video/registry'

/** Provider metadata for display */
const PROVIDER_META: Record<string, {
  displayName: string
  tier: string
  description: string
  capabilities: string[]
  costModel: string
  estimatedCostPer10s: number
  testEndpoint?: string
}> = {
  runway: {
    displayName: 'Runway Gen-4.5',
    tier: 'cinematic',
    description: 'Hollywood-grade cinematic video. Unmatched visual fidelity.',
    capabilities: ['text-to-video', 'image-to-video'],
    costModel: 'per-credit',
    estimatedCostPer10s: 3.40,
  },
  sora: {
    displayName: 'OpenAI Sora 2',
    tier: 'cinematic',
    description: 'Cinematic AI video with synchronized audio. Standard (4-12s) and Pro (10-25s) models.',
    capabilities: ['text-to-video', 'audio'],
    costModel: 'per-second',
    estimatedCostPer10s: 1.00,
  },
  heygen: {
    displayName: 'HeyGen',
    tier: 'avatar',
    description: 'AI avatar talking-head videos. Perfect for SDR outreach.',
    capabilities: ['avatar-video', 'text-to-speech'],
    costModel: 'per-credit',
    estimatedCostPer10s: 0.17,
  },
  template: {
    displayName: 'Template',
    tier: 'free',
    description: 'Instant script storyboards. No API key required.',
    capabilities: ['storyboard'],
    costModel: 'free',
    estimatedCostPer10s: 0,
  },
}

/** Map provider name to StudioIntegrationType enum value */
const PROVIDER_TO_TYPE: Record<string, string> = {
  runway: 'RUNWAY',
  sora: 'OPENAI',
  heygen: 'HEYGEN',
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const workspace = await getOrCreateWorkspace(session.user.id)
    const providers = listVideoProviders()

    // Load all integrations for this workspace
    const integrations = await prisma.studioIntegration.findMany({
      where: { workspaceId: workspace.id },
      select: {
        type: true,
        status: true,
        accessTokenEncrypted: true,
        lastTestedAt: true,
        lastTestResult: true,
      },
    })

    // Build integration map by type (keyed by string for flexible lookup)
    const integrationMap = new Map(integrations.map(i => [String(i.type), i]))

    // Load monthly spend per provider
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const spendData = await prisma.studioRenderLog.groupBy({
      by: ['provider'],
      where: {
        workspaceId: workspace.id,
        submittedAt: { gte: monthStart },
        status: { not: 'blocked' },
      },
      _sum: { estimatedCostUsd: true },
    })
    const spendMap = new Map(spendData.map(s => [s.provider, s._sum.estimatedCostUsd ?? 0]))

    const result = providers.map(p => {
      const intType = PROVIDER_TO_TYPE[p.name]
      const integration = intType ? integrationMap.get(intType) : null
      const meta = PROVIDER_META[p.name] || {}
      const hasKey = integration?.status === 'CONNECTED' && !!integration.accessTokenEncrypted
      const envKeyExists = p.requiresApiKey ? !!process.env[p.envKeyName] : true

      // Mask the last 4 chars of the key
      let keyLastFour: string | null = null
      if (hasKey && integration?.accessTokenEncrypted) {
        // Last 4 chars of the encrypted blob (not the actual key) as a display hint
        keyLastFour = `••••${integration.accessTokenEncrypted.slice(-4)}`
      }

      return {
        provider: p.name,
        displayName: meta.displayName || p.displayName,
        tier: meta.tier || 'standard',
        description: meta.description || '',
        status: p.requiresApiKey
          ? (hasKey ? 'connected' : envKeyExists ? 'platform' : 'disconnected')
          : 'connected', // template always connected
        keyLastFour,
        keySource: hasKey ? 'user' : envKeyExists ? 'platform' : null,
        lastTestedAt: integration?.lastTestedAt?.toISOString() ?? null,
        lastTestResult: integration?.lastTestResult ?? null,
        monthlySpend: spendMap.get(p.name) ?? 0,
        capabilities: meta.capabilities || [],
        costModel: meta.costModel || 'unknown',
        estimatedCostPer10s: meta.estimatedCostPer10s ?? p.costPerSecond * 10,
        requiresApiKey: p.requiresApiKey,
        supportedDurations: p.supportedDurations,
        supportedAspectRatios: p.supportedAspectRatios,
      }
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('[API:integrations] GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch integrations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { provider, apiKey } = body as { provider: string; apiKey: string }

    if (!provider || !apiKey) {
      return NextResponse.json({ success: false, error: 'provider and apiKey are required' }, { status: 400 })
    }

    const intType = PROVIDER_TO_TYPE[provider]
    if (!intType) {
      return NextResponse.json({ success: false, error: `Unknown provider: ${provider}` }, { status: 400 })
    }

    const workspace = await getOrCreateWorkspace(session.user.id)

    // Encrypt the API key
    const encrypted = safeEncrypt(apiKey)
    if (!encrypted) {
      return NextResponse.json({ success: false, error: 'Encryption failed — check ENCRYPTION_KEY' }, { status: 500 })
    }

    // Upsert integration
    await prisma.studioIntegration.upsert({
      where: { workspaceId_type: { workspaceId: workspace.id, type: intType as never } },
      create: {
        workspaceId: workspace.id,
        type: intType as never,
        status: 'CONNECTED',
        accessTokenEncrypted: encrypted,
        connectedBy: session.user.id,
      },
      update: {
        status: 'CONNECTED',
        accessTokenEncrypted: encrypted,
        connectedBy: session.user.id,
        revokedAt: null,
        revokedBy: null,
        revokeReason: null,
        errorCount: 0,
      },
    })

    console.log('[INTEGRATIONS:CONNECT]', { provider, workspaceId: workspace.id, userId: session.user.id })

    return NextResponse.json({ success: true, message: `${provider} connected successfully` })
  } catch (error) {
    console.error('[API:integrations] POST error:', error)
    return NextResponse.json({ success: false, error: 'Failed to connect provider' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
