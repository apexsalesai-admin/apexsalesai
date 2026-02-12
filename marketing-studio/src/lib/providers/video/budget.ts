/**
 * Render Budget Enforcement
 *
 * Checks workspace budget caps before allowing renders.
 * Records all render submissions and outcomes in StudioRenderLog (immutable ledger).
 */

import { prisma } from '@/lib/db'

// Defaults — can be overridden per-workspace via settings JSON
const DEFAULT_MONTHLY_BUDGET_USD = 25
const DEFAULT_DAILY_ATTEMPTS_MAX = 20

interface BudgetCheckResult {
  allowed: boolean
  reason?: string
  monthlySpent: number
  monthlyLimit: number
  dailyAttempts: number
  dailyLimit: number
}

interface WorkspaceSettings {
  renderBudgetMonthlyUsd?: number
  renderAttemptsDailyMax?: number
}

function parseSettings(settings: unknown): WorkspaceSettings {
  if (settings && typeof settings === 'object') return settings as WorkspaceSettings
  return {}
}

/**
 * Check if a workspace is within render budget.
 */
export async function checkRenderBudget(
  workspaceId: string,
  estimatedCostUsd: number,
): Promise<BudgetCheckResult> {
  const workspace = await prisma.studioWorkspace.findUnique({
    where: { id: workspaceId },
    select: { settings: true },
  })

  const settings = parseSettings(workspace?.settings)
  const monthlyLimit = settings.renderBudgetMonthlyUsd ?? DEFAULT_MONTHLY_BUDGET_USD
  const dailyLimit = settings.renderAttemptsDailyMax ?? DEFAULT_DAILY_ATTEMPTS_MAX

  // Current month window
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Aggregate monthly spend + daily attempts in parallel
  const [monthlyAgg, dailyCount] = await Promise.all([
    prisma.studioRenderLog.aggregate({
      where: {
        workspaceId,
        submittedAt: { gte: monthStart },
        status: { not: 'blocked' },
      },
      _sum: { estimatedCostUsd: true },
    }),
    prisma.studioRenderLog.count({
      where: {
        workspaceId,
        submittedAt: { gte: dayStart },
        status: { not: 'blocked' },
      },
    }),
  ])

  const monthlySpent = monthlyAgg._sum.estimatedCostUsd ?? 0
  const dailyAttempts = dailyCount

  // Check monthly budget
  if (monthlySpent + estimatedCostUsd > monthlyLimit) {
    console.log('[BUDGET:EXCEEDED]', { workspaceId, monthlySpent, monthlyLimit, estimatedCostUsd })
    return {
      allowed: false,
      reason: `Monthly render budget exceeded: $${monthlySpent.toFixed(2)} spent of $${monthlyLimit.toFixed(2)} limit`,
      monthlySpent,
      monthlyLimit,
      dailyAttempts,
      dailyLimit,
    }
  }

  // Check daily attempts
  if (dailyAttempts >= dailyLimit) {
    console.log('[BUDGET:EXCEEDED]', { workspaceId, dailyAttempts, dailyLimit })
    return {
      allowed: false,
      reason: `Daily render limit reached: ${dailyAttempts}/${dailyLimit} attempts today`,
      monthlySpent,
      monthlyLimit,
      dailyAttempts,
      dailyLimit,
    }
  }

  console.log('[BUDGET:CHECK]', { workspaceId, monthlySpent, monthlyLimit, dailyAttempts, dailyLimit, estimatedCostUsd })
  return { allowed: true, monthlySpent, monthlyLimit, dailyAttempts, dailyLimit }
}

/**
 * Record a render submission in the ledger.
 */
export async function recordRenderSubmission(params: {
  workspaceId: string
  videoJobId?: string
  provider: string
  providerJobId?: string
  durationSeconds: number
  aspectRatio: string
  promptLength: number
  estimatedCostUsd: number
}): Promise<string> {
  const log = await prisma.studioRenderLog.create({
    data: {
      workspaceId: params.workspaceId,
      videoJobId: params.videoJobId,
      provider: params.provider,
      providerJobId: params.providerJobId,
      durationSeconds: params.durationSeconds,
      aspectRatio: params.aspectRatio,
      promptLength: params.promptLength,
      estimatedCostUsd: params.estimatedCostUsd,
      status: 'submitted',
    },
  })
  console.log('[BUDGET:RECORDED]', { renderLogId: log.id, provider: params.provider, estimatedCostUsd: params.estimatedCostUsd })
  console.log('[LEDGER:RECORD]', `provider=${params.provider} cost=$${params.estimatedCostUsd.toFixed(2)} duration=${params.durationSeconds}s`)
  return log.id
}

/**
 * Record the outcome of a render (completed, failed).
 */
export async function recordRenderOutcome(
  renderLogId: string,
  status: 'completed' | 'failed',
  actualCostUsd?: number,
  errorMessage?: string,
): Promise<void> {
  await prisma.studioRenderLog.update({
    where: { id: renderLogId },
    data: {
      status,
      actualCostUsd: actualCostUsd ?? undefined,
      errorMessage: errorMessage ?? undefined,
      completedAt: new Date(),
    },
  })
  console.log('[BUDGET:OUTCOME]', { renderLogId, status, actualCostUsd })
}
