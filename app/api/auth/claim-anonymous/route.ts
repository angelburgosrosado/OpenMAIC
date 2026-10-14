import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { apiError, apiSuccess } from '@/lib/server/api-response';
import { authErrorResponse } from '@/lib/server/auth/errors';
import { requirePrincipal } from '@/lib/server/auth/authorization';
import {
  claimAnonymousResources,
  normalizeAnonymousOwnerId,
} from '@/lib/server/auth/claim-migration';
import { getServerPersistenceProvider } from '@/lib/persistence/server-provider';

export const runtime = 'nodejs';

interface ClaimAnonymousBody {
  anonymousId?: string;
  stageIds?: string[];
  materialIds?: string[];
}

function resolveAnonymousCookie(req: NextRequest): string | undefined {
  if ('cookies' in req && typeof (req as { cookies?: { get?: (k: string) => { value?: string } } }).cookies?.get === 'function') {
    return (req as { cookies: { get: (k: string) => { value?: string } } }).cookies.get('anonymous_id')?.value;
  }
  const rawCookie = req.headers.get('cookie');
  if (!rawCookie) return undefined;
  for (const item of rawCookie.split(';')) {
    const sep = item.indexOf('=');
    if (sep >= 0 && item.slice(0, sep).trim() === 'anonymous_id') {
      try {
        return decodeURIComponent(item.slice(sep + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  let principal;
  try {
    principal = await requirePrincipal(req);
  } catch (err) {
    return authErrorResponse(err);
  }

  let body: ClaimAnonymousBody = {};
  try {
    body = (await req.json()) as ClaimAnonymousBody;
  } catch {
    // Body is optional if anonymous_id cookie is present
  }

  const candidateAnonId = body.anonymousId || resolveAnonymousCookie(req);
  const normalizedAnonId = normalizeAnonymousOwnerId(candidateAnonId);

  if (!normalizedAnonId) {
    return apiError(
      'INVALID_REQUEST',
      400,
      'Valid anonymous identifier (UUID) is required either in request body or anonymous_id cookie',
    );
  }

  if (!process.env.DATABASE_URL) {
    return apiError('INTERNAL_ERROR', 503, 'Persistence database is not configured');
  }

  try {
    const { pool } = await getServerPersistenceProvider(process.env.DATABASE_URL);
    const result = await claimAnonymousResources(pool, {
      anonymousOwnerId: normalizedAnonId,
      targetUserId: principal.userId,
      targetTenantId: principal.activeTenant.tenantId,
      stageIds: Array.isArray(body.stageIds) ? body.stageIds : undefined,
      materialIds: Array.isArray(body.materialIds) ? body.materialIds : undefined,
    });

    const response = apiSuccess({
      message: 'Anonymous resources successfully claimed',
      claimedStageIds: result.claimedStageIds,
      claimedMaterialIds: result.claimedMaterialIds,
      claimedSessionCount: result.claimedSessionCount,
    });

    // Clear the anonymous cookie now that resources are claimed
    response.headers.append(
      'Set-Cookie',
      'anonymous_id=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    );

    return response;
  } catch (error) {
    console.error('[claim-anonymous] Failed to migrate anonymous resources', error);
    return apiError('INTERNAL_ERROR', 500, 'Failed to migrate anonymous resources');
  }
}
