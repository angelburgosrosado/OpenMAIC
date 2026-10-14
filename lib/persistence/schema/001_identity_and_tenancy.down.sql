-- 001_identity_and_tenancy.down.sql
-- Rollback script for tenancy and audit additions

DROP INDEX IF EXISTS owner_material_tenant_idx;
DROP INDEX IF EXISTS stage_meta_tenant_idx;
DROP INDEX IF EXISTS tenant_memberships_user_idx;

DROP TABLE IF EXISTS tenant_memberships;
DROP TABLE IF EXISTS tenants;

ALTER TABLE stage_meta
  DROP COLUMN IF EXISTS tenant_id,
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS created_at,
  DROP COLUMN IF EXISTS updated_at;

ALTER TABLE owner_material
  DROP COLUMN IF EXISTS tenant_id,
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS updated_at;
