import { nanoid } from 'nanoid';
import { createLogger } from '@/lib/logger';
import { getUserById, updateUser, adjustUserTokenBalance } from '@/lib/server/auth/user-store';
import { PRICING_PLANS, CREDIT_PACKS } from './plans';
import type { PromoCode, Transaction, RevenueMetrics, PricingPlan, CreditPack } from './types';
import type { UserTier } from '@/lib/server/auth/types';
import { readDoc, updateDoc } from '@/lib/server/app-store/json-store';

const log = createLogger('MonetizationStore');
/** How a purchase was paid (Stripe in production; simulated in local development). */
export interface PaymentInfo {
  paymentMethod: string;
  referenceId?: string;
  amountUsd?: number;
}

/** Postgres when DATABASE_URL is set, else data/monetization/*.json. */
const PROMO_KEY = 'monetization/promo-codes';
const TX_KEY = 'monetization/transactions';

// ── Promo Codes ──────────────────────────────────────────

const INITIAL_PROMO_CODES: PromoCode[] = [
  {
    code: 'WELCOME100K',
    bonusTokens: 100_000,
    maxUses: 10_000,
    usedCount: 0,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    code: 'CREATOR2026',
    bonusTokens: 500_000,
    discountPercent: 20,
    maxUses: 5_000,
    usedCount: 0,
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    code: 'STUDIOVIP',
    bonusTokens: 2_000_000,
    planUpgrade: 'pro',
    maxUses: 500,
    usedCount: 0,
    active: true,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Demo codes are published in the open-source repo, so they are only seeded
 * outside production. A live deployment starts with no codes; admins create
 * their own from the admin page.
 */
function seedPromoCodes(): PromoCode[] {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL ? [] : INITIAL_PROMO_CODES;
}

function mutatePromoCodes<R>(fn: (codes: PromoCode[]) => R | Promise<R>): Promise<R> {
  return updateDoc<PromoCode[], R>(PROMO_KEY, seedPromoCodes(), async (codes) => {
    const result = await fn(codes);
    return { value: codes, result };
  });
}

export async function listPromoCodes(): Promise<PromoCode[]> {
  return readDoc<PromoCode[]>(PROMO_KEY, seedPromoCodes());
}

export async function createPromoCode(
  input: Omit<PromoCode, 'usedCount' | 'createdAt'>,
): Promise<PromoCode> {
  return mutatePromoCodes((codes) => {
    const upperCode = input.code.toUpperCase().trim();
    if (codes.some((c) => c.code === upperCode)) {
      throw new Error(`Promo code ${upperCode} already exists`);
    }

    const newCode: PromoCode = {
      ...input,
      code: upperCode,
      usedCount: 0,
      createdAt: new Date().toISOString(),
    };

    codes.push(newCode);
    return newCode;
  });
}

export async function deletePromoCode(code: string): Promise<boolean> {
  return mutatePromoCodes((codes) => {
    const upperCode = code.toUpperCase().trim();
    const index = codes.findIndex((c) => c.code === upperCode);
    if (index === -1) return false;
    codes.splice(index, 1);
    return true;
  });
}

// ── Transactions ──────────────────────────────────────────

export async function recordTransaction(
  tx: Omit<Transaction, 'id' | 'createdAt'>,
): Promise<Transaction> {
  return updateDoc<Transaction[], Transaction>(TX_KEY, [], (all) => {
    const newTx: Transaction = {
      ...tx,
      id: `tx_${nanoid(14)}`,
      createdAt: new Date().toISOString(),
    };
    all.unshift(newTx); // most recent first
    return { value: all, result: newTx };
  });
}

/** Mark the transaction recorded for a Stripe reference (session/invoice id) as refunded. */
export async function markTransactionRefunded(referenceId: string): Promise<Transaction | null> {
  return updateDoc<Transaction[], Transaction | null>(TX_KEY, [], (all) => {
    const tx = all.find((t) => t.referenceId === referenceId && t.status === 'completed');
    if (tx) tx.status = 'refunded';
    return { value: all, result: tx ?? null };
  });
}

export async function listTransactions(userId?: string): Promise<Transaction[]> {
  const all = await readDoc<Transaction[]>(TX_KEY, []);
  return userId ? all.filter((t) => t.userId === userId) : all;
}

// ── Redemption & Checkout Flows ────────────────────────────

export async function redeemPromoCode(
  userId: string,
  codeString: string,
): Promise<{ success: boolean; bonusTokens: number; planUpgrade?: UserTier; message: string }> {
  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');

  const cleanCode = codeString.toUpperCase().trim();

  // Atomically claim promo code usage
  const target = await mutatePromoCodes((codes) => {
    const promo = codes.find((c) => c.code === cleanCode);

    if (!promo) {
      throw new Error('Invalid promo code');
    }
    if (!promo.active) {
      throw new Error('This promo code is no longer active');
    }
    if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) {
      throw new Error('This promo code has reached its maximum usage limit');
    }
    if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) {
      throw new Error('This promo code has expired');
    }

    promo.usedCount += 1;
    return { ...promo };
  });

  // Apply bonus tokens
  if (target.bonusTokens > 0) {
    await adjustUserTokenBalance(userId, target.bonusTokens, false);
  }

  // Apply plan upgrade if designated
  if (target.planUpgrade && target.planUpgrade !== user.tier) {
    await updateUser(userId, { tier: target.planUpgrade });
  }

  // Record transaction
  await recordTransaction({
    userId,
    userEmail: user.email,
    type: 'promo_redeem',
    description: `Redeemed promo code ${cleanCode} (+${target.bonusTokens.toLocaleString()} tokens${target.planUpgrade ? `, upgraded to ${target.planUpgrade}` : ''})`,
    amountUsd: 0,
    tokensAdded: target.bonusTokens,
    planTier: target.planUpgrade || user.tier,
    status: 'completed',
    paymentMethod: 'PROMO_CODE',
    referenceId: cleanCode,
  });

  return {
    success: true,
    bonusTokens: target.bonusTokens,
    planUpgrade: target.planUpgrade,
    message: `Successfully redeemed! Added ${target.bonusTokens.toLocaleString()} tokens to your balance.`,
  };
}

