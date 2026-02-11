/**
 * Content Versions API
 *
 * GET  /api/studio/versions?contentId=xxx — List versions for a content item
 * POST /api/studio/versions               — Create a new version
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const contentId = request.nextUrl.searchParams.get('contentId')
    if (!contentId) {
      return NextResponse.json({ success: false, error: 'contentId is required' }, { status: 400 })
    }

    const versions = await prisma.studioContentVersion.findMany({
      where: { contentId },
      orderBy: { versionNumber: 'desc' },
      include: {
        videoJob: {
          select: {
            id: true,
            status: true,
            progress: true,
            progressMessage: true,
            errorMessage: true,
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

    return NextResponse.json({ success: true, data: versions })
  } catch (error) {
    console.error('[API:versions] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch versions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { contentId, script, visualPrompt, config, label } = body

    if (!contentId || !script) {
      return NextResponse.json(
        { success: false, error: 'contentId and script are required' },
        { status: 400 }
      )
    }

    // Calculate next version number
    const maxVersion = await prisma.studioContentVersion.aggregate({
      where: { contentId },
      _max: { versionNumber: true },
    })
    const versionNumber = (maxVersion._max.versionNumber ?? 0) + 1

    const version = await prisma.studioContentVersion.create({
      data: {
        contentId,
        versionNumber,
        label: label || `Version ${versionNumber}`,
        script,
        visualPrompt: visualPrompt || null,
        config: config || {},
        createdById: session.user.id,
      },
      include: {
        videoJob: {
          select: {
            id: true,
            status: true,
            progress: true,
            progressMessage: true,
            errorMessage: true,
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

    return NextResponse.json({ success: true, data: version })
  } catch (error) {
    console.error('[API:versions] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create version' },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
