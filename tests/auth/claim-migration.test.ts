import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import {
  claimAnonymousResources,
  normalizeAnonymousOwnerId,
} from '@/lib/server/auth/claim-migration';
import { POST } from '@/app/api/auth/claim-anonymous/route';
import { createSessionToken } from '@/lib/server/auth/session';

describe('normalizeAnonymousOwnerId', () => {
  it('normalizes valid raw UUID v4 to anon:uuid format', () => {
    const rawUuid = '123e4567-e89b-12d3-a456-426614174000';
    // UUID v4 format requires 13th char to be 4 and 17th char to be 8, 9, a, or b
    const v4Uuid = 'c1234567-89ab-4cde-8f01-23456789abcd';
    expect(normalizeAnonymousOwnerId(v4Uuid)).toBe(`anon:${v4Uuid}`);
  });

  it('normalizes valid anon:uuid to lowercase anon:uuid format', () => {
    const v4Uuid = 'C1234567-89AB-4CDE-8F01-23456789ABCD';
    expect(normalizeAnonymousOwnerId(`anon:${v4Uuid}`)).toBe(
      `anon:${v4Uuid.toLowerCase()}`,
    );
  });

  it('rejects invalid or non-UUID strings', () => {
    expect(normalizeAnonymousOwnerId('not-a-uuid')).toBeNull();
    expect(normalizeAnonymousOwnerId('12345')).toBeNull();
    expect(normalizeAnonymousOwnerId('')).toBeNull();
    expect(normalizeAnonymousOwnerId(null)).toBeNull();
    expect(normalizeAnonymousOwnerId(undefined)).toBeNull();
  });
});

describe('claimAnonymousResources', () => {
  it('updates stage_meta, owner_material, and agent_sessions for anonymous owner', async () => {
    const executedQueries: Array<{ sql: string; params?: unknown[] }> = [];

    const mockQueryable = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        executedQueries.push({ sql, params });
        if (sql.includes('UPDATE stage_meta')) {
          return { rows: [{ stage_id: 'stage-1' }, { stage_id: 'stage-2' }] };
        }
        if (sql.includes('UPDATE owner_material')) {
          return { rows: [{ id: 'mat-1' }] };
        }
        if (sql.includes('information_schema.tables')) {
          return { rows: [{ exists: true }] };
        }
        if (sql.includes('UPDATE agent_sessions')) {
          return { rows: [{ id: 's1' }, { id: 's2' }, { id: 's3' }] };
        }
        return { rows: [] };
      }),
    };

    const result = await claimAnonymousResources(mockQueryable as any, {
      anonymousOwnerId: 'c1234567-89ab-4cde-8f01-23456789abcd',
      targetUserId: 'user_123',
      targetTenantId: 'tenant_family_123',
      stageIds: ['stage-1', 'stage-2'],
      materialIds: ['mat-1'],
    });

    expect(result).toEqual({
      claimedStageIds: ['stage-1', 'stage-2'],
      claimedMaterialIds: ['mat-1'],
      claimedSessionCount: 3,
    });

    expect(executedQueries.length).toBe(4);
    expect(executedQueries[0].sql).toContain('UPDATE stage_meta');
    expect(executedQueries[0].params).toEqual([
      'user_123',
      'tenant_family_123',
      'anon:c1234567-89ab-4cde-8f01-23456789abcd',
      ['stage-1', 'stage-2'],
    ]);
    expect(executedQueries[1].sql).toContain('UPDATE owner_material');
    expect(executedQueries[1].params).toEqual([
      'user_123',
      'tenant_family_123',
      'anon:c1234567-89ab-4cde-8f01-23456789abcd',
      ['mat-1'],
    ]);
  });

  it('skips agent_sessions update if table does not exist', async () => {
    const mockQueryable = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('UPDATE stage_meta')) {
          return { rows: [{ stage_id: 'stage-1' }] };
        }
        if (sql.includes('UPDATE owner_material')) {
          return { rows: [] };
        }
        if (sql.includes('information_schema.tables')) {
          return { rows: [{ exists: false }] };
        }
        return { rows: [] };
      }),
    };

    const result = await claimAnonymousResources(mockQueryable as any, {
      anonymousOwnerId: 'c1234567-89ab-4cde-8f01-23456789abcd',
      targetUserId: 'user_456',
      targetTenantId: 'tenant_classroom_456',
    });

    expect(result.claimedSessionCount).toBe(0);
    expect(result.claimedStageIds).toEqual(['stage-1']);
  });
});

