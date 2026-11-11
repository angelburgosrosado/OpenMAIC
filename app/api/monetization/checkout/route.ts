import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireAuth } from '@/lib/server/auth/session';
import {
  processCheckoutPlan,
  processBuyCreditPack,
} from '@/lib/server/monetization/monetization-store';
import {
  createCheckoutSession,
  simulatedCheckoutAllowed,
  stripeConfigured,
} from '@/lib/server/monetization/stripe';

const log = createLogger('Checkout');

/**
 * POST { type: 'plan', planId, billingCycle } | { type: 'credit_pack', packId }
 *
 * With Stripe configured: returns { url } of a hosted Stripe Checkout page.
 * Plans and credits are granted later by the signed webhook, never here.
 * Without Stripe: simulated checkout in local development only; production
 * answers 503 so nobody can upgrade for free.
 */
export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireAuth(req);
  } catch (err) {
    return apiError('UNAUTHENTICATED', 401, err instanceof Error ? err.message : 'Sign in first');
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Body must be JSON');
  }
  const { type, planId, packId } = body as { type?: string; planId?: string; packId?: string };
  const billingCycle = body.billingCycle === 'yearly' ? 'yearly' : 'monthly';

  if (type !== 'plan' && type !== 'credit_pack') {
    return apiError('INVALID_REQUEST', 400, "type must be 'plan' or 'credit_pack'");
  }
  if (type === 'plan' && !planId) return apiError('INVALID_REQUEST', 400, 'planId is required');
  if (type === 'credit_pack' && !packId) return apiError('INVALID_REQUEST', 400, 'packId is required');

  try {
    if (stripeConfigured()) {
      const url = await createCheckoutSession(
        user,
        type === 'plan'
          ? { type: 'plan', planId: planId!, billingCycle }
          : { type: 'credit_pack', packId: packId! },
        req.nextUrl.origin,
      );
      return apiSuccess({ url });
    }

    if (!simulatedCheckoutAllowed()) {
      return apiError('PROVIDER_DISABLED', 503, 'Payments are not available yet. Please check back soon.');
    }

    if (type === 'plan') {
      const result = await processCheckoutPlan(user.id, planId!, billingCycle);
      return apiSuccess({
        ...result,
        message: `Plan updated to ${result.plan.name}! New balance: ${result.newBalance.toLocaleString()} tokens.`,
      });
    }
    const result = await processBuyCreditPack(user.id, packId!);
    return apiSuccess({
      ...result,
      message: `Purchased ${result.pack.name}! New balance: ${result.newBalance.toLocaleString()} tokens.`,
    });
  } catch (err: unknown) {
    log.error('Checkout failed:', err);
    const msg = err instanceof Error ? err.message : 'Checkout failed';
    return apiError('INTERNAL_ERROR', 400, msg);
  }
}
