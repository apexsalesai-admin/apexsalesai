import { NextRequest, NextResponse } from 'next/server'
import { hasPermission } from '@/lib/rbac'
import { UserRole, WorkflowStatus } from '@/types'

// Mock workflows for MVP - workflow model needs redesign for multi-tenant
const MOCK_WORKFLOWS = [
  {
    id: 'wf_1',
    name: 'TikTok → YouTube Auto-Share',
    description: 'Automatically share TikTok videos as YouTube Shorts',
    status: 'ACTIVE' as WorkflowStatus,
    nodeCount: 5,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    id: 'wf_2',
    name: 'Blog → LinkedIn Share',
    description: 'Share new blog posts to LinkedIn',
    status: 'ACTIVE' as WorkflowStatus,
    nodeCount: 4,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
  {
    id: 'wf_3',
    name: 'YouTube → X Thread',
    description: 'Create X threads from YouTube videos',
    status: 'PAUSED' as WorkflowStatus,
    nodeCount: 6,
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
  },
]

// GET /api/workflows - List all workflows
export async function GET(request: NextRequest) {
  try {
    // TODO: When workflow model is redesigned, fetch from database
    // For now, return mock data
    return NextResponse.json({
      success: true,
      data: MOCK_WORKFLOWS,
      message: 'Workflows are in preview mode. Full workflow management coming soon.',
    })
  } catch (error) {
    console.error('[GET /api/workflows]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workflows' },
      { status: 500 }
    )
  }
}

// POST /api/workflows - Create a new workflow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description } = body

    // TODO: Get user from session and verify permissions
    const userRole = (request.headers.get('x-user-role') || 'PUBLISHER') as UserRole

    // Check permissions
    if (!hasPermission(userRole, 'workflows:create')) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    // TODO: When workflow model is redesigned, create in database
    // For now, return mock created workflow
    const workflow = {
      id: `wf_${Date.now()}`,
      name,
      description,
      status: 'DRAFT' as WorkflowStatus,
      nodeCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    return NextResponse.json({
      success: true,
      data: workflow,
      message: 'Workflow created in preview mode',
    })
  } catch (error) {
    console.error('[POST /api/workflows]', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create workflow' },
      { status: 500 }
    )
  }
}
