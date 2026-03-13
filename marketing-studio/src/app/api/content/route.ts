import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ContentStatus, ContentType } from '@prisma/client'
import { randomUUID } from 'crypto'
import { withAuth } from '@/lib/auth/withAuth'

// GET - List all scheduled content
export const GET = withAuth(async (req, { session }) => {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = {}

    if (status && status !== 'all') {
      where.status = status.toUpperCase()
    }

    if (startDate || endDate) {
      where.scheduledFor = {}
      if (startDate) {
        (where.scheduledFor as Record<string, Date>).gte = new Date(startDate)
      }
      if (endDate) {
        (where.scheduledFor as Record<string, Date>).lte = new Date(endDate)
      }
    }

    const content = await prisma.scheduledContent.findMany({
      where,
      orderBy: { scheduledFor: 'asc' },
      take: 100,
    })

    return NextResponse.json({
      success: true,
      data: content,
      count: content.length,
    })
  } catch (error) {
    console.error('Error fetching content:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch content' },
      { status: 500 }
    )
  }
});

// POST - Create new scheduled content
export const POST = withAuth(async (req, { session }) => {
  try {
    const body = await req.json()

    const {
      title,
      body: contentBody,
      contentType = 'POST',
      channels = [],
      hashtags = [],
      callToAction,
      variations = [],
      scheduledFor,
      publishImmediately = false,
      aiGenerated = false,
      aiTopic,
      aiTone,
      mediaUrls = [],
    } = body

    // Validate required fields
    if (!title || !contentBody) {
      return NextResponse.json(
        { success: false, error: 'Title and body are required' },
        { status: 400 }
      )
    }

    // Images and other assets may not have channels — default to LINKEDIN
    if (channels.length === 0 && contentType.toUpperCase() !== 'IMAGE') {
      return NextResponse.json(
        { success: false, error: 'At least one channel is required' },
        { status: 400 }
      )
    }

    // Determine status
    let status: ContentStatus = ContentStatus.DRAFT
    if (publishImmediately) {
      status = ContentStatus.PENDING_APPROVAL
    } else if (scheduledFor) {
      status = ContentStatus.SCHEDULED
    }

    const content = await prisma.scheduledContent.create({
      data: {
        id: randomUUID(),
        title,
        body: contentBody,
        contentType: contentType.toUpperCase() as ContentType,
        channels,
        hashtags,
        callToAction,
        variations,
        mediaUrls: Array.isArray(mediaUrls) ? mediaUrls : [],
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        status,
        aiGenerated,
        aiTopic,
        aiTone,
        createdById: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      data: content,
      message: publishImmediately
        ? 'Content submitted for approval'
        : scheduledFor
          ? `Content scheduled for ${new Date(scheduledFor).toLocaleString()}`
          : 'Content saved as draft',
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('[API:content:POST] DB error:', errMsg)
    return NextResponse.json(
      { success: false, error: 'Failed to save content', detail: errMsg },
      { status: 500 }
    )
  }
});
