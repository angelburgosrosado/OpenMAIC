import type { AppRole } from './types';

export type AppPermission =
  | 'course:create'
  | 'course:read'
  | 'course:update'
  | 'course:delete'
  | 'course:publish'
  | 'session:create'
  | 'session:interact'
  | 'material:upload'
  | 'material:read'
  | 'material:delete'
  | 'submission:create'
  | 'submission:read_own'
  | 'submission:grade'
  | 'portfolio:read_tenant'
  | 'tenant:manage_members'
  | 'tenant:manage_settings'
  | 'admin:all';

const ROLE_PERMISSIONS: Record<AppRole, ReadonlySet<AppPermission>> = {
  platform_admin: new Set<AppPermission>([
    'course:create',
    'course:read',
    'course:update',
    'course:delete',
    'course:publish',
    'session:create',
    'session:interact',
    'material:upload',
    'material:read',
    'material:delete',
    'submission:create',
    'submission:read_own',
    'submission:grade',
    'portfolio:read_tenant',
    'tenant:manage_members',
    'tenant:manage_settings',
    'admin:all',
  ]),
  organization_admin: new Set<AppPermission>([
    'course:create',
    'course:read',
    'course:update',
    'course:delete',
    'course:publish',
    'session:create',
    'session:interact',
    'material:upload',
    'material:read',
    'material:delete',
    'submission:create',
    'submission:read_own',
    'submission:grade',
    'portfolio:read_tenant',
    'tenant:manage_members',
    'tenant:manage_settings',
  ]),
  teacher: new Set<AppPermission>([
    'course:create',
    'course:read',
    'course:update',
    'course:delete',
    'course:publish',
    'session:create',
    'session:interact',
    'material:upload',
    'material:read',
    'material:delete',
    'submission:create',
    'submission:read_own',
    'submission:grade',
    'portfolio:read_tenant',
    'tenant:manage_members',
  ]),
  parent: new Set<AppPermission>([
    'course:create',
    'course:read',
    'course:update',
    'course:delete',
    'session:create',
    'session:interact',
    'material:upload',
    'material:read',
    'material:delete',
    'submission:create',
    'submission:read_own',
    'portfolio:read_tenant',
    'tenant:manage_members',
  ]),
  learner: new Set<AppPermission>([
    'course:read',
    'session:interact',
    'material:read',
    'submission:create',
    'submission:read_own',
  ]),
};

/**
 * Check if a given role possesses a specific permission
 */
export function hasPermission(role: AppRole, permission: AppPermission): boolean {
  if (role === 'platform_admin') return true;
  const set = ROLE_PERMISSIONS[role];
  return set ? set.has(permission) : false;
}
