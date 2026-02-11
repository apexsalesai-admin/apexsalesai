/**
 * Reschedule Content API
 *
 * POST /api/content/:id/reschedule
 * Body: { scheduledFor: string (ISO date) }
 * Updates the content's scheduledFor and sets status to SCHEDULED.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ContentStatus } from '@prisma/client'
import { log, logError } from '@/lib/dev-mode'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { scheduledFor } = body

    if (!scheduledFor) {
      return NextResponse.json(
        { success: false, error: 'scheduledFor is required (ISO date string)' },
        { status: 400 }
      )
    }

    const parsedDate = new Date(scheduledFor)
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format for scheduledFor' },
        { status: 400 }
      )
    }

    if (parsedDate <= new Date()) {
      return NextResponse.json(
        { success: false, error: 'scheduledFor must be in the future' },
        { status: 400 }
      )
    }

    const existing = await prisma.scheduledContent.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Content not found' },
        { status: 404 }
      )
    }

    log('CONTENT', `Rescheduling ${id} to ${parsedDate.toISOString()}`)

    const content = await prisma.scheduledContent.update({
      where: { id },
      data: {
        scheduledFor: parsedDate,
        status: ContentStatus.SCHEDULED,
      },
    })

    return NextResponse.json({
      success: true,
      data: content,
      message: 'Content rescheduled successfully',
    })
  } catch (error) {
    logError('CONTENT', 'Reschedule error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to reschedule content' },
      { status: 500 }
    )
  }
}
