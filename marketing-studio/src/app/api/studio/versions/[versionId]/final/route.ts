/**
 * Final Version API
 *
 * PATCH /api/studio/versions/[versionId]/final — Mark a version as Final
 *
 * Uses a transaction to ensure only one version per contentId is marked final.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { versionId } = await params

    // Look up version
    const version = await prisma.studioContentVersion.findUnique({
      where: { id: versionId },
    })
    if (!version) {
      return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 })
    }

    // Transaction: unset all finals for this contentId, then set this one
    const updated = await prisma.$transaction(async (tx) => {
      await tx.studioContentVersion.updateMany({
        where: { contentId: version.contentId, isFinal: true },
        data: { isFinal: false },
      })

      return tx.studioContentVersion.update({
        where: { id: versionId },
        data: { isFinal: true },
        include: {
          videoJob: {
            select: {
              id: true,
              status: true,
              progress: true,
              outputAssets: {
                select: {
                  id: true,
                  publicUrl: true,
                  thumbnailUrl: true,
                  status: true,
                },
              },
            },
          },
        },
      })
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[API:final] PATCH error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to set final version' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
