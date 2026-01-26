import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { recordTelemetryEvent, getKPISummary, getKPITrend } from '@/lib/telemetry'
import { TelemetryEventType, IntegrationType } from '@/types'

// GET /api/telemetry - Get KPI summary and trends
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const metric = searchParams.get('metric')
    const periodType = (searchParams.get('periodType') || 'day') as 'day' | 'month'

    if (metric) {
      // Get specific metric trend
      const trend = await getKPITrend(metric, periodType, 30)
      return NextResponse.json({
        success: true,
        data: { metric, trend },
      })
    }

    // Get full KPI summary
    const summary = await getKPISummary()

    // Get recent trends
    const [postsTrend, leadsTrend] = await Promise.all([
      getKPITrend('posts_created', 'day', 7),
      getKPITrend('leads_attributed', 'day', 7),
    ])

    return NextResponse.json({
      success: true,
      data: {
        summary,
        trends: {
          posts: postsTrend,
          leads: leadsTrend,
        },
      },
    })
  } catch (error) {
    console.error('[GET /api/telemetry]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch telemetry data' },
      { status: 500 }
    )
  }
}

// POST /api/telemetry - Record a telemetry event
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, data, workflowId, channelType } = body

    // Validate event type
    if (!Object.values(TelemetryEventType).includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid event type' },
        { status: 400 }
      )
    }

    // Validate channel type if provided
    if (channelType && !Object.values(IntegrationType).includes(channelType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid channel type' },
        { status: 400 }
      )
    }

    // Record the event
    await recordTelemetryEvent({
      type: type as TelemetryEventType,
      data: data || {},
      workflowId,
      channelType: channelType as IntegrationType | undefined,
    })

    return NextResponse.json({
      success: true,
      message: 'Telemetry event recorded',
    })
  } catch (error) {
    console.error('[POST /api/telemetry]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to record telemetry event' },
      { status: 500 }
    )
  }
}
