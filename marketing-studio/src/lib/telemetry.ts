/**
 * Telemetry and KPI Tracking
 *
 * NOTE: This is a stub implementation for MVP.
 * The telemetryEvent and kPICounter models need to be redesigned
 * for multi-tenant architecture. For now, we log to console
 * and return mock data for the dashboard.
 *
 * TODO: Implement proper telemetry using StudioUsageRecord
 * or a dedicated analytics service (Mixpanel, Amplitude, etc.)
 */

import { TelemetryEventType, IntegrationType } from '@/types'

interface TelemetryParams {
  type: TelemetryEventType
  data?: Record<string, unknown>
  workflowId?: string
  channelType?: IntegrationType
}

// In-memory counters for development/MVP
const memoryCounters: Map<string, number> = new Map()

/**
 * Record a telemetry event for analytics and KPI tracking
 * Currently logs to console - production should use proper analytics
 */
export async function recordTelemetryEvent(params: TelemetryParams): Promise<void> {
  const { type, data = {}, workflowId, channelType } = params

  try {
    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[TELEMETRY]', { type, data, workflowId, channelType })
    }

    // Update in-memory counters for MVP
    await updateKPICounters(type, channelType, workflowId)
  } catch (error) {
    console.error('[TELEMETRY ERROR]', error)
  }
}

/**
 * Update KPI counters based on telemetry events
 */
async function updateKPICounters(
  eventType: TelemetryEventType,
  channelType?: IntegrationType,
  workflowId?: string
): Promise<void> {
  // Map event types to KPI counter names
  const counterMapping: Record<TelemetryEventType, string> = {
    POST_CREATED: 'posts_created',
    POST_PUBLISHED: 'posts_published',
    POST_FAILED: 'posts_failed',
    APPROVAL_REQUESTED: 'approvals_requested',
    APPROVAL_COMPLETED: 'approvals_completed',
    LEAD_ATTRIBUTED: 'leads_attributed',
    MEETING_BOOKED: 'meetings_booked',
    REVENUE_ATTRIBUTED: 'revenue_attributed',
  }

  const counterName = counterMapping[eventType]
  if (!counterName) return

  // Update in-memory counter
  const key = `${counterName}:all_time`
  const current = memoryCounters.get(key) || 0
  memoryCounters.set(key, current + 1)

  // If channel-specific, track that too
  if (channelType) {
    const channelKey = `${counterName}:${channelType}:all_time`
    const channelCurrent = memoryCounters.get(channelKey) || 0
    memoryCounters.set(channelKey, channelCurrent + 1)
  }
}

/**
 * Get KPI counter value
 */
export async function getKPICounter(
  name: string,
  period: string,
  channelType?: IntegrationType,
  workflowId?: string
): Promise<number> {
  // Return from in-memory counter or mock data
  const key = channelType
    ? `${name}:${channelType}:${period}`
    : `${name}:${period}`

  return memoryCounters.get(key) || 0
}

/**
 * Get KPI summary for dashboard
 * Returns mock data for MVP - real implementation should query database
 */
export async function getKPISummary(): Promise<{
  postsCreated: number
  postsPublished: number
  approvalsPending: number
  leadsAttributed: number
  meetingsBooked: number
  revenueAttributed: number
}> {
  // Return mock data for MVP dashboard
  // TODO: Implement real tracking with StudioUsageRecord or analytics service
  return {
    postsCreated: memoryCounters.get('posts_created:all_time') || 47,
    postsPublished: memoryCounters.get('posts_published:all_time') || 32,
    approvalsPending: 3, // Mock value for dashboard
    leadsAttributed: memoryCounters.get('leads_attributed:all_time') || 12,
    meetingsBooked: memoryCounters.get('meetings_booked:all_time') || 5,
    revenueAttributed: memoryCounters.get('revenue_attributed:all_time') || 0,
  }
}

/**
 * Get KPI trend data for charts
 * Returns mock data for MVP
 */
export async function getKPITrend(
  name: string,
  periodType: 'day' | 'month',
  limit: number = 30
): Promise<{ period: string; value: number }[]> {
  // Generate mock trend data for MVP
  const data: { period: string; value: number }[] = []
  const now = new Date()

  for (let i = limit - 1; i >= 0; i--) {
    const date = new Date(now)
    if (periodType === 'day') {
      date.setDate(date.getDate() - i)
      data.push({
        period: date.toISOString().split('T')[0],
        value: Math.floor(Math.random() * 10) + 1,
      })
    } else {
      date.setMonth(date.getMonth() - i)
      data.push({
        period: date.toISOString().substring(0, 7),
        value: Math.floor(Math.random() * 50) + 10,
      })
    }
  }

  return data
}
