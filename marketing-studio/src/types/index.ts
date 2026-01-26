// ============================================================================
// LOCAL ENUM DEFINITIONS
// These were previously in Prisma schema but are now defined locally
// for backward compatibility with existing API routes
// ============================================================================

// User roles - mapped to StudioWorkspaceRole in new schema
export type UserRole = 'ADMIN' | 'APPROVER' | 'PUBLISHER' | 'VIEWER'
export const UserRole = {
  ADMIN: 'ADMIN' as const,
  APPROVER: 'APPROVER' as const,
  PUBLISHER: 'PUBLISHER' as const,
  VIEWER: 'VIEWER' as const,
}

// Integration types - mapped to StudioIntegrationType
export type IntegrationType = 'YOUTUBE' | 'TIKTOK' | 'LINKEDIN' | 'X_TWITTER' | 'FACEBOOK' | 'INSTAGRAM'
export const IntegrationType = {
  YOUTUBE: 'YOUTUBE' as const,
  TIKTOK: 'TIKTOK' as const,
  LINKEDIN: 'LINKEDIN' as const,
  X_TWITTER: 'X_TWITTER' as const,
  FACEBOOK: 'FACEBOOK' as const,
  INSTAGRAM: 'INSTAGRAM' as const,
}

// Integration status - mapped to StudioIntegrationStatus
export type IntegrationStatus = 'PENDING' | 'CONNECTED' | 'DISCONNECTED' | 'REVOKED' | 'ERROR' | 'EXPIRED'
export const IntegrationStatus = {
  PENDING: 'PENDING' as const,
  CONNECTED: 'CONNECTED' as const,
  DISCONNECTED: 'DISCONNECTED' as const,
  REVOKED: 'REVOKED' as const,
  ERROR: 'ERROR' as const,
  EXPIRED: 'EXPIRED' as const,
}

// Workflow status
export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
export const WorkflowStatus = {
  DRAFT: 'DRAFT' as const,
  ACTIVE: 'ACTIVE' as const,
  PAUSED: 'PAUSED' as const,
  ARCHIVED: 'ARCHIVED' as const,
}

// Node types for workflow builder
export type NodeType = 'TRIGGER' | 'TRANSFORM' | 'APPROVAL' | 'TARGET' | 'PUBLISH' | 'TRACK'
export const NodeType = {
  TRIGGER: 'TRIGGER' as const,
  TRANSFORM: 'TRANSFORM' as const,
  APPROVAL: 'APPROVAL' as const,
  TARGET: 'TARGET' as const,
  PUBLISH: 'PUBLISH' as const,
  TRACK: 'TRACK' as const,
}

// Approval status
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'
export const ApprovalStatus = {
  PENDING: 'PENDING' as const,
  APPROVED: 'APPROVED' as const,
  REJECTED: 'REJECTED' as const,
  EXPIRED: 'EXPIRED' as const,
}

// Audit actions - subset of StudioAuditAction
export type AuditAction =
  | 'INTEGRATION_CONNECTED'
  | 'INTEGRATION_DISCONNECTED'
  | 'INTEGRATION_REVOKED'
  | 'WORKFLOW_CREATED'
  | 'WORKFLOW_UPDATED'
  | 'WORKFLOW_ACTIVATED'
  | 'WORKFLOW_PAUSED'
  | 'WORKFLOW_DELETED'
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_DENIED'
  | 'PUBLISH_STARTED'
  | 'PUBLISH_SUCCEEDED'
  | 'PUBLISH_FAILED'
  | 'CONTENT_CREATED'
  | 'CONTENT_UPDATED'
  | 'CONTENT_DELETED'
  | 'SETTINGS_UPDATED'

export const AuditAction = {
  INTEGRATION_CONNECTED: 'INTEGRATION_CONNECTED' as const,
  INTEGRATION_DISCONNECTED: 'INTEGRATION_DISCONNECTED' as const,
  INTEGRATION_REVOKED: 'INTEGRATION_REVOKED' as const,
  WORKFLOW_CREATED: 'WORKFLOW_CREATED' as const,
  WORKFLOW_UPDATED: 'WORKFLOW_UPDATED' as const,
  WORKFLOW_ACTIVATED: 'WORKFLOW_ACTIVATED' as const,
  WORKFLOW_PAUSED: 'WORKFLOW_PAUSED' as const,
  WORKFLOW_DELETED: 'WORKFLOW_DELETED' as const,
  APPROVAL_REQUESTED: 'APPROVAL_REQUESTED' as const,
  APPROVAL_GRANTED: 'APPROVAL_GRANTED' as const,
  APPROVAL_DENIED: 'APPROVAL_DENIED' as const,
  PUBLISH_STARTED: 'PUBLISH_STARTED' as const,
  PUBLISH_SUCCEEDED: 'PUBLISH_SUCCEEDED' as const,
  PUBLISH_FAILED: 'PUBLISH_FAILED' as const,
  CONTENT_CREATED: 'CONTENT_CREATED' as const,
  CONTENT_UPDATED: 'CONTENT_UPDATED' as const,
  CONTENT_DELETED: 'CONTENT_DELETED' as const,
  SETTINGS_UPDATED: 'SETTINGS_UPDATED' as const,
}

