import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireAuth } from '@/lib/server/auth/session';
import { createBillingPortalSession, stripeConfigured } from '@/lib/server/monetization/stripe';

/** POST → { url } of the Stripe billing page (update card, cancel subscription). */
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth(req);
  } catch (err) {
    return apiError('UNAUTHENTICATED', 401, err instanceof Error ? err.message : 'Sign in first');
  }
  if (!stripeConfigured()) {
    return apiError('PROVIDER_DISABLED', 503, 'Billing is not available yet.');
  }
  try {
    return apiSuccess({ url: await createBillingPortalSession(user, req.nextUrl.origin) });
  } catch (err) {
    return apiError('INVALID_REQUEST', 400, err instanceof Error ? err.message : 'Could not open billing');
  }
}
