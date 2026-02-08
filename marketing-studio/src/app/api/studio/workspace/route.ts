/**
 * Workspace API — P11/P10 aligned (membership-based)
 *
 * Manages workspaces with automatic bootstrap for new users.
 *
 * GET    /api/studio/workspace            - Get current workspace (auto-creates if needed)
 * GET    /api/studio/workspace?list=true  - List all workspaces for user
 * POST   /api/studio/workspace            - Create new workspace (creates OWNER membership)
 * PATCH  /api/studio/workspace            - Update workspace name/settings (workspace-auth required)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getOrCreateWorkspace,
  listUserWorkspaces,
  updateWorkspace,
  assertWorkspaceAccess,
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

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
}

/**
 * GET - Get or create workspace for current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: NO_CACHE_HEADERS }
      )
    }

    const { searchParams } = new URL(request.url)
    const listAll = searchParams.get('list') === 'true'

    if (listAll) {
      const workspaces = await listUserWorkspaces(session.user.id)
      return NextResponse.json(
        { success: true, data: workspaces },
        { headers: NO_CACHE_HEADERS }
      )
    }

    const workspace = await getOrCreateWorkspace(
      session.user.id,
      session.user.email || undefined
    )

    return NextResponse.json(
      { success: true, data: workspace },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error) {
    console.error('[API:Workspace:GET] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

/**
 * POST - Create new workspace (membership-based OWNER)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: NO_CACHE_HEADERS }
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
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const { name } = validation.data
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`

    // Create workspace + OWNER membership in a transaction
    const workspace = await prisma.$transaction(async (tx) => {
      const created = await tx.studioWorkspace.create({
        data: {
          name,
          slug,
          settings: {
            defaultTone: 'professional',
            defaultAudience: 'business professionals',
            timezone: 'America/New_York',
          },
        },
        select: { id: true, name: true, slug: true, createdAt: true },
      })

      await tx.studioWorkspaceMember.create({
        data: {
          workspaceId: created.id,
          userId: session.user.id!,
          role: 'OWNER',
          joinedAt: new Date(),
        },
      })

      // Legacy DB backfill for existing ownerId column (non-fatal)
      try {
        await tx.$executeRaw`
          UPDATE studio_workspaces
          SET "ownerId" = ${session.user.id}
          WHERE id = ${created.id} AND ("ownerId" IS NULL OR "ownerId" = '')
        `
      } catch {
        // ignore — some environments may not have this column
      }

      return created
    })

    console.log('[API:Workspace] Created workspace:', workspace.id)

    return NextResponse.json(
      {
        success: true,
        data: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          createdAt: workspace.createdAt,
        },
      },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error) {
    console.error('[API:Workspace:POST] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

/**
 * PATCH - Update workspace settings (workspace-auth required)
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: NO_CACHE_HEADERS }
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
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const { workspaceId, name, settings } = validation.data

    // P10/P11: enforce workspace authorization via membership
    const allowed = await assertWorkspaceAccess({
      workspaceId,
      userId: session.user.id,
    })

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Workspace access denied' },
        { status: 403, headers: NO_CACHE_HEADERS }
      )
    }

    const updated = await updateWorkspace(workspaceId, {
      ...(name ? { name } : {}),
      ...(settings ? { settings } : {}),
    })

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Update failed' },
        { status: 500, headers: NO_CACHE_HEADERS }
      )
    }

    return NextResponse.json(
      { success: true, data: updated },
      { headers: NO_CACHE_HEADERS }
    )
  } catch (error) {
    console.error('[API:Workspace:PATCH] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
