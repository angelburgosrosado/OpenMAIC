import { DocumentNotFoundError } from '@openmaic/storage';
import type { Queryable } from '@openmaic/storage/document/pg';

export interface StageMetaRow {
  stageId: string;
  ownerId: string;
  isPublic: boolean;
  /** Epoch millis when the owner published the course; null while private. */
  publishedAt: number | null;
  /** Server-side mirror of the document outline's generation-complete flag. */
  generationComplete: boolean;
  deletedAt: Date | null;
  tenantId?: string | null;
  createdBy?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

interface RawStageMetaRow extends Record<string, unknown> {
  stage_id: string;
  owner_id: string;
  is_public: boolean;
  published_at: number | string | null;
  generation_complete: boolean;
  deleted_at: Date | string | null;
  tenant_id?: string | null;
  created_by?: string | null;
  created_at?: Date | string | null;
  updated_at?: Date | string | null;
}

export const STAGE_META_SCHEMA = `
CREATE TABLE IF NOT EXISTS stage_meta (
  stage_id TEXT PRIMARY KEY REFERENCES document_stages(id) ON DELETE CASCADE,
  owner_id TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ
);

ALTER TABLE stage_meta
  ADD COLUMN IF NOT EXISTS published_at DOUBLE PRECISION;

ALTER TABLE stage_meta
  ADD COLUMN IF NOT EXISTS generation_complete BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE stage_meta
  ADD COLUMN IF NOT EXISTS tenant_id TEXT;

ALTER TABLE stage_meta
  ADD COLUMN IF NOT EXISTS created_by TEXT;

ALTER TABLE stage_meta
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE stage_meta
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS stage_meta_owner_idx ON stage_meta (owner_id, stage_id);

CREATE INDEX IF NOT EXISTS stage_meta_tenant_idx ON stage_meta (tenant_id, stage_id);

CREATE INDEX IF NOT EXISTS stage_meta_public_live_idx
  ON stage_meta (stage_id) WHERE is_public AND deleted_at IS NULL;

INSERT INTO stage_meta (stage_id, owner_id)
SELECT id, owner_id
  FROM document_stages
 WHERE owner_id IS NOT NULL
ON CONFLICT (stage_id) DO NOTHING;
`;

export async function ensureStageMetaSchema(queryable: Queryable): Promise<void> {
  for (const sql of STAGE_META_SCHEMA.split(';')) {
    const statement = sql.trim();
    if (statement !== '') await queryable.query(statement);
  }
}

export async function readStageMeta(
  queryable: Queryable,
  stageId: string,
): Promise<StageMetaRow | null> {
  const result = await queryable.query<RawStageMetaRow>(
    `SELECT stage_id, owner_id, is_public, published_at, generation_complete, deleted_at,
            tenant_id, created_by, created_at, updated_at
       FROM stage_meta
      WHERE stage_id = $1`,
    [stageId],
  );
  const row = result.rows[0];
  if (!row) return null;
  const publishedAt = row.published_at;
  return {
    stageId: row.stage_id,
    ownerId: row.owner_id,
    isPublic: row.is_public === true,
    publishedAt:
      publishedAt === null
        ? null
        : typeof publishedAt === 'number'
          ? publishedAt
          : Number(publishedAt),
    generationComplete: row.generation_complete === true,
    deletedAt:
      row.deleted_at === null
        ? null
        : row.deleted_at instanceof Date
          ? row.deleted_at
          : new Date(row.deleted_at),
    tenantId: row.tenant_id ? String(row.tenant_id) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt:
      row.created_at === null || row.created_at === undefined
        ? null
        : row.created_at instanceof Date
          ? row.created_at
          : new Date(row.created_at),
    updatedAt:
      row.updated_at === null || row.updated_at === undefined
        ? null
        : row.updated_at instanceof Date
          ? row.updated_at
          : new Date(row.updated_at),
  };
}

export type StageAccessRefusal = 'foreign' | 'unclaimed' | 'tombstoned' | 'reserved-document';

export class StageAccessError extends DocumentNotFoundError {
  constructor(
    stageId: string,
    readonly attemptedBy: string,
    readonly refusal: StageAccessRefusal,
  ) {
    super(stageId, `stage access refused (${refusal}) for ${JSON.stringify(stageId)}`);
    (this as { name: string }).name = 'StageAccessError';
  }
}

export async function claimStageMeta(
  queryable: Queryable,
  stageId: string,
  ownerId: string,
  options?: { tenantId?: string; createdBy?: string },
): Promise<void> {
  const inserted = await queryable.query<{ owner_id: string } & Record<string, unknown>>(
    `INSERT INTO stage_meta (stage_id, owner_id, tenant_id, created_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (stage_id) DO NOTHING
     RETURNING owner_id`,
    [stageId, ownerId, options?.tenantId ?? null, options?.createdBy ?? ownerId],
  );
  if (inserted.rows[0]?.owner_id === ownerId) return;

  const existing = await queryable.query<{ owner_id: string } & Record<string, unknown>>(
    'SELECT owner_id FROM stage_meta WHERE stage_id = $1',
    [stageId],
  );
  if (existing.rows[0]?.owner_id !== ownerId) {
    throw new StageAccessError(stageId, ownerId, 'foreign');
  }
}

export async function tombstoneStageMeta(queryable: Queryable, stageId: string): Promise<void> {
  await queryable.query(
    `UPDATE stage_meta
        SET deleted_at = CURRENT_TIMESTAMP
      WHERE stage_id = $1 AND deleted_at IS NULL`,
    [stageId],
  );
}

/** Monotonically mark a live course's server-side generation-complete flag. */
export async function markStageGenerationComplete(
  queryable: Queryable,
  stageId: string,
): Promise<boolean> {
  const result = await queryable.query<{ stage_id: string } & Record<string, unknown>>(
    `UPDATE stage_meta
        SET generation_complete = true
      WHERE stage_id = $1 AND deleted_at IS NULL
      RETURNING stage_id`,
    [stageId],
  );
  return result.rows.length === 1;
}

/** Publish (isPublic=true, publishedAt set) or unpublish (isPublic=false, publishedAt cleared). */
export async function setStagePublished(
  queryable: Queryable,
  stageId: string,
  isPublic: boolean,
  publishedAt: number | null,
): Promise<void> {
  await queryable.query(
    `UPDATE stage_meta
        SET is_public = $2, published_at = $3
      WHERE stage_id = $1 AND deleted_at IS NULL`,
    [stageId, isPublic, publishedAt],
  );
}
