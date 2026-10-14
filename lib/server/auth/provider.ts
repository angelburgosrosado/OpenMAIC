import type { IncomingMessage } from 'node:http';
import type { NextRequest } from 'next/server';
import type { AppRole, SessionPrincipal, TenantMembership } from './types';
import { getCurrentUser } from './session';

export interface AuthProvider {
  name: string;
  resolvePrincipal(req?: NextRequest | Request | IncomingMessage): Promise<SessionPrincipal | null>;
}

export function isAnonymousDevAllowed(): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  const flag = process.env.ENABLE_DEV_ANONYMOUS_AUTH;
  return flag === 'true' || flag === '1';
}

/**
 * Maps a legacy user role ('admin' | 'user' | 'creator') to an AppRole
 */
export function normalizeUserRole(role: string): AppRole {
  switch (role) {
    case 'platform_admin':
    case 'admin':
      return 'platform_admin';
    case 'organization_admin':
      return 'organization_admin';
    case 'teacher':
    case 'creator':
      return 'teacher';
    case 'parent':
      return 'parent';
    case 'learner':
    case 'user':
    default:
      return 'learner';
  }
}

/**
 * Construct default personal/family tenant for a user
 */
export function buildPersonalTenant(userId: string, role: AppRole): TenantMembership {
  return {
    tenantId: `tenant_personal_${userId}`,
    userId,
    role,
    createdAt: new Date().toISOString(),
    tenant: {
      id: `tenant_personal_${userId}`,
      type: 'personal_family',
      name: 'Personal Family Workspace',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Default OpenMAIC Session AuthProvider using server-verified HMAC session cookies and bearer keys.
 */
export class CookieSessionAuthProvider implements AuthProvider {
  name = 'cookie-session';

  async resolvePrincipal(req?: NextRequest | Request | IncomingMessage): Promise<SessionPrincipal | null> {
    const nextReq = req && 'nextUrl' in req ? (req as NextRequest) : undefined;
    const user = await getCurrentUser(nextReq);

    if (user && user.status === 'active') {
      const role = normalizeUserRole(user.role);
      const personalTenant = buildPersonalTenant(user.id, role);
      return {
        userId: user.id,
        email: user.email,
        name: user.name,
        role,
        tenants: [personalTenant],
        activeTenant: personalTenant,
        isAnonymousDev: false,
      };
    }

    // Anonymous dev fallback only when explicitly enabled in non-production
    if (isAnonymousDevAllowed()) {
      const devUserId = 'dev-anonymous-user';
      const devTenant: TenantMembership = {
        tenantId: 'dev-anonymous-tenant',
        userId: devUserId,
        role: 'platform_admin',
        createdAt: new Date().toISOString(),
        tenant: {
          id: 'dev-anonymous-tenant',
          type: 'personal_family',
          name: 'Local Dev Tenant',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };

      return {
        userId: devUserId,
        role: 'platform_admin',
        name: 'Local Developer',
        tenants: [devTenant],
        activeTenant: devTenant,
        isAnonymousDev: true,
      };
    }

    return null;
  }
}

let activeAuthProvider: AuthProvider = new CookieSessionAuthProvider();

export function getAuthProvider(): AuthProvider {
  return activeAuthProvider;
}

export function setAuthProvider(provider: AuthProvider): void {
  activeAuthProvider = provider;
}
