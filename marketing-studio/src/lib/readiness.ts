/**
 * System Readiness Engine
 *
 * Provides real-time system health and configuration status.
 * Used for onboarding flow, dashboard indicators, and publish gates.
 */

import { prisma } from '@/lib/db'

export interface ReadinessCheck {
  name: string
  status: 'ready' | 'pending' | 'error'
  message: string
  required: boolean
}

export interface SystemReadiness {
  authConfigured: boolean
  aiConfigured: boolean
  databaseConnected: boolean
  inngestConnected: boolean
  workspaceExists: boolean
  brandVoiceConfigured: boolean
  platformConnected: boolean
  overallReady: boolean
  overallScore: number
  checks: ReadinessCheck[]
  timestamp: string
}

const LOG_PREFIX = '[READINESS]'

/**
 * Check if authentication is properly configured
 */
async function checkAuthConfigured(): Promise<ReadinessCheck> {
  console.log(LOG_PREFIX, 'Checking auth configuration')

  try {
    const hasSecret = !!process.env.NEXTAUTH_SECRET
    const hasUrl = !!process.env.NEXTAUTH_URL
    const hasGoogle =
      !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET
    const hasAzure =
      !!process.env.AZURE_AD_CLIENT_ID &&
      !!process.env.AZURE_AD_CLIENT_SECRET &&
      !!process.env.AZURE_AD_TENANT_ID

    const configured = hasSecret && hasUrl && (hasGoogle || hasAzure)

    return {
      name: 'Authentication',
      status: configured ? 'ready' : 'pending',
      message: configured
        ? 'OAuth providers configured'
        : 'Configure OAuth providers',
      required: true,
    }
  } catch (error) {
    console.error(LOG_PREFIX, 'Auth check failed:', error)
    return {
      name: 'Authentication',
      status: 'error',
      message: 'Failed to check auth configuration',
      required: true,
    }
  }
}

/**
 * Check if AI provider is configured
 */
async function checkAIConfigured(): Promise<ReadinessCheck> {
  console.log(LOG_PREFIX, 'Checking AI providers')

  try {
    const hasAnthropic = !!process.env.ANTHROPIC_API_KEY
    const hasOpenAI = !!process.env.OPENAI_API_KEY
    const hasAzureOpenAI =
      !!process.env.AZURE_OPENAI_API_KEY && !!process.env.AZURE_OPENAI_ENDPOINT

    const configured = hasAnthropic || hasOpenAI || hasAzureOpenAI

    let provider = 'None'
    if (hasAnthropic) provider = 'Anthropic Claude'
    else if (hasAzureOpenAI) provider = 'Azure OpenAI'
    else if (hasOpenAI) provider = 'OpenAI'

    return {
      name: 'AI Provider',
      status: configured ? 'ready' : 'pending',
      message: configured ? `Connected: ${provider}` : 'Connect an AI provider',
      required: true,
    }
  } catch (error) {
    console.error(LOG_PREFIX, 'AI check failed:', error)
    return {
      name: 'AI Provider',
      status: 'error',
      message: 'Failed to check AI configuration',
      required: true,
    }
  }
}

/**
 * Check database connectivity
 */
async function checkDatabaseConnected(): Promise<ReadinessCheck> {
  console.log(LOG_PREFIX, 'Checking database connection')

  try {
    // Lightweight query to test connection
    await prisma.$queryRaw`SELECT 1`

    return {
      name: 'Database',
      status: 'ready',
      message: 'Connected to PostgreSQL',
      required: true,
    }
  } catch (error) {
    console.error(LOG_PREFIX, 'Database check failed:', error)
    return {
      name: 'Database',
      status: 'error',
      message: 'Database connection failed',
      required: true,
    }
  }
}

/**
 * Check if Inngest is connected
 */
