import { describe, expect, it } from 'vitest';
import {
  requireTenantPermission,
  requireResourceAccess,
} from '@/lib/server/auth/authorization';
import { AuthError } from '@/lib/server/auth/errors';
import type { SessionPrincipal } from '@/lib/server/auth/types';

describe('Authorization Guards', () => {
  const learnerPrincipal: SessionPrincipal = {
    userId: 'learner-1',
    role: 'learner',
    tenants: [
      {
        tenantId: 'classroom-1',
        userId: 'learner-1',
        role: 'learner',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ],
    activeTenant: {
      tenantId: 'classroom-1',
      userId: 'learner-1',
      role: 'learner',
      createdAt: '2026-01-01T00:00:00Z',
    },
  };

  const teacherPrincipal: SessionPrincipal = {
    userId: 'teacher-1',
    role: 'teacher',
    tenants: [
      {
        tenantId: 'classroom-1',
        userId: 'teacher-1',
        role: 'teacher',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ],
    activeTenant: {
      tenantId: 'classroom-1',
      userId: 'teacher-1',
      role: 'teacher',
      createdAt: '2026-01-01T00:00:00Z',
    },
  };

  const strangerPrincipal: SessionPrincipal = {
    userId: 'stranger-99',
    role: 'learner',
    tenants: [
      {
        tenantId: 'other-classroom',
        userId: 'stranger-99',
        role: 'learner',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ],
    activeTenant: {
      tenantId: 'other-classroom',
      userId: 'stranger-99',
      role: 'learner',
      createdAt: '2026-01-01T00:00:00Z',
    },
  };

  const platformAdminPrincipal: SessionPrincipal = {
    userId: 'admin-root',
    role: 'platform_admin',
    tenants: [],
    activeTenant: {
      tenantId: 'system',
      userId: 'admin-root',
      role: 'platform_admin',
      createdAt: '2026-01-01T00:00:00Z',
    },
  };

  describe('requireTenantPermission', () => {
    it('allows teacher to create a course in their classroom', () => {
      expect(() =>
        requireTenantPermission(teacherPrincipal, 'classroom-1', 'course:create'),
      ).not.toThrow();
    });

    it('denies learner attempting to create a course (403)', () => {
      expect(() =>
        requireTenantPermission(learnerPrincipal, 'classroom-1', 'course:create'),
      ).toThrow(AuthError);
      try {
        requireTenantPermission(learnerPrincipal, 'classroom-1', 'course:create');
      } catch (err) {
        expect((err as AuthError).statusCode).toBe(403);
      }
    });

    it('denies access if user is not in tenant (cross-tenant 403)', () => {
      expect(() =>
        requireTenantPermission(strangerPrincipal, 'classroom-1', 'course:read'),
      ).toThrow(AuthError);
      try {
        requireTenantPermission(strangerPrincipal, 'classroom-1', 'course:read');
      } catch (err) {
        expect((err as AuthError).statusCode).toBe(403);
      }
    });

    it('always permits platform_admin across all tenants', () => {
      expect(() =>
        requireTenantPermission(platformAdminPrincipal, 'classroom-1', 'course:delete'),
      ).not.toThrow();
    });
  });

  describe('requireResourceAccess', () => {
    const teacherCourse = {
      ownerId: 'teacher-1',
      tenantId: 'classroom-1',
      isPublic: false,
    };

    const publicCourse = {
      ownerId: 'teacher-1',
      tenantId: 'classroom-1',
      isPublic: true,
    };

    it('allows owner full read, write, and delete access', () => {
      expect(() => requireResourceAccess(teacherPrincipal, teacherCourse, 'read')).not.toThrow();
      expect(() => requireResourceAccess(teacherPrincipal, teacherCourse, 'write')).not.toThrow();
      expect(() => requireResourceAccess(teacherPrincipal, teacherCourse, 'delete')).not.toThrow();
    });

    it('allows classroom learner to read a course in their tenant', () => {
      expect(() => requireResourceAccess(learnerPrincipal, teacherCourse, 'read')).not.toThrow();
    });

    it('prevents learner from writing or deleting the teacher course', () => {
      expect(() => requireResourceAccess(learnerPrincipal, teacherCourse, 'write')).toThrow(AuthError);
      expect(() => requireResourceAccess(learnerPrincipal, teacherCourse, 'delete')).toThrow(AuthError);
    });

    it('allows anyone to read a public course', () => {
      expect(() => requireResourceAccess(strangerPrincipal, publicCourse, 'read')).not.toThrow();
    });

    it('denies cross-tenant stranger access to private course with 404 when non-disclosure requested', () => {
      try {
        requireResourceAccess(strangerPrincipal, teacherCourse, 'read', {
          hideExistenceFromStrangers: true,
        });
        expect.unreachable();
      } catch (err) {
        expect((err as AuthError).statusCode).toBe(404);
        expect((err as AuthError).code).toBe('RESOURCE_NOT_FOUND');
      }
    });

    it('denies cross-tenant stranger access with 403 when non-disclosure is not requested', () => {
      try {
        requireResourceAccess(strangerPrincipal, teacherCourse, 'read');
        expect.unreachable();
      } catch (err) {
        expect((err as AuthError).statusCode).toBe(403);
        expect((err as AuthError).code).toBe('FORBIDDEN');
      }
    });

    it('permits platform_admin to access and delete any resource', () => {
      expect(() =>
        requireResourceAccess(platformAdminPrincipal, teacherCourse, 'delete'),
      ).not.toThrow();
    });
  });
});
