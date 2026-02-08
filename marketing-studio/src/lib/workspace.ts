/**
 * Workspace Management — P11 aligned (membership-based)
 *
 * Handles workspace creation, retrieval, bootstrapping, and authorization.
 *
 * All ownership checks use StudioWorkspaceMember (canonical path) with a raw SQL
 * fallback for the legacy "ownerId" column that exists in the DB but is not exposed
 * in the current Prisma schema.
 */

import { prisma } from '@/lib/db'

export interface WorkspaceInfo {
  id: string
  name: string
  slug: string
  createdAt: Date
}

// ─── Authorization ──────────────────────────────────────────────────────────

/**
 * Assert that a user has access to a workspace.
 *
 * 1. Checks StudioWorkspaceMember (canonical path).
 * 2. Falls back to ownerId via raw SQL for legacy workspaces.
 * 3. Auto-creates a membership record on ownership fallback.
 *
 * @returns Workspace info if access is granted, null if denied.
 */
export async function assertWorkspaceAccess(params: {
  workspaceId: string
  userId: string
}): Promise<{ id: string; name: string } | null> {
  // 1. Check membership table (canonical path)
  const member = await prisma.studioWorkspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: params.workspaceId,
        userId: params.userId,
      },
    },
    include: {
      workspace: {
        select: { id: true, name: true },
      },
    },
  })

  if (member) {
    return member.workspace
  }

  // 2. Fallback: ownership check via raw query (backward compat)
  const rows = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
    SELECT id, name FROM studio_workspaces
    WHERE id = ${params.workspaceId} AND "ownerId" = ${params.userId}
    LIMIT 1
  `

  if (rows.length > 0) {
    // Auto-create membership record so future checks use the fast path
    try {
      await prisma.studioWorkspaceMember.create({
        data: {
          workspaceId: params.workspaceId,
          userId: params.userId,
          role: 'OWNER',
          joinedAt: new Date(),
        },
      })
    } catch {
      // Ignore — might already exist (race condition)
    }
    return rows[0]
  }

  return null
}

// ─── Bootstrap / CRUD ───────────────────────────────────────────────────────

/**
 * Get or create a default workspace for a user.
 *
 * Lookup order:
 * 1. Membership table (user has a StudioWorkspaceMember record)
 * 2. Legacy ownerId via raw SQL
 * 3. Create new workspace + OWNER membership
 */
export async function getOrCreateWorkspace(
  userId: string,
  _userEmail?: string
): Promise<WorkspaceInfo> {
  console.log('[WORKSPACE] Getting or creating workspace for user:', userId)

  try {
    // 1. Check membership table first (canonical path)
    const membership = await prisma.studioWorkspaceMember.findFirst({
      where: { userId },
      orderBy: { invitedAt: 'asc' },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true, createdAt: true },
        },
      },
    })

    if (membership) {
      console.log('[WORKSPACE] Found via membership:', membership.workspace.id)
      return membership.workspace
    }

    // 2. Fallback: legacy ownerId via raw SQL
    const legacyRows = await prisma.$queryRaw<
      Array<{ id: string; name: string; slug: string; createdAt: Date }>
    >`
      SELECT id, name, slug, "createdAt"
      FROM studio_workspaces
      WHERE "ownerId" = ${userId}
      ORDER BY "createdAt" ASC
      LIMIT 1
    `

    if (legacyRows.length > 0) {
      const ws = legacyRows[0]
      console.log('[WORKSPACE] Found via legacy ownerId:', ws.id)

      // Auto-create membership for future fast-path
      try {
        await prisma.studioWorkspaceMember.create({
          data: {
            workspaceId: ws.id,
            userId,
            role: 'OWNER',
            joinedAt: new Date(),
          },
        })
      } catch {
        // Ignore — might already exist
      }

      return ws
    }

    // 3. Create new workspace + OWNER membership in a transaction
    const workspaceName = 'My Workspace'
    const slug = `workspace-${userId.substring(0, 8)}-${Date.now()}`

    console.log('[WORKSPACE] Creating new workspace:', workspaceName)

    const newWorkspace = await prisma.$transaction(async (tx) => {
      const created = await tx.studioWorkspace.create({
        data: {
          name: workspaceName,
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
          userId,
          role: 'OWNER',
          joinedAt: new Date(),
        },
      })

      // Legacy backfill: set ownerId for backward compat (non-fatal)
      try {
        await tx.$executeRaw`
          UPDATE studio_workspaces
          SET "ownerId" = ${userId}
          WHERE id = ${created.id} AND ("ownerId" IS NULL OR "ownerId" = '')
        `
      } catch {
        // Ignore — column may not exist
      }

      return created
    })

    console.log('[WORKSPACE] Created workspace:', newWorkspace.id)
    return newWorkspace
  } catch (error) {
    console.error('[WORKSPACE] Error:', error)
    throw error
  }
}

/**
 * Get workspace by ID (no auth check — use assertWorkspaceAccess for gated access)
 */
export async function getWorkspaceById(
  workspaceId: string
): Promise<WorkspaceInfo | null> {
  try {
    const workspace = await prisma.studioWorkspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, slug: true, createdAt: true },
    })

    return workspace
  } catch (error) {
    console.error('[WORKSPACE] Get by ID error:', error)
    return null
  }
}

/**
 * List all workspaces for a user via membership table.
 */
export async function listUserWorkspaces(
  userId: string
): Promise<WorkspaceInfo[]> {
  try {
    // Primary: membership-based lookup
    const memberships = await prisma.studioWorkspaceMember.findMany({
      where: { userId },
      orderBy: { invitedAt: 'asc' },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true, createdAt: true },
        },
      },
    })

    if (memberships.length > 0) {
      return memberships.map((m) => m.workspace)
    }

    // Fallback: legacy ownerId via raw SQL
    const legacyRows = await prisma.$queryRaw<WorkspaceInfo[]>`
      SELECT id, name, slug, "createdAt"
      FROM studio_workspaces
      WHERE "ownerId" = ${userId}
      ORDER BY "createdAt" ASC
    `

    // Auto-migrate membership for each found workspace
    for (const ws of legacyRows) {
      try {
        await prisma.studioWorkspaceMember.create({
          data: {
            workspaceId: ws.id,
            userId,
            role: 'OWNER',
            joinedAt: new Date(),
          },
        })
      } catch {
        // Ignore — might already exist
      }
    }

    return legacyRows
  } catch (error) {
    console.error('[WORKSPACE] List error:', error)
    return []
  }
}

/**
 * Update workspace name/settings.
 * Caller must have already verified access via assertWorkspaceAccess().
 */
export async function updateWorkspace(
  workspaceId: string,
  data: { name?: string; settings?: Record<string, unknown> }
): Promise<WorkspaceInfo | null> {
  try {
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.settings !== undefined) updateData.settings = data.settings

    const workspace = await prisma.studioWorkspace.update({
      where: { id: workspaceId },
      data: updateData,
      select: { id: true, name: true, slug: true, createdAt: true },
    })

    return workspace
  } catch (error) {
    console.error('[WORKSPACE] Update error:', error)
    return null
  }
}
