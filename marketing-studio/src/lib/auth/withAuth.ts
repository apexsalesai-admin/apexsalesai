/**
 * withAuth - API Route Authentication Middleware Factory
 * LYFYE Marketing Studio
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import * as Sentry from '@sentry/nextjs';

const ROLE_HIERARCHY: Record<string, number> = {
  VIEWER: 0,
  CREATOR: 1,
  APPROVER: 2,
  ADMIN: 3,
  OWNER: 4,
};

export interface AuthContext {
  session: {
    user: {
      id: string;
      email: string;
      name?: string | null;
    };
  };
  workspace?: any;
  membership?: any;
}

export interface WithAuthOptions {
  requireWorkspace?: boolean;
  requiredRole?: 'VIEWER' | 'CREATOR' | 'APPROVER' | 'ADMIN' | 'OWNER';
}

type AuthenticatedHandler = (
  req: NextRequest,
  ctx: AuthContext,
  params?: any
) => Promise<NextResponse>;

export function withAuth(
  handler: AuthenticatedHandler,
  options: WithAuthOptions = {}
) {
  return async (req: NextRequest, routeParams?: any) => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!session.user.email) {
      return NextResponse.json(
        { error: 'Session missing email' },
        { status: 401 }
      );
    }

    const ctx: AuthContext = {
      session: {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        },
      },
    };

    if (options.requireWorkspace) {
      const workspaceId = extractWorkspaceId(req);

      if (!workspaceId) {
        return NextResponse.json(
          { error: 'Workspace ID required' },
          { status: 400 }
        );
      }

      const membership = await prisma.studioWorkspaceMember.findFirst({
        where: {
          workspaceId,
          userId: session.user.id,
        },
        include: {
          workspace: true,
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: 'Not a member of this workspace' },
          { status: 403 }
        );
      }

      if (options.requiredRole) {
        const userLevel = ROLE_HIERARCHY[membership.role] ?? -1;
        const requiredLevel = ROLE_HIERARCHY[options.requiredRole] ?? 999;

        if (userLevel < requiredLevel) {
          return NextResponse.json(
            {
              error: `Requires ${options.requiredRole} role or higher`,
              currentRole: membership.role,
            },
            { status: 403 }
          );
        }
      }

      ctx.workspace = membership.workspace;
      ctx.membership = membership;
    }

    try {
      return await handler(req, ctx, routeParams);
    } catch (error) {
      console.error('[withAuth] Handler error:', error);
      Sentry.captureException(error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Standalone role check for routes that use getOrCreateWorkspace().
 * Returns null if authorized, or a 403 NextResponse if not.
 */
export async function checkWorkspaceRole(
  userId: string,
  workspaceId: string,
  requiredRole: 'VIEWER' | 'CREATOR' | 'APPROVER' | 'ADMIN' | 'OWNER'
): Promise<NextResponse | null> {
  const membership = await prisma.studioWorkspaceMember.findFirst({
    where: { workspaceId, userId },
  });

  if (!membership) {
    return NextResponse.json(
      { error: 'Not a member of this workspace' },
      { status: 403 }
    );
  }

  const userLevel = ROLE_HIERARCHY[membership.role] ?? -1;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 999;

  if (userLevel < requiredLevel) {
    return NextResponse.json(
      {
        error: `Requires ${requiredRole} role or higher`,
        currentRole: membership.role,
      },
      { status: 403 }
    );
  }

  return null;
}

function extractWorkspaceId(req: NextRequest): string | null {
  const fromParams = req.nextUrl.searchParams.get('workspaceId');
  if (fromParams) return fromParams;

  const fromHeader = req.headers.get('x-workspace-id');
  if (fromHeader) return fromHeader;

  return null;
}
