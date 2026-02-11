import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ContentStatus, ContentType } from '@prisma/client'
import { log, logError } from '@/lib/dev-mode'

// GET - Get single content item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const content = await prisma.scheduledContent.findUnique({
      where: { id },
    })

    if (!content) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: content,
    })
  } catch (error) {
    logError('CONTENT', 'GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch content' },
      { status: 500 }
    )
  }
}

// PUT - Update content item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const {
      title,
      body: contentBody,
      contentType,
      channels,
      hashtags,
      callToAction,
      variations,
      scheduledFor,
      status,
    } = body

    const updateData: Record<string, unknown> = {}

    if (title !== undefined) updateData.title = title
    if (contentBody !== undefined) updateData.body = contentBody
    if (contentType !== undefined) updateData.contentType = contentType.toUpperCase() as ContentType
    if (channels !== undefined) updateData.channels = channels
    if (hashtags !== undefined) updateData.hashtags = hashtags
    if (callToAction !== undefined) updateData.callToAction = callToAction
    if (variations !== undefined) updateData.variations = variations
    if (scheduledFor !== undefined) updateData.scheduledFor = scheduledFor ? new Date(scheduledFor) : null
    if (status !== undefined) updateData.status = status.toUpperCase() as ContentStatus

    const content = await prisma.scheduledContent.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      data: content,
      message: 'Content updated successfully',
    })
  } catch (error) {
    logError('CONTENT', 'PUT error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update content' },
      { status: 500 }
    )
  }
}

// PATCH - Partial update (any fields)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      title,
      body: contentBody,
      contentType,
      channels,
      hashtags,
      callToAction,
      variations,
      status,
      scheduledFor,
      publishedAt,
      mediaUrls,
    } = body

    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (contentBody !== undefined) updateData.body = contentBody
    if (contentType !== undefined) updateData.contentType = contentType.toUpperCase() as ContentType
    if (channels !== undefined) updateData.channels = channels
    if (hashtags !== undefined) updateData.hashtags = hashtags
    if (callToAction !== undefined) updateData.callToAction = callToAction
    if (variations !== undefined) updateData.variations = variations
    if (mediaUrls !== undefined) updateData.mediaUrls = mediaUrls
    if (status !== undefined) updateData.status = status.toUpperCase() as ContentStatus
    if (scheduledFor !== undefined) updateData.scheduledFor = scheduledFor ? new Date(scheduledFor) : null
    if (publishedAt !== undefined) updateData.publishedAt = publishedAt ? new Date(publishedAt) : null

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      )
    }

    log('CONTENT', `PATCH ${id}:`, Object.keys(updateData).join(', '))

    const content = await prisma.scheduledContent.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      data: content,
      message: 'Content updated successfully',
    })
  } catch (error) {
    logError('CONTENT', 'PATCH error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update content' },
      { status: 500 }
    )
  }
}

// DELETE - Delete content item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verify exists before deleting
    const existing = await prisma.scheduledContent.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      )
    }

    log('CONTENT', `DELETE ${id}: "${existing.title}"`)

    await prisma.scheduledContent.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Content deleted successfully',
    })
  } catch (error) {
    logError('CONTENT', 'DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete content' },
      { status: 500 }
    )
  }
}
