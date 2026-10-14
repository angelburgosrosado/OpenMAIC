import { describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import {
  createTenant,
  addTenantMember,
  getUserTenants,
  getTenant,
  ensureTenancySchema,
} from '@/lib/persistence/tenancy-store';

describe('tenancy store', () => {
  it('creates tenants and adds members across roles', async () => {
    const client = new PGlite();
    const queryable = {
      query: async <TRow extends Record<string, unknown>>(sql: string, params?: unknown[]) => {
        const res = await client.query<TRow>(sql, (params ?? []) as unknown[]);
        return { rows: res.rows };
      },
    };

    await ensureTenancySchema(queryable);

    // Create personal family tenant
    const familyTenant = await createTenant(queryable, {
      id: 'tenant_family_smith',
      type: 'personal_family',
      name: 'The Smith Family',
    });
    expect(familyTenant.id).toBe('tenant_family_smith');
    expect(familyTenant.type).toBe('personal_family');

    // Add parent and learner
    await addTenantMember(queryable, {
      tenantId: familyTenant.id,
      userId: 'user_parent_alice',
      role: 'parent',
    });
    await addTenantMember(queryable, {
      tenantId: familyTenant.id,
      userId: 'user_learner_bob',
      role: 'learner',
    });

    // Query parent tenants
    const parentTenants = await getUserTenants(queryable, 'user_parent_alice');
    expect(parentTenants).toHaveLength(1);
    expect(parentTenants[0].role).toBe('parent');
    expect(parentTenants[0].tenant?.name).toBe('The Smith Family');

    // Query learner tenants
    const learnerTenants = await getUserTenants(queryable, 'user_learner_bob');
    expect(learnerTenants).toHaveLength(1);
    expect(learnerTenants[0].role).toBe('learner');

    // Retrieve tenant directly
    const retrieved = await getTenant(queryable, 'tenant_family_smith');
    expect(retrieved?.name).toBe('The Smith Family');
    expect(retrieved?.type).toBe('personal_family');
  });
});
