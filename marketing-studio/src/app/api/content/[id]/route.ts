import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ContentStatus, ContentType } from '@prisma/client'

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
    console.error('Error fetching content:', error)
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
    console.error('Error updating content:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update content' },
      { status: 500 }
    )
  }
}

// PATCH - Partial update (status changes, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, scheduledFor, publishedAt } = body

    const updateData: Record<string, unknown> = {}
    if (status !== undefined) updateData.status = status.toUpperCase() as ContentStatus
    if (scheduledFor !== undefined) updateData.scheduledFor = scheduledFor ? new Date(scheduledFor) : null
    if (publishedAt !== undefined) updateData.publishedAt = publishedAt ? new Date(publishedAt) : null

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
    console.error('Error updating content:', error)
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

    await prisma.scheduledContent.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Content deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting content:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete content' },
      { status: 500 }
    )
  }
}
