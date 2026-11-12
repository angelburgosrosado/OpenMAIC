import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getCurrentUser } from '@/lib/server/auth/session';
import { stripSensitive } from '@/lib/server/auth/user-store';
import { PRICING_PLANS } from '@/lib/server/monetization/plans';
import { LEGAL_VERSION } from '@/lib/legal';

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
      // The Terms/Privacy Policy changed since this account last accepted
      // them (or it predates the termsVersion field entirely) — the client
      // shows a one-time notice and calls POST /api/auth/accept-terms once
      // the person has seen it.
      needsTermsReconsent: user.termsVersion !== LEGAL_VERSION,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve session';
    return apiError('INTERNAL_ERROR', 500, msg);
  }
}