async function checkInngestConnected(): Promise<ReadinessCheck> {
  console.log(LOG_PREFIX, 'Checking Inngest connection')

  try {
    const hasInngestKey =
      !!process.env.INNGEST_EVENT_KEY || !!process.env.INNGEST_SIGNING_KEY
    const isDev = process.env.NODE_ENV === 'development'

    // In development, try to ping the Inngest dev server
    if (isDev) {
      try {
        const inngestUrl = process.env.INNGEST_DEV_URL || 'http://localhost:8288'
        const res = await fetch(`${inngestUrl}/health`, {
          signal: AbortSignal.timeout(2000),
        })
        if (res.ok) {
          return {
            name: 'Job Queue',
            status: 'ready',
            message: 'Inngest dev server running',
            required: false,
          }
        }
      } catch {
        // Dev server not running — fall through to env check
      }
    }

    // In production, keys should be configured
    const configured = hasInngestKey

    return {
      name: 'Job Queue',
      status: configured ? 'ready' : 'pending',
      message: configured
        ? 'Inngest connected'
        : isDev
          ? 'Start Inngest dev server (npx inngest-cli@latest dev)'
          : 'Configure Inngest keys',
      required: false,
    }
  } catch (error) {
    console.error(LOG_PREFIX, 'Inngest check failed:', error)
    return {
      name: 'Job Queue',
      status: 'error',
      message: 'Failed to check job queue',
      required: false,
    }
  }
}

/**
 * Check if workspace exists for user
 */
async function checkWorkspaceExists(
  workspaceId?: string
): Promise<ReadinessCheck> {
  console.log(LOG_PREFIX, 'Checking workspace exists')

  try {
    let workspace = null

    if (workspaceId) {
      workspace = await prisma.studioWorkspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, name: true },
      })
    } else {
      // Check if any workspace exists
      workspace = await prisma.studioWorkspace.findFirst({
        select: { id: true, name: true },
      })
    }

    return {
      name: 'Workspace',
      status: workspace ? 'ready' : 'pending',
      message: workspace ? `Active: ${workspace.name}` : 'Create a workspace',
      required: true,
    }
  } catch (error) {
    console.error(LOG_PREFIX, 'Workspace check failed:', error)
    return {
      name: 'Workspace',
      status: 'error',
      message: 'Failed to check workspace',
      required: true,
    }
  }
}

/**
 * Check if brand voice is configured
 */
async function checkBrandVoiceConfigured(
  workspaceId?: string
): Promise<ReadinessCheck> {
  console.log(LOG_PREFIX, 'Checking brand voice configuration')

  try {
    let brandGuardrails = null

    if (workspaceId) {
      brandGuardrails = await prisma.studioBrandGuardrails.findFirst({
        where: { workspaceId },
        select: { id: true, writingStyle: true },
      })
    } else {
      // Check if any brand guardrails exist
      brandGuardrails = await prisma.studioBrandGuardrails.findFirst({
        select: { id: true, writingStyle: true },
      })
    }

    return {
      name: 'Brand Voice',
      status: brandGuardrails ? 'ready' : 'pending',
      message: brandGuardrails
        ? `Configured: ${brandGuardrails.writingStyle || 'Custom'}`
        : 'Set up brand voice',
      required: false,
    }
  } catch (error) {
    console.error(LOG_PREFIX, 'Brand voice check failed:', error)
    return {
      name: 'Brand Voice',
      status: 'error',
      message: 'Failed to check brand voice',
      required: false,
    }
  }
}

/**
 * Check if any platform integrations are connected
 */
async function checkPlatformConnected(
  workspaceId?: string
): Promise<ReadinessCheck> {
  console.log(LOG_PREFIX, 'Checking platform integrations')

  try {
    let integrationCount = 0

    if (workspaceId) {
      integrationCount = await prisma.studioIntegration.count({
        where: {
          workspaceId,
          status: 'CONNECTED',
        },
      })
    } else {
      integrationCount = await prisma.studioIntegration.count({
        where: { status: 'CONNECTED' },
      })
    }

    return {
      name: 'Platform Integration',
      status: integrationCount > 0 ? 'ready' : 'pending',
      message:
        integrationCount > 0
          ? `${integrationCount} channel${integrationCount > 1 ? 's' : ''} connected`
          : 'Connect a publishing channel',
      required: false,
    }
  } catch (error) {
    console.error(LOG_PREFIX, 'Platform check failed:', error)
    return {
      name: 'Platform Integration',
      status: 'error',
      message: 'Failed to check integrations',
      required: false,
    }
  }
}

/**
 * Check if any content has been created
 */
async function checkContentCreated(
  workspaceId?: string
): Promise<ReadinessCheck> {
  console.log(LOG_PREFIX, 'Checking content creation')

  try {
    // ScheduledContent does not have a workspaceId column, so always count all
    const contentCount = await prisma.scheduledContent.count()

    return {
      name: 'First Content',
      status: contentCount > 0 ? 'ready' : 'pending',
      message:
        contentCount > 0
          ? `${contentCount} piece${contentCount > 1 ? 's' : ''} created`
          : 'Create your first content',
      required: false,
    }
  } catch (error) {
    console.error(LOG_PREFIX, 'Content check failed:', error)
    return {
      name: 'First Content',
      status: 'error',
      message: 'Failed to check content',
      required: false,
    }
  }
}

