import type { Queryable } from '@openmaic/storage/document/pg';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ClaimMigrationOptions {
  anonymousOwnerId: string;
  targetUserId: string;
  targetTenantId: string;
  stageIds?: string[];
  materialIds?: string[];
}

export interface ClaimMigrationResult {
  claimedStageIds: string[];
  claimedMaterialIds: string[];
  claimedSessionCount: number;
}

/**
 * Normalizes an anonymous cookie value or raw owner id to the stored 'anon:<uuid>' representation.
 * Returns null if the format is invalid or not an anonymous UUID.
 */
export function normalizeAnonymousOwnerId(rawId: string | null | undefined): string | null {
  if (!rawId) return null;
  const trimmed = rawId.trim();
  if (trimmed.startsWith('anon:')) {
    const uuid = trimmed.slice(5);
    return UUID_V4.test(uuid) ? `anon:${uuid.toLowerCase()}` : null;
  }
  return UUID_V4.test(trimmed) ? `anon:${trimmed.toLowerCase()}` : null;
}

/**
 * Reassigns resources (stage_meta courses, owner_material files, agent_sessions)
 * originally created under an anonymous owner identity to the newly authenticated
 * user's identity and tenant.
 */
export async function claimAnonymousResources(
  queryable: Queryable,
  options: ClaimMigrationOptions,
): Promise<ClaimMigrationResult> {
  const normalizedAnonId = normalizeAnonymousOwnerId(options.anonymousOwnerId);
  if (!normalizedAnonId) {
    throw new Error(`Invalid anonymous owner identity format: ${options.anonymousOwnerId}`);
  }

  const { targetUserId, targetTenantId, stageIds, materialIds } = options;

  if (normalizedAnonId === targetUserId) {
    return { claimedStageIds: [], claimedMaterialIds: [], claimedSessionCount: 0 };
  }

  // 1. Migrate stage_meta
  let stageQuery = `
    UPDATE stage_meta
       SET owner_id = $1,
           tenant_id = $2,
           created_by = COALESCE(created_by, $1),
           updated_at = CURRENT_TIMESTAMP
     WHERE owner_id = $3
  `;
  const stageParams: unknown[] = [targetUserId, targetTenantId, normalizedAnonId];
  if (stageIds && stageIds.length > 0) {
    stageQuery += ' AND stage_id = ANY($4)';
    stageParams.push(stageIds);
  }
  stageQuery += ' RETURNING stage_id';

  const stageResult = await queryable.query<{ stage_id: string }>(stageQuery, stageParams);
  const claimedStageIds = stageResult.rows.map((r) => r.stage_id);

  // 2. Migrate owner_material
  let materialQuery = `
    UPDATE owner_material
       SET owner_id = $1,
           tenant_id = $2,
           created_by = COALESCE(created_by, $1),
           updated_at = CURRENT_TIMESTAMP
     WHERE owner_id = $3
  `;
  const materialParams: unknown[] = [targetUserId, targetTenantId, normalizedAnonId];
  if (materialIds && materialIds.length > 0) {
    materialQuery += ' AND id = ANY($4)';
    materialParams.push(materialIds);
  }
  materialQuery += ' RETURNING id';

  const materialResult = await queryable.query<{ id: string }>(materialQuery, materialParams);
  const claimedMaterialIds = materialResult.rows.map((r) => r.id);

  // 3. Migrate agent_sessions if the table exists
  let claimedSessionCount = 0;
  const tableCheck = await queryable.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables 
       WHERE table_name = 'agent_sessions'
     ) as exists`,
  );

  if (tableCheck.rows[0]?.exists) {
    const sessionResult = await queryable.query<{ id: string }>(
      `UPDATE agent_sessions
          SET owner_id = $1,
              updated_at = CURRENT_TIMESTAMP
        WHERE owner_id = $2
        RETURNING id`,
      [targetUserId, normalizedAnonId],
    );
    claimedSessionCount = sessionResult.rows.length;
  }

  return {
    claimedStageIds,
    claimedMaterialIds,
    claimedSessionCount,
  };
}
