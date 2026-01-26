import { z } from 'zod'
import { IntegrationType, NodeType } from '@/types'

/**
 * Workflow JSON Schema Validation
 *
 * A workflow consists of:
 * 1. TRIGGER node (exactly one) - watches for events on a source channel
 * 2. 1..N TARGET nodes - destination channels
 * 3. Optional TRANSFORM nodes - modify content
 * 4. Optional APPROVAL nodes - human approval gates
 * 5. Optional PUBLISH nodes - execute publish action
 * 6. Optional TRACK nodes - record outcome events
 */

// Node configuration schemas
const TriggerConfigSchema = z.object({
  integrationType: z.nativeEnum(IntegrationType),
  eventType: z.enum(['new_post', 'scheduled', 'manual']),
  filters: z.object({
    keywords: z.array(z.string()).optional(),
    hashtags: z.array(z.string()).optional(),
    minEngagement: z.number().optional(),
  }).optional(),
})

const TargetConfigSchema = z.object({
  integrationType: z.nativeEnum(IntegrationType),
  postType: z.enum(['video', 'image', 'text', 'story', 'reel', 'short']).optional(),
  scheduling: z.object({
    delay: z.number().optional(), // minutes
    publishAt: z.string().optional(), // ISO datetime
    timezone: z.string().optional(),
  }).optional(),
})

const TransformConfigSchema = z.object({
  operations: z.array(z.object({
    type: z.enum(['adapt_caption', 'adapt_title', 'adapt_description', 'resize_media', 'add_hashtags', 'remove_hashtags', 'add_cta']),
    params: z.record(z.unknown()).optional(),
  })),
  aiAssisted: z.boolean().default(true),
  preserveOriginal: z.boolean().default(true),
})

const ApprovalConfigSchema = z.object({
  requiredRole: z.enum(['ADMIN', 'APPROVER']).default('APPROVER'),
  timeout: z.number().optional(), // hours until auto-expire
  notifyChannels: z.array(z.enum(['email', 'slack', 'in_app'])).default(['in_app']),
  escalationAfter: z.number().optional(), // hours until escalation
})

const PublishConfigSchema = z.object({
  retryOnFailure: z.boolean().default(true),
  maxRetries: z.number().default(3),
  retryDelay: z.number().default(5), // minutes
  notifyOnSuccess: z.boolean().default(true),
  notifyOnFailure: z.boolean().default(true),
})

const TrackConfigSchema = z.object({
  events: z.array(z.enum([
    'publish_success',
    'publish_failure',
    'engagement_milestone',
    'lead_attributed',
    'meeting_booked',
  ])),
  webhookUrl: z.string().url().optional(),
  crm: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(['salesforce', 'hubspot', 'dataverse']).optional(),
  }).optional(),
})

// Node schema
const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(NodeType),
  name: z.string().min(1).max(100),
  config: z.union([
    TriggerConfigSchema,
    TargetConfigSchema,
    TransformConfigSchema,
    ApprovalConfigSchema,
    PublishConfigSchema,
    TrackConfigSchema,
  ]),
  position: z.number().int().min(0),
  nextNodes: z.array(z.string()).optional(), // IDs of connected nodes
})

// Full workflow definition schema
export const WorkflowDefinitionSchema = z.object({
  version: z.literal('1.0'),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  nodes: z.array(WorkflowNodeSchema).min(2), // At least trigger + target
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
  })),
  settings: z.object({
    enabled: z.boolean().default(false),
    requireApproval: z.boolean().default(true),
    timezone: z.string().default('UTC'),
  }).optional(),
}).refine((data) => {
  // Validate exactly one TRIGGER node
  const triggerNodes = data.nodes.filter(n => n.type === 'TRIGGER')
  return triggerNodes.length === 1
}, {
  message: 'Workflow must have exactly one TRIGGER node',
}).refine((data) => {
  // Validate at least one TARGET node
  const targetNodes = data.nodes.filter(n => n.type === 'TARGET')
  return targetNodes.length >= 1
}, {
  message: 'Workflow must have at least one TARGET node',
})

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>
export type TriggerConfig = z.infer<typeof TriggerConfigSchema>
export type TargetConfig = z.infer<typeof TargetConfigSchema>
export type TransformConfig = z.infer<typeof TransformConfigSchema>
export type ApprovalConfig = z.infer<typeof ApprovalConfigSchema>
export type PublishConfig = z.infer<typeof PublishConfigSchema>
export type TrackConfig = z.infer<typeof TrackConfigSchema>

/**
 * Validate a workflow definition
 */
export function validateWorkflow(definition: unknown): {
  valid: boolean
  errors: string[]
  data?: WorkflowDefinition
} {
  const result = WorkflowDefinitionSchema.safeParse(definition)

  if (result.success) {
    return { valid: true, errors: [], data: result.data }
  }

  return {
    valid: false,
    errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
  }
}

/**
 * Create a default workflow template
 */
export function createWorkflowTemplate(
  name: string,
  sourceChannel: IntegrationType,
  targetChannel: IntegrationType
): WorkflowDefinition {
  return {
    version: '1.0',
    name,
    description: `Auto-share content from ${sourceChannel} to ${targetChannel}`,
    nodes: [
      {
        id: 'trigger-1',
        type: 'TRIGGER',
        name: `Watch ${sourceChannel}`,
        config: {
          integrationType: sourceChannel,
          eventType: 'new_post',
        },
        position: 0,
      },
      {
        id: 'transform-1',
        type: 'TRANSFORM',
        name: 'Adapt Content',
        config: {
          operations: [
            { type: 'adapt_caption' },
            { type: 'adapt_title' },
          ],
          aiAssisted: true,
          preserveOriginal: true,
        },
        position: 1,
      },
      {
        id: 'approval-1',
        type: 'APPROVAL',
        name: 'Human Approval',
        config: {
          requiredRole: 'APPROVER',
          timeout: 24,
          notifyChannels: ['in_app', 'email'],
        },
        position: 2,
      },
      {
        id: 'target-1',
        type: 'TARGET',
        name: `Post to ${targetChannel}`,
        config: {
          integrationType: targetChannel,
        },
        position: 3,
      },
      {
        id: 'publish-1',
        type: 'PUBLISH',
        name: 'Execute Publish',
        config: {
          retryOnFailure: true,
          maxRetries: 3,
          retryDelay: 5,
          notifyOnSuccess: true,
          notifyOnFailure: true,
        },
        position: 4,
      },
      {
        id: 'track-1',
        type: 'TRACK',
        name: 'Track Outcome',
        config: {
          events: ['publish_success', 'publish_failure'],
        },
        position: 5,
      },
    ],
    edges: [
      { from: 'trigger-1', to: 'transform-1' },
      { from: 'transform-1', to: 'approval-1' },
      { from: 'approval-1', to: 'target-1' },
      { from: 'target-1', to: 'publish-1' },
      { from: 'publish-1', to: 'track-1' },
    ],
    settings: {
      enabled: false,
      requireApproval: true,
      timezone: 'UTC',
    },
  }
}
