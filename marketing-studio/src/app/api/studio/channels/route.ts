import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma, withRetry } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const channels = await withRetry(() => prisma.publishingChannel.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        platform: true,
        tier: true,
        displayName: true,
        accountName: true,
        accountAvatar: true,
        isActive: true,
        connectedAt: true,
        lastPublishedAt: true,
        lastError: true,
        tokenExpiresAt: true,
      },
      orderBy: { connectedAt: 'desc' },
    }))

    const channelsWithHealth = channels.map(ch => ({
      ...ch,
      tokenHealth: !ch.tokenExpiresAt
        ? 'unknown'
        : ch.tokenExpiresAt < new Date()
          ? 'expired'
          : ch.tokenExpiresAt < new Date(Date.now() + 7 * 86400000)
            ? 'expiring_soon'
            : 'healthy',
    }))

    return NextResponse.json({ success: true, channels: channelsWithHealth })
  } catch (error) {
    console.error('[API:channels] GET error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch channels' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { channelId } = await req.json()
    if (!channelId) return NextResponse.json({ error: 'channelId required' }, { status: 400 })

    const channel = await withRetry(() => prisma.publishingChannel.findFirst({
      where: { id: channelId, userId: session.user.id },
    }))
    if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

    await withRetry(() => prisma.publishingChannel.delete({ where: { id: channelId } }))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API:channels] DELETE error:', error)
    return NextResponse.json({ success: false, error: 'Failed to disconnect channel' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
