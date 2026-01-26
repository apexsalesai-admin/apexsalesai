import { validateWorkflow, createWorkflowTemplate, WorkflowDefinition } from '@/lib/workflow-schema'

describe('Workflow Schema Validation', () => {
  describe('validateWorkflow', () => {
    test('valid workflow with all required nodes passes validation', () => {
      const workflow = createWorkflowTemplate('Test Workflow', 'TIKTOK', 'YOUTUBE')
      const result = validateWorkflow(workflow)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.data).toBeDefined()
    })

    test('workflow without TRIGGER node fails validation', () => {
      const workflow: Record<string, unknown> = {
        version: '1.0',
        name: 'Invalid Workflow',
        nodes: [
          { id: 'target-1', type: 'TARGET', name: 'Post to YouTube', config: { integrationType: 'YOUTUBE' }, position: 0 },
        ],
        edges: [],
      }

      const result = validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('TRIGGER'))).toBe(true)
    })

    test('workflow without TARGET node fails validation', () => {
      const workflow: Record<string, unknown> = {
        version: '1.0',
        name: 'Invalid Workflow',
        nodes: [
          { id: 'trigger-1', type: 'TRIGGER', name: 'Watch TikTok', config: { integrationType: 'TIKTOK', eventType: 'new_post' }, position: 0 },
        ],
        edges: [],
      }

      const result = validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('TARGET'))).toBe(true)
    })

    test('workflow with multiple TRIGGER nodes fails validation', () => {
      const workflow: Record<string, unknown> = {
        version: '1.0',
        name: 'Invalid Workflow',
        nodes: [
          { id: 'trigger-1', type: 'TRIGGER', name: 'Watch TikTok', config: { integrationType: 'TIKTOK', eventType: 'new_post' }, position: 0 },
          { id: 'trigger-2', type: 'TRIGGER', name: 'Watch YouTube', config: { integrationType: 'YOUTUBE', eventType: 'new_post' }, position: 1 },
          { id: 'target-1', type: 'TARGET', name: 'Post to LinkedIn', config: { integrationType: 'LINKEDIN' }, position: 2 },
        ],
        edges: [],
      }

      const result = validateWorkflow(workflow)

      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('exactly one TRIGGER'))).toBe(true)
    })

    test('workflow with empty name fails validation', () => {
      const workflow: Record<string, unknown> = {
        version: '1.0',
        name: '',
        nodes: [
          { id: 'trigger-1', type: 'TRIGGER', name: 'Watch TikTok', config: { integrationType: 'TIKTOK', eventType: 'new_post' }, position: 0 },
          { id: 'target-1', type: 'TARGET', name: 'Post to YouTube', config: { integrationType: 'YOUTUBE' }, position: 1 },
        ],
        edges: [],
      }

      const result = validateWorkflow(workflow)

      expect(result.valid).toBe(false)
    })

    test('workflow with invalid version fails validation', () => {
      const workflow: Record<string, unknown> = {
        version: '2.0',
        name: 'Test Workflow',
        nodes: [
          { id: 'trigger-1', type: 'TRIGGER', name: 'Watch TikTok', config: { integrationType: 'TIKTOK', eventType: 'new_post' }, position: 0 },
          { id: 'target-1', type: 'TARGET', name: 'Post to YouTube', config: { integrationType: 'YOUTUBE' }, position: 1 },
        ],
        edges: [],
      }

      const result = validateWorkflow(workflow)

      expect(result.valid).toBe(false)
    })
  })

  describe('createWorkflowTemplate', () => {
    test('creates a valid workflow template', () => {
      const template = createWorkflowTemplate('My Workflow', 'TIKTOK', 'YOUTUBE')

      expect(template.version).toBe('1.0')
      expect(template.name).toBe('My Workflow')
      expect(template.nodes.length).toBeGreaterThan(0)

      // Check for required node types
      const nodeTypes = template.nodes.map(n => n.type)
      expect(nodeTypes).toContain('TRIGGER')
      expect(nodeTypes).toContain('TARGET')
    })

    test('template includes approval gate by default', () => {
      const template = createWorkflowTemplate('Test', 'LINKEDIN', 'X_TWITTER')

      const approvalNode = template.nodes.find(n => n.type === 'APPROVAL')
      expect(approvalNode).toBeDefined()
    })

    test('template includes transform step', () => {
      const template = createWorkflowTemplate('Test', 'YOUTUBE', 'TIKTOK')

      const transformNode = template.nodes.find(n => n.type === 'TRANSFORM')
      expect(transformNode).toBeDefined()
    })

    test('template includes track step for telemetry', () => {
      const template = createWorkflowTemplate('Test', 'TIKTOK', 'LINKEDIN')

      const trackNode = template.nodes.find(n => n.type === 'TRACK')
      expect(trackNode).toBeDefined()
    })

    test('edges connect nodes in correct order', () => {
      const template = createWorkflowTemplate('Test', 'TIKTOK', 'YOUTUBE')

      expect(template.edges.length).toBeGreaterThan(0)

      // First edge should start from trigger
      const firstEdge = template.edges[0]
      expect(firstEdge.from).toBe('trigger-1')
    })
  })
})
