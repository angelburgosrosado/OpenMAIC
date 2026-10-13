import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireAuth } from '@/lib/server/auth/session';
import {
  processCheckoutPlan,
  processBuyCreditPack,
} from '@/lib/server/monetization/monetization-store';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { type, planId, billingCycle, packId } = body;

    if (type === 'plan') {
      if (!planId) return apiError('INVALID_REQUEST', 400, 'planId is required');
      const result = await processCheckoutPlan(user.id, planId, billingCycle || 'monthly');
      return apiSuccess({
        ...result,
        message: `Plan updated to ${result.plan.name}! New balance: ${result.newBalance.toLocaleString()} tokens.`,
      });
    }

    if (type === 'credit_pack') {
      if (!packId) return apiError('INVALID_REQUEST', 400, 'packId is required');
      const result = await processBuyCreditPack(user.id, packId);
      return apiSuccess({
        ...result,
        message: `Purchased ${result.pack.name}! New balance: ${result.newBalance.toLocaleString()} tokens.`,
      });
    }

    return apiError('INVALID_REQUEST', 400, "type must be 'plan' or 'credit_pack'");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Checkout failed';
    return apiError('INTERNAL_ERROR', 400, msg);
  }
}
