/**
 * Workspace Management — membership-based only
 *
 * Handles workspace creation, retrieval, bootstrapping, and authorization.
 * All ownership checks use StudioWorkspaceMember exclusively.
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
 * Assert that a user has access to a workspace via membership.
 *
 * @returns Workspace info if access is granted, null if denied.
 */
export async function assertWorkspaceAccess(params: {
  workspaceId: string
  userId: string
}): Promise<{ id: string; name: string } | null> {
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

  return null
}

// ─── Bootstrap / CRUD ───────────────────────────────────────────────────────

/**
 * Get or create a default workspace for a user.
 *
 * Lookup order:
 * 1. Membership table (user has a StudioWorkspaceMember record)
 * 2. Create new workspace + OWNER membership
 */
export async function getOrCreateWorkspace(
  userId: string,
  _userEmail?: string
): Promise<WorkspaceInfo> {
  console.log('[WORKSPACE] Getting or creating workspace for user:', userId)

  try {
    // 1. Check membership table (canonical path)
    const membership = await prisma.studioWorkspaceMember.findFirst({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
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

    // 2. Create new workspace + OWNER membership in a transaction
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
    const memberships = await prisma.studioWorkspaceMember.findMany({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true, createdAt: true },
        },
      },
    })

    return memberships.map((m) => m.workspace)
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
