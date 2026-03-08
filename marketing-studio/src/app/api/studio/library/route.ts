import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET - All content organized by type with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)

    const where: Record<string, unknown> = {}

    if (type && type !== 'all') {
      where.contentType = type.toUpperCase()
    }

    if (status && status !== 'all') {
      where.status = status.toUpperCase()
    }

    const [content, total] = await Promise.all([
      prisma.scheduledContent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.scheduledContent.count({ where }),
    ])

    // Group counts by type
    const typeCounts = await prisma.scheduledContent.groupBy({
      by: ['contentType'],
      _count: true,
    })

    return NextResponse.json({
      success: true,
      data: content,
      total,
      page,
      limit,
      typeCounts: typeCounts.map((t) => ({
        type: t.contentType,
        count: t._count,
      })),
    })
  } catch (error) {
    console.error('[API:Library] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch library' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
