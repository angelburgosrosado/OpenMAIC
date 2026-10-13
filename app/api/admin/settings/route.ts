import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireAdmin } from '@/lib/server/auth/session';
import { getAppSettings, updateAppSettings, logAuditEvent } from '@/lib/server/admin/admin-store';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const settings = await getAppSettings();
    return apiSuccess(settings);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Access denied';
    return apiError('UNAUTHORIZED', 403, msg);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();

    const updated = await updateAppSettings(body, admin.email);

    await logAuditEvent({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'UPDATE_SETTINGS',
      targetType: 'setting',
      details: `Updated platform settings: ${JSON.stringify(body)}`,
    });

    return apiSuccess({
      settings: updated,
      message: 'Platform settings saved successfully.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save settings';
    return apiError('INTERNAL_ERROR', 400, msg);
  }
}
