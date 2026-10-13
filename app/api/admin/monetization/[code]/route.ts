import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireAdmin } from '@/lib/server/auth/session';
import { deletePromoCode } from '@/lib/server/monetization/monetization-store';
import { logAuditEvent } from '@/lib/server/admin/admin-store';

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(req);
    const { code } = await params;

    const success = await deletePromoCode(code);
    if (!success) {
      return apiError('NOT_FOUND', 404, 'Promo code not found');
    }

    await logAuditEvent({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'DELETE_PROMO_CODE',
      targetType: 'promo_code',
      targetId: code,
      details: `Deleted promo code ${code}`,
    });

    return apiSuccess({ message: `Promo code ${code} deleted.` });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Action failed';
    return apiError('INTERNAL_ERROR', 400, msg);
  }
}
