import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ContentStatus, ContentType } from '@prisma/client'
import { randomUUID } from 'crypto'

// GET - List all scheduled content
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: Record<string, unknown> = {}

    if (status && status !== 'all') {
      where.status = status.toUpperCase()
    } else {
      // Default: exclude auto-saved drafts from the main content list
      where.status = { not: 'DRAFT' }
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
}

// POST - Create new scheduled content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

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
    } = body

    // Validate required fields
    if (!title || !contentBody) {
      return NextResponse.json(
        { success: false, error: 'Title and body are required' },
        { status: 400 }
      )
    }

    if (channels.length === 0) {
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
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        status,
        aiGenerated,
        aiTopic,
        aiTone,
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
    console.error('Error creating content:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create content' },
      { status: 500 }
    )
  }
}
