import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireAdmin } from '@/lib/server/auth/session';
import {
  listPromoCodes,
  createPromoCode,
  listTransactions,
  getRevenueMetrics,
} from '@/lib/server/monetization/monetization-store';
import { logAuditEvent } from '@/lib/server/admin/admin-store';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const [promoCodes, transactions, metrics] = await Promise.all([
      listPromoCodes(),
      listTransactions(),
      getRevenueMetrics(),
    ]);

    return apiSuccess({
      promoCodes,
      transactions,
      metrics,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Access denied';
    return apiError('UNAUTHORIZED', 403, msg);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const { code, bonusTokens, discountPercent, planUpgrade, maxUses, expiresAt } = body;

    if (!code) {
      return apiError('INVALID_REQUEST', 400, 'Code string is required');
    }

    const newCode = await createPromoCode({
      code,
      bonusTokens: Number(bonusTokens) || 0,
      discountPercent: discountPercent ? Number(discountPercent) : undefined,
      planUpgrade: planUpgrade || undefined,
      maxUses: Number(maxUses) || 1000,
      expiresAt: expiresAt || undefined,
      active: true,
    });

    await logAuditEvent({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'CREATE_PROMO_CODE',
      targetType: 'promo_code',
      targetId: newCode.code,
      details: `Created promo code ${newCode.code} (+${newCode.bonusTokens} tokens, max: ${newCode.maxUses})`,
    });

    return apiSuccess({
      promoCode: newCode,
      message: 'Promo code created successfully',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create promo code';
    return apiError('INTERNAL_ERROR', 400, msg);
  }
}
