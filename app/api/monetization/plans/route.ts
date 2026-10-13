import { apiSuccess } from '@/lib/server/api-response';
import { PRICING_PLANS, CREDIT_PACKS } from '@/lib/server/monetization/plans';

export async function GET() {
  return apiSuccess({
    plans: PRICING_PLANS,
    creditPacks: CREDIT_PACKS,
  });
}