// Telemetry event types - for KPI tracking
export type TelemetryEventType =
  | 'POST_CREATED'
  | 'POST_PUBLISHED'
  | 'POST_FAILED'
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_COMPLETED'
  | 'LEAD_ATTRIBUTED'
  | 'MEETING_BOOKED'
  | 'REVENUE_ATTRIBUTED'

export const TelemetryEventType = {
  POST_CREATED: 'POST_CREATED' as const,
  POST_PUBLISHED: 'POST_PUBLISHED' as const,
  POST_FAILED: 'POST_FAILED' as const,
  APPROVAL_REQUESTED: 'APPROVAL_REQUESTED' as const,
  APPROVAL_COMPLETED: 'APPROVAL_COMPLETED' as const,
  LEAD_ATTRIBUTED: 'LEAD_ATTRIBUTED' as const,
  MEETING_BOOKED: 'MEETING_BOOKED' as const,
  REVENUE_ATTRIBUTED: 'REVENUE_ATTRIBUTED' as const,
}

// User types
export interface User {
  id: string
  email: string
  name: string | null
  role: UserRole
  avatarUrl: string | null
  isActive: boolean
  onboardingCompleted: boolean
  onboardingStep: number
  azureOid: string | null
  createdAt: Date
  updatedAt: Date
}

// Onboarding types
export interface OnboardingState {
  currentStep: number
  steps: {
    channels: OnboardingChannelsData | null
    guardrails: OnboardingGuardrailsData | null
    approvals: OnboardingApprovalsData | null
    kpis: OnboardingKPIsData | null
  }
  completed: boolean
}

export interface OnboardingChannelsData {
  connectedChannels: IntegrationType[]
  pendingChannels: IntegrationType[]
}

export interface OnboardingGuardrailsData {
  voiceTone: string[]
  bannedClaims: string[]
  complianceRules: string[]
  doNotSayList: string[]
  ctaStyle: string | null
  ctaExamples: string[]
}

export interface OnboardingApprovalsData {
  roles: {
    admins: string[]
    approvers: string[]
    publishers: string[]
    viewers: string[]
  }
  approvalGates: {
    channelType: IntegrationType
    requireApproval: boolean
    approverRole: UserRole
  }[]
}

export interface OnboardingKPIsData {
  primaryGoal: 'pipeline' | 'leads' | 'meetings' | 'revenue'
  kpiCounters: string[]
  timeWindow: 'day' | 'week' | 'month' | 'quarter'
}

// Workflow types
export interface WorkflowSummary {
  id: string
  name: string
  description: string | null
  status: WorkflowStatus
  nodeCount: number
  createdAt: Date
  updatedAt: Date
}

// KPI Dashboard types
export interface KPIDashboardData {
  summary: {
    postsCreated: number
    postsPublished: number
    approvalsPending: number
    leadsAttributed: number
    meetingsBooked: number
    revenueAttributed: number
  }
  trends: {
    posts: { period: string; value: number }[]
    leads: { period: string; value: number }[]
    revenue: { period: string; value: number }[]
  }
  byChannel: {
    channel: IntegrationType
    posts: number
    engagement: number
  }[]
}

// Audit log types
export interface AuditLogEntry {
  id: string
  action: AuditAction
  userId: string | null
  userEmail: string | null
  userName: string | null
  resourceType: string | null
  resourceId: string | null
  details: Record<string, unknown>
  ipAddress: string | null
  createdAt: Date
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Feature flags
export interface FeatureFlags {
  mockConnectors: boolean
  aiTransforms: boolean
  advancedWorkflows: boolean
  crmIntegration: boolean
  customWebhooks: boolean
}

// Session/Auth types
export interface Session {
  user: User
  accessToken: string
  expiresAt: Date
}
