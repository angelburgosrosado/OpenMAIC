import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getCurrentUser } from '@/lib/server/auth/session';
import { stripSensitive } from '@/lib/server/auth/user-store';
import { PRICING_PLANS } from '@/lib/server/monetization/plans';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return apiSuccess({ user: null, authenticated: false });
    }

    const currentPlan = PRICING_PLANS.find((p) => p.tier === user.tier) || PRICING_PLANS[0];

    return apiSuccess({
      authenticated: true,
      user: stripSensitive(user),
      plan: currentPlan,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve session';
    return apiError('INTERNAL_ERROR', 500, msg);
  }
}