/**
 * Get comprehensive system readiness status
 */
export async function getSystemReadiness(
  workspaceId?: string
): Promise<SystemReadiness> {
  console.log(LOG_PREFIX, 'Starting system readiness check')

  const checks = await Promise.all([
    checkAuthConfigured(),
    checkAIConfigured(),
    checkDatabaseConnected(),
    checkInngestConnected(),
    checkWorkspaceExists(workspaceId),
    checkBrandVoiceConfigured(workspaceId),
    checkPlatformConnected(workspaceId),
    checkContentCreated(workspaceId),
  ])

  // Calculate readiness flags
  const authConfigured = checks[0].status === 'ready'
  const aiConfigured = checks[1].status === 'ready'
  const databaseConnected = checks[2].status === 'ready'
  const inngestConnected = checks[3].status === 'ready'
  const workspaceExists = checks[4].status === 'ready'
  const brandVoiceConfigured = checks[5].status === 'ready'
  const platformConnected = checks[6].status === 'ready'

  // Calculate score (only count required checks for minimum, all for percentage)
  const requiredChecks = checks.filter((c) => c.required)
  const requiredReady = requiredChecks.filter(
    (c) => c.status === 'ready'
  ).length
  const allReady = checks.filter((c) => c.status === 'ready').length

  const overallScore = Math.round((allReady / checks.length) * 100)
  const overallReady = requiredReady === requiredChecks.length

  console.log(
    LOG_PREFIX,
    `System ready: ${overallReady}, Score: ${overallScore}%`
  )

  return {
    authConfigured,
    aiConfigured,
    databaseConnected,
    inngestConnected,
    workspaceExists,
    brandVoiceConfigured,
    platformConnected,
    overallReady,
    overallScore,
    checks,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Get onboarding steps with completion status
 */
export async function getOnboardingSteps(workspaceId?: string): Promise<{
  steps: Array<{
    id: string
    title: string
    description: string
    completed: boolean
    href: string
    order: number
  }>
  completedCount: number
  totalCount: number
  percentComplete: number
}> {
  const readiness = await getSystemReadiness(workspaceId)

  const steps = [
    {
      id: 'ai-provider',
      title: 'Connect AI Provider',
      description: 'Set up Claude, OpenAI, or Azure OpenAI for content generation',
      completed: readiness.aiConfigured,
      href: '/studio/settings',
      order: 1,
    },
    {
      id: 'brand-voice',
      title: 'Set Brand Voice',
      description: 'Define your tone, audience, and content guidelines',
      completed: readiness.brandVoiceConfigured,
      href: '/studio/brand-voice',
      order: 2,
    },
    {
      id: 'first-content',
      title: 'Create First Content',
      description: 'Generate your first AI-powered marketing content',
      completed: readiness.checks[7]?.status === 'ready',
      href: '/studio/create',
      order: 3,
    },
    {
      id: 'connect-channel',
      title: 'Connect a Channel',
      description: 'Link LinkedIn, YouTube, or other platforms',
      completed: readiness.platformConnected,
      href: '/studio/integrations',
      order: 4,
    },
  ]

  const completedCount = steps.filter((s) => s.completed).length
  const totalCount = steps.length
  const percentComplete = Math.round((completedCount / totalCount) * 100)

  return {
    steps,
    completedCount,
    totalCount,
    percentComplete,
  }
}

/**
 * Get missing requirements for publishing
 */
export async function getPublishRequirements(workspaceId?: string): Promise<{
  canPublish: boolean
  missing: string[]
}> {
  const readiness = await getSystemReadiness(workspaceId)

  const missing: string[] = []

  if (!readiness.databaseConnected) {
    missing.push('Database connection required')
  }

  if (!readiness.aiConfigured) {
    missing.push('AI provider must be configured')
  }

  if (!readiness.workspaceExists) {
    missing.push('Workspace must be created')
  }

  if (!readiness.platformConnected) {
    missing.push('At least one publishing channel must be connected')
  }

  return {
    canPublish: missing.length === 0,
    missing,
  }
}
