import type { Queryable } from '@openmaic/storage/document/pg';
import type { AppRole, Tenant, TenantMembership, TenantType } from '@/lib/server/auth/types';

export const TENANCY_SCHEMA = `
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('personal_family', 'classroom', 'organization')),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenant_memberships (
  tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('learner', 'parent', 'teacher', 'organization_admin', 'platform_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS tenant_memberships_user_idx ON tenant_memberships(user_id);
`;

export async function ensureTenancySchema(queryable: Queryable): Promise<void> {
  for (const sql of TENANCY_SCHEMA.split(';')) {
    const statement = sql.trim();
    if (statement !== '') await queryable.query(statement);
  }
}

export async function createTenant(
  queryable: Queryable,
  input: { id: string; type: TenantType; name: string },
): Promise<Tenant> {
  await ensureTenancySchema(queryable);
  const now = new Date().toISOString();
  await queryable.query(
    `INSERT INTO tenants (id, type, name, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET name = $3, updated_at = $5`,
    [input.id, input.type, input.name, now, now],
  );
  return {
    id: input.id,
    type: input.type,
    name: input.name,
    createdAt: now,
    updatedAt: now,
  };
}

export async function addTenantMember(
  queryable: Queryable,
  membership: { tenantId: string; userId: string; role: AppRole },
): Promise<void> {
  await ensureTenancySchema(queryable);
  await queryable.query(
    `INSERT INTO tenant_memberships (tenant_id, user_id, role, created_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = $3`,
    [membership.tenantId, membership.userId, membership.role],
  );
}

export async function getTenant(
  queryable: Queryable,
  tenantId: string,
): Promise<Tenant | null> {
  await ensureTenancySchema(queryable);
  const result = await queryable.query<Record<string, unknown>>(
    `SELECT id, type, name, created_at, updated_at FROM tenants WHERE id = $1`,
    [tenantId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    type: row.type as TenantType,
    name: String(row.name),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export async function getUserTenants(
  queryable: Queryable,
  userId: string,
): Promise<TenantMembership[]> {
  await ensureTenancySchema(queryable);
  const result = await queryable.query<Record<string, unknown>>(
    `SELECT m.tenant_id, m.user_id, m.role, m.created_at,
            t.type AS tenant_type, t.name AS tenant_name, t.created_at AS t_created_at, t.updated_at AS t_updated_at
       FROM tenant_memberships m
       JOIN tenants t ON t.id = m.tenant_id
      WHERE m.user_id = $1`,
    [userId],
  );

  return result.rows.map((row) => ({
    tenantId: String(row.tenant_id),
    userId: String(row.user_id),
    role: row.role as AppRole,
    createdAt: new Date(String(row.created_at)).toISOString(),
    tenant: {
      id: String(row.tenant_id),
      type: row.tenant_type as TenantType,
      name: String(row.tenant_name),
      createdAt: new Date(String(row.t_created_at)).toISOString(),
      updatedAt: new Date(String(row.t_updated_at)).toISOString(),
    },
  }));
}
