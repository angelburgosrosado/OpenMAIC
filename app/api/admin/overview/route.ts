import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireAdmin } from '@/lib/server/auth/session';
import { getAdminOverviewStats } from '@/lib/server/admin/admin-store';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const stats = await getAdminOverviewStats();
    return apiSuccess(stats);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Access denied';
    return apiError('UNAUTHORIZED', 403, msg);
  }
}
