/**
 * Workspace Management
 *
 * Handles workspace creation, retrieval, and bootstrapping for new users.
 */

import { prisma } from '@/lib/db'

export interface WorkspaceInfo {
  id: string
  name: string
  slug: string
  ownerId: string
  createdAt: Date
}

/**
 * Get or create a default workspace for a user
 */
export async function getOrCreateWorkspace(
  userId: string,
  userEmail?: string
): Promise<WorkspaceInfo> {
  console.log('[WORKSPACE] Getting or creating workspace for user:', userId)

  try {
    // First, check if user has any workspace
    const existingWorkspace = await prisma.studioWorkspace.findFirst({
      where: {
        ownerId: userId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    if (existingWorkspace) {
      console.log('[WORKSPACE] Found existing workspace:', existingWorkspace.id)
      return {
        id: existingWorkspace.id,
        name: existingWorkspace.name,
        slug: existingWorkspace.slug,
        ownerId: existingWorkspace.ownerId,
        createdAt: existingWorkspace.createdAt,
      }
    }

    // Create default workspace
    const workspaceName = 'My Workspace'
    const slug = `workspace-${userId.substring(0, 8)}-${Date.now()}`

    console.log('[WORKSPACE] Creating new workspace:', workspaceName)

    const newWorkspace = await prisma.studioWorkspace.create({
      data: {
        name: workspaceName,
        slug,
        ownerId: userId,
        settings: {
          defaultTone: 'professional',
          defaultAudience: 'business professionals',
          timezone: 'America/New_York',
        },
      },
    })

    console.log('[WORKSPACE] Created workspace:', newWorkspace.id)

    return {
      id: newWorkspace.id,
      name: newWorkspace.name,
      slug: newWorkspace.slug,
      ownerId: newWorkspace.ownerId,
      createdAt: newWorkspace.createdAt,
    }
  } catch (error) {
    console.error('[WORKSPACE] Error:', error)
    throw error
  }
}

/**
 * Get workspace by ID
 */
export async function getWorkspaceById(
  workspaceId: string
): Promise<WorkspaceInfo | null> {
  try {
    const workspace = await prisma.studioWorkspace.findUnique({
      where: { id: workspaceId },
    })

    if (!workspace) {
      return null
    }

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      ownerId: workspace.ownerId,
      createdAt: workspace.createdAt,
    }
  } catch (error) {
    console.error('[WORKSPACE] Get by ID error:', error)
    return null
  }
}

/**
 * List all workspaces for a user
 */
export async function listUserWorkspaces(
  userId: string
): Promise<WorkspaceInfo[]> {
  try {
    const workspaces = await prisma.studioWorkspace.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'asc' },
    })

    return workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      ownerId: w.ownerId,
      createdAt: w.createdAt,
    }))
  } catch (error) {
    console.error('[WORKSPACE] List error:', error)
    return []
  }
}

/**
 * Update workspace settings
 */
export async function updateWorkspace(
  workspaceId: string,
  data: { name?: string; settings?: Record<string, unknown> }
): Promise<WorkspaceInfo | null> {
  try {
    const workspace = await prisma.studioWorkspace.update({
      where: { id: workspaceId },
      data: {
        name: data.name,
        settings: data.settings,
        updatedAt: new Date(),
      },
    })

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      ownerId: workspace.ownerId,
      createdAt: workspace.createdAt,
    }
  } catch (error) {
    console.error('[WORKSPACE] Update error:', error)
    return null
  }
}
