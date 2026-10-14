import type { IncomingMessage } from 'node:http';
import type { NextRequest } from 'next/server';
import type { SessionPrincipal } from './types';
import type { AppPermission } from './permissions';
import { hasPermission } from './permissions';
import { getAuthProvider } from './provider';
import { unauthenticated, forbidden, resourceNotFound } from './errors';

export async function resolvePrincipal(
  req?: NextRequest | Request | IncomingMessage,
): Promise<SessionPrincipal | null> {
  const provider = getAuthProvider();
  return provider.resolvePrincipal(req);
}

/**
 * Ensures request has an authenticated session. Throws 401 AuthError if unauthenticated.
 */
export async function requirePrincipal(
  req?: NextRequest | Request | IncomingMessage,
): Promise<SessionPrincipal> {
  const principal = await resolvePrincipal(req);
  if (!principal) {
    throw unauthenticated('Authentication required to access this resource');
  }
  return principal;
}

/**
 * Ensures principal is a member of the given tenant and possesses the requested permission.
 */
export function requireTenantPermission(
  principal: SessionPrincipal,
  tenantId: string,
  permission: AppPermission,
): void {
  if (principal.role === 'platform_admin') return;

  const membership = principal.tenants.find((m) => m.tenantId === tenantId);
  if (!membership) {
    throw forbidden(`Access denied: User is not a member of tenant ${tenantId}`);
  }

  if (!hasPermission(membership.role, permission)) {
    throw forbidden(
      `Access denied: Role "${membership.role}" lacks permission "${permission}" in tenant ${tenantId}`,
    );
  }
}

export interface ProtectedResourceDescriptor {
  ownerId: string;
  tenantId?: string | null;
  isPublic?: boolean;
}

/**
 * Evaluates whether a principal can access a protected resource.
 * Consistent error semantics:
 * - 401 if unauthenticated (handled by requirePrincipal)
 * - 404 if private resource and non-disclosure is necessary, or resource is deleted
 * - 403 if authenticated but lacks required ownership/tenant permission
 */
export function requireResourceAccess(
  principal: SessionPrincipal,
  resource: ProtectedResourceDescriptor,
  action: 'read' | 'write' | 'delete' = 'read',
  options?: { hideExistenceFromStrangers?: boolean },
): void {
  if (principal.role === 'platform_admin') return;

  // Direct owner always has access
  if (resource.ownerId === principal.userId) return;

  // If reading and resource is public
  if (action === 'read' && resource.isPublic === true) return;

  // If tenant-scoped resource, check tenant membership
  if (resource.tenantId) {
    const membership = principal.tenants.find((m) => m.tenantId === resource.tenantId);
    if (membership) {
      const requiredPerm: AppPermission =
        action === 'delete'
          ? 'course:delete'
          : action === 'write'
            ? 'course:update'
            : 'course:read';
      if (hasPermission(membership.role, requiredPerm)) {
        return;
      }
      throw forbidden(`Access denied: insufficient permission to ${action} this resource`);
    }
  }

  // If stranger attempting to read a private resource and non-disclosure is requested
  if (action === 'read' && options?.hideExistenceFromStrangers) {
    throw resourceNotFound();
  }

  throw forbidden(`Access denied: you do not have permission to ${action} this resource`);
}
