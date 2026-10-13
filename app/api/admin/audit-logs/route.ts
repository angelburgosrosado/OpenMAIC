import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireAdmin } from '@/lib/server/auth/session';
import { listAuditLogs } from '@/lib/server/admin/admin-store';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '100', 10);
    const logs = await listAuditLogs(limit);
    return apiSuccess({ logs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Access denied';
    return apiError('UNAUTHORIZED', 403, msg);
  }
}
