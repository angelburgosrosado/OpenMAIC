import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireAuth } from '@/lib/server/auth/session';
import { redeemPromoCode } from '@/lib/server/monetization/monetization-store';
import { getUserById, stripSensitive } from '@/lib/server/auth/user-store';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return apiError('INVALID_REQUEST', 400, 'Promo code is required');
    }

    const result = await redeemPromoCode(user.id, code);
    const updatedUser = await getUserById(user.id);

    return apiSuccess({
      ...result,
      user: updatedUser ? stripSensitive(updatedUser) : null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to redeem code';
    return apiError('INTERNAL_ERROR', 400, msg);
  }
}