export async function processCheckoutPlan(
  userId: string,
  planId: string,
  billingCycle: 'monthly' | 'yearly' = 'monthly',
  payment?: PaymentInfo,
): Promise<{ success: boolean; plan: PricingPlan; newBalance: number }> {
  const plan = PRICING_PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error(`Plan ${planId} not found`);

  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');

  const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;

  // Upgrade user tier and credit plan monthly allowance
  const newTokens = plan.monthlyTokens;
  const updated = await updateUser(userId, {
    tier: plan.tier,
    monthlyAllowance: newTokens,
    tokenBalance: user.tokenBalance + newTokens,
  });

  // Record transaction
  await recordTransaction({
    userId,
    userEmail: user.email,
    type: 'subscription',
    description: `Subscribed to ${plan.name} (${billingCycle} billing)`,
    amountUsd: payment?.amountUsd ?? price,
    tokensAdded: newTokens,
    planTier: plan.tier,
    status: 'completed',
    paymentMethod: payment?.paymentMethod ?? (price === 0 ? 'FREE_TIER' : 'CREDIT_CARD_SIMULATED'),
    referenceId: payment?.referenceId ?? `sub_${nanoid(10)}`,
  });

  log.info(`User ${user.email} successfully upgraded to ${plan.name}`);
  return {
    success: true,
    plan,
    newBalance: updated.tokenBalance,
  };
}

export async function processBuyCreditPack(
  userId: string,
  packId: string,
  payment?: PaymentInfo,
): Promise<{ success: boolean; pack: CreditPack; newBalance: number }> {
  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) throw new Error(`Credit pack ${packId} not found`);

  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');

  const totalTokens = pack.tokens + pack.bonusTokens;
  const updated = await adjustUserTokenBalance(userId, totalTokens, false);

  await recordTransaction({
    userId,
    userEmail: user.email,
    type: 'credit_topup',
    description: `Purchased ${pack.name} (+${totalTokens.toLocaleString()} tokens)`,
    amountUsd: payment?.amountUsd ?? pack.priceUsd,
    tokensAdded: totalTokens,
    planTier: user.tier,
    status: 'completed',
    paymentMethod: payment?.paymentMethod ?? 'CREDIT_CARD_SIMULATED',
    referenceId: payment?.referenceId ?? `pack_${nanoid(10)}`,
  });

  return {
    success: true,
    pack,
    newBalance: updated.tokenBalance,
  };
}

export async function getRevenueMetrics(): Promise<RevenueMetrics> {
  const [txs, allCodes] = await Promise.all([listTransactions(), listPromoCodes()]);

  let totalRevenue = 0;
  let tokensDistributed = 0;

  for (const t of txs) {
    if (t.status === 'completed') {
      totalRevenue += t.amountUsd;
      tokensDistributed += t.tokensAdded;
    }
  }

  // Calculate MRR from active subscription transactions
  const activeSubs = { free: 0, pro: 0, enterprise: 0 };
  let mrr = 0;

  for (const t of txs) {
    if (t.type === 'subscription' && t.planTier) {
      if (t.planTier === 'pro') {
        activeSubs.pro += 1;
        mrr += 29;
      } else if (t.planTier === 'enterprise') {
        activeSubs.enterprise += 1;
        mrr += 99;
      }
    }
  }

  return {
    totalRevenueUsd: totalRevenue,
    monthlyRecurringRevenueUsd: mrr,
    totalTransactions: txs.length,
    activeSubscribers: activeSubs,
    tokensDistributedTotal: tokensDistributed,
  };
}
