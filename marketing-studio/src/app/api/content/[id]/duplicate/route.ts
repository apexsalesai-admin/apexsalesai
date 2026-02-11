/**
 * Duplicate Content API
 *
 * POST /api/content/:id/duplicate
 * Creates a new DRAFT copy of the content with a "(Copy)" suffix on the title.
 * Returns the new content record.
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { ContentStatus } from '@prisma/client'
import { log, logError } from '@/lib/dev-mode'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const original = await prisma.scheduledContent.findUnique({
      where: { id },
    })

    if (!original) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      )
    }

    log('CONTENT', `Duplicating ${id}: "${original.title}"`)

    const duplicate = await prisma.scheduledContent.create({
      data: {
        id: randomUUID(),
        title: `${original.title} (Copy)`,
        body: original.body,
        contentType: original.contentType,
        aiGenerated: original.aiGenerated,
        aiTopic: original.aiTopic,
        aiTone: original.aiTone,
        hashtags: original.hashtags,
        callToAction: original.callToAction,
        mediaUrls: original.mediaUrls,
        channels: original.channels,
        variations: original.variations ?? [],
        status: ContentStatus.DRAFT,
        scheduledFor: null,
        publishedAt: null,
        createdById: original.createdById,
      },
    })

    log('CONTENT', `Duplicate created: ${duplicate.id}`)

    return NextResponse.json({
      success: true,
      data: duplicate,
      message: 'Content duplicated successfully',
    })
  } catch (error) {
    logError('CONTENT', 'Duplicate error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to duplicate content' },
      { status: 500 }
    )
  }
}
