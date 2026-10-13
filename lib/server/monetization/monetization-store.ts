import { promises as fs } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { createLogger } from '@/lib/logger';
import { getUserById, updateUser, adjustUserTokenBalance } from '@/lib/server/auth/user-store';
import { PRICING_PLANS, CREDIT_PACKS } from './plans';
import type {
  PromoCode,
  Transaction,
  RevenueMetrics,
  PricingPlan,
  CreditPack,
} from './types';
import type { UserTier } from '@/lib/server/auth/types';

const log = createLogger('MonetizationStore');
const DATA_DIR = path.join(process.cwd(), 'data', 'monetization');
const PROMO_CODES_FILE = path.join(DATA_DIR, 'promo-codes.json');
const TRANSACTIONS_FILE = path.join(DATA_DIR, 'transactions.json');

let promoLock: Promise<void> = Promise.resolve();
let txLock: Promise<void> = Promise.resolve();

async function withPromoLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = promoLock.then(fn, fn);
  promoLock = next.then(() => {}, () => {});
  return next;
}

async function withTxLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = txLock.then(fn, fn);
  txLock = next.then(() => {}, () => {});
  return next;
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

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

async function readPromoCodesUnsafe(): Promise<PromoCode[]> {
  try {
    const raw = await fs.readFile(PROMO_CODES_FILE, 'utf-8');
    return JSON.parse(raw) as PromoCode[];
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      await writePromoCodesUnsafe(INITIAL_PROMO_CODES);
      return INITIAL_PROMO_CODES;
    }
    return [];
  }
}

async function writePromoCodesUnsafe(codes: PromoCode[]): Promise<void> {
  await ensureDir();
  const tmp = `${PROMO_CODES_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(codes, null, 2), 'utf-8');
  await fs.rename(tmp, PROMO_CODES_FILE);
}

export async function listPromoCodes(): Promise<PromoCode[]> {
  return withPromoLock(async () => {
    return readPromoCodesUnsafe();
  });
}

export async function createPromoCode(input: Omit<PromoCode, 'usedCount' | 'createdAt'>): Promise<PromoCode> {
  return withPromoLock(async () => {
    const codes = await readPromoCodesUnsafe();
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
    await writePromoCodesUnsafe(codes);
    return newCode;
  });
}

export async function deletePromoCode(code: string): Promise<boolean> {
  return withPromoLock(async () => {
    const codes = await readPromoCodesUnsafe();
    const upperCode = code.toUpperCase().trim();
    const index = codes.findIndex((c) => c.code === upperCode);
    if (index === -1) return false;
    codes.splice(index, 1);
    await writePromoCodesUnsafe(codes);
    return true;
  });
}

// ── Transactions ──────────────────────────────────────────

async function readTransactionsUnsafe(): Promise<Transaction[]> {
  try {
    const raw = await fs.readFile(TRANSACTIONS_FILE, 'utf-8');
    return JSON.parse(raw) as Transaction[];
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    return [];
  }
}

async function writeTransactionsUnsafe(txs: Transaction[]): Promise<void> {
  await ensureDir();
  const tmp = `${TRANSACTIONS_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(txs, null, 2), 'utf-8');
  await fs.rename(tmp, TRANSACTIONS_FILE);
}

export async function recordTransaction(
  tx: Omit<Transaction, 'id' | 'createdAt'>,
): Promise<Transaction> {
  return withTxLock(async () => {
    const all = await readTransactionsUnsafe();
    const newTx: Transaction = {
      ...tx,
      id: `tx_${nanoid(14)}`,
      createdAt: new Date().toISOString(),
    };
    all.unshift(newTx); // most recent first
    await writeTransactionsUnsafe(all);
    return newTx;
  });
}

export async function listTransactions(userId?: string): Promise<Transaction[]> {
  return withTxLock(async () => {
    const all = await readTransactionsUnsafe();
    if (userId) {
      return all.filter((t) => t.userId === userId);
    }
    return all;
  });
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
  const target = await withPromoLock(async () => {
    const codes = await readPromoCodesUnsafe();
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
    await writePromoCodesUnsafe(codes);
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
    amountUsd: price,
    tokensAdded: newTokens,
    planTier: plan.tier,
    status: 'completed',
    paymentMethod: price === 0 ? 'FREE_TIER' : 'CREDIT_CARD_SIMULATED',
    referenceId: `sub_${nanoid(10)}`,
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
    amountUsd: pack.priceUsd,
    tokensAdded: totalTokens,
    planTier: user.tier,
    status: 'completed',
    paymentMethod: 'CREDIT_CARD_SIMULATED',
    referenceId: `pack_${nanoid(10)}`,
  });

  return {
    success: true,
    pack,
    newBalance: updated.tokenBalance,
  };
}

export async function getRevenueMetrics(): Promise<RevenueMetrics> {
  const [txs, allCodes] = await Promise.all([
    listTransactions(),
    listPromoCodes(),
  ]);

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
