/**
 * Workspace API
 *
 * Manages workspaces with automatic bootstrap for new users.
 *
 * GET /api/studio/workspace - Get current workspace (auto-creates if needed)
 * POST /api/studio/workspace - Create new workspace
 * PATCH /api/studio/workspace - Update workspace settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getOrCreateWorkspace,
  listUserWorkspaces,
  updateWorkspace,
} from '@/lib/workspace'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const CreateWorkspaceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
})

const UpdateWorkspaceSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(100).optional(),
  settings: z.record(z.unknown()).optional(),
})

/**
 * GET - Get or create workspace for current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const listAll = searchParams.get('list') === 'true'

    if (listAll) {
      // Return all workspaces for user
      const workspaces = await listUserWorkspaces(session.user.id)

      return NextResponse.json({
        success: true,
        data: workspaces,
      })
    }

    // Get or create default workspace
    const workspace = await getOrCreateWorkspace(
      session.user.id,
      session.user.email || undefined
    )

    return NextResponse.json({
      success: true,
      data: workspace,
    })
  } catch (error) {
    console.error('[API:Workspace:GET] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST - Create new workspace
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = CreateWorkspaceSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { name } = validation.data
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`

    const workspace = await prisma.studioWorkspace.create({
      data: {
        name,
        slug,
        ownerId: session.user.id,
        settings: {
          defaultTone: 'professional',
          defaultAudience: 'business professionals',
          timezone: 'America/New_York',
        },
      },
    })

    console.log('[API:Workspace] Created workspace:', workspace.id)

    return NextResponse.json({
      success: true,
      data: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        ownerId: workspace.ownerId,
        createdAt: workspace.createdAt,
      },
    })
  } catch (error) {
    console.error('[API:Workspace:POST] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Update workspace settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = UpdateWorkspaceSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { workspaceId, name, settings } = validation.data

    // Verify ownership
    const existing = await prisma.studioWorkspace.findUnique({
      where: { id: workspaceId },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Workspace not found' },
        { status: 404 }
      )
    }

    if (existing.ownerId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 }
      )
    }

    const updated = await updateWorkspace(workspaceId, { name, settings })

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Update failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error('[API:Workspace:PATCH] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