describe('POST /api/auth/claim-anonymous route', () => {
  const testPrincipal = {
    userId: 'user_test_1',
    role: 'learner' as const,
    tenants: [
      {
        tenantId: 'tenant_family_1',
        userId: 'user_test_1',
        role: 'learner' as const,
        createdAt: '2026-01-01T00:00:00Z',
      },
    ],
    activeTenant: {
      tenantId: 'tenant_family_1',
      userId: 'user_test_1',
      role: 'learner' as const,
      createdAt: '2026-01-01T00:00:00Z',
    },
  };

  it('returns 401 when unauthenticated', async () => {
    const { setAuthProvider, CookieSessionAuthProvider } = await import(
      '@/lib/server/auth/provider'
    );
    setAuthProvider({
      name: 'unauth-mock',
      resolvePrincipal: async () => null,
    });

    const req = new NextRequest('http://localhost:3000/api/auth/claim-anonymous', {
      method: 'POST',
      body: JSON.stringify({ anonymousId: 'c1234567-89ab-4cde-8f01-23456789abcd' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    setAuthProvider(new CookieSessionAuthProvider());
  });

  it('returns 400 when anonymous ID is missing or invalid', async () => {
    const { setAuthProvider, CookieSessionAuthProvider } = await import(
      '@/lib/server/auth/provider'
    );
    setAuthProvider({
      name: 'auth-mock',
      resolvePrincipal: async () => testPrincipal,
    });

    const req = new NextRequest('http://localhost:3000/api/auth/claim-anonymous', {
      method: 'POST',
      body: JSON.stringify({ anonymousId: 'not-a-valid-uuid' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errorCode).toBe('INVALID_REQUEST');
    setAuthProvider(new CookieSessionAuthProvider());
  });

  it('successfully claims resources and clears anonymous cookie', async () => {
    const { setAuthProvider, CookieSessionAuthProvider } = await import(
      '@/lib/server/auth/provider'
    );
    setAuthProvider({
      name: 'auth-mock',
      resolvePrincipal: async () => testPrincipal,
    });

    const originalDbUrl = process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

    const persistence = await import('@/lib/persistence/server-provider');
    const mockPool = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes('UPDATE stage_meta')) {
          return { rows: [{ stage_id: 'claimed-stage-1' }] };
        }
        if (sql.includes('UPDATE owner_material')) {
          return { rows: [{ id: 'claimed-mat-1' }] };
        }
        if (sql.includes('information_schema.tables')) {
          return { rows: [{ exists: false }] };
        }
        return { rows: [] };
      }),
    };
    const spy = vi
      .spyOn(persistence, 'getServerPersistenceProvider')
      .mockResolvedValue({ pool: mockPool } as any);

    const req = new NextRequest('http://localhost:3000/api/auth/claim-anonymous', {
      method: 'POST',
      headers: {
        cookie: 'anonymous_id=c1234567-89ab-4cde-8f01-23456789abcd',
      },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.claimedStageIds).toEqual(['claimed-stage-1']);
    expect(json.claimedMaterialIds).toEqual(['claimed-mat-1']);

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('anonymous_id=');
    expect(setCookie).toContain('Max-Age=0');

    spy.mockRestore();
    process.env.DATABASE_URL = originalDbUrl;
    setAuthProvider(new CookieSessionAuthProvider());
  });
});

