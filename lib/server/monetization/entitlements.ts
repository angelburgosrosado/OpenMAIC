/**
 * Enforces the per-plan usage limits defined in `plans.ts` (`PricingPlan.limits`).
 *
 * Those limits existed as data but were never read anywhere else in the
 * codebase -- every account, regardless of tier, had unlimited classroom
 * generation, images and video. This module is what actually checks and
 * tracks usage against them.
 *
 * Scope: this enforces the limits that have a concrete, checkable signal
 * in the product today -- `maxClassroomsPerDay`, `imagesPerMonth`,
 * `videoSecondsPerMonth`, and `pdfPageLimit`. Four other limits on
 * `PricingPlan.limits` are deliberately NOT enforced here because nothing
 * in the codebase gives them a mechanism to attach to:
 *  - `priorityQueue`: there's no job queue with priority levels -- every
 *    classroom-generation job runs the same way regardless of plan.
 *  - `customModelKeys`: no request anywhere lets a user supply their own
 *    LLM provider key, so there's nothing to gate.
 *  - `multiVoiceNarration` / `highResVideoExport`: TTS and video generation
 *    both require a configured provider, and production has none configured
 *    (see provider-config.ts) -- both already produce zero output for every
 *    tier today, so a resolution- or voice-count-specific gate on top of
 *    that would be enforcing a distinction that doesn't exist yet.
 * If any of those four gain a real mechanism later, enforce them there.
 */
import { createHash } from 'crypto';
import type { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/server/auth/session';
import type { UserTier } from '@/lib/server/auth/types';
import { readDoc, updateDoc } from '@/lib/server/app-store/json-store';
import { PRICING_PLANS } from './plans';
import type { PricingPlan } from './types';

const USAGE_PREFIX = 'usage/';

export interface EntitlementKey {
  /** Storage key under `usage/`. Stable per account, or per anonymous visitor. */
  key: string;
  tier: UserTier;
  /** Present only for a signed-in account; anonymous usage has none. */
  userId?: string;
}

interface UsageDoc {
  day: string; // YYYY-MM-DD, resets classroomsToday when it changes
  classroomsToday: number;
  month: string; // YYYY-MM, resets the two counters below when it changes
  imagesThisMonth: number;
  videoSecondsThisMonth: number;
}

const EMPTY_USAGE: UsageDoc = {
  day: '',
  classroomsToday: 0,
  month: '',
  imagesThisMonth: 0,
  videoSecondsThisMonth: 0,
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function thisMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Roll the day/month counters over if they're stale, otherwise pass through. */
function normalize(doc: UsageDoc): UsageDoc {
  const day = today();
  const month = thisMonth();
  return {
    day,
    classroomsToday: doc.day === day ? doc.classroomsToday : 0,
    month,
    imagesThisMonth: doc.month === month ? doc.imagesThisMonth : 0,
    videoSecondsThisMonth: doc.month === month ? doc.videoSecondsThisMonth : 0,
  };
}

/** Short, storage-key-safe (lowercase alnum/-) fingerprint of an arbitrary identifier. */
function fingerprint(raw: string): string {
  return createHash('sha1').update(raw).digest('hex').slice(0, 24);
}

function planForTier(tier: UserTier): PricingPlan {
  return PRICING_PLANS.find((p) => p.tier === tier) ?? PRICING_PLANS[0];
}

/**
 * Identifies who's making this request for usage-limiting purposes: the
 * signed-in account and its real plan tier, or -- for an anonymous visitor
 * -- a per-visitor key (their existing `x-learner-key`, falling back to
 * their IP) metered at the free tier's limits.
 */
export async function resolveEntitlementKey(req: NextRequest): Promise<EntitlementKey> {
  const user = await getCurrentUser(req);
  if (user) {
    return { key: `${USAGE_PREFIX}acct-${fingerprint(user.id)}`, tier: user.tier, userId: user.id };
  }

  const learnerKey = req.headers.get('x-learner-key');
  const forwardedFor = req.headers.get('x-forwarded-for');
  const anonId = learnerKey || forwardedFor?.split(',')[0]?.trim() || 'unknown';
  return { key: `${USAGE_PREFIX}anon-${fingerprint(anonId)}`, tier: 'free' };
}

/**
 * Atomically checks the daily classroom-generation cap and, if there's room,
 * reserves one slot immediately (so concurrent requests from the same
 * account can't both slip in under the limit).
 */
export async function reserveClassroomSlot(
  entitlement: EntitlementKey,
): Promise<{ allowed: true } | { allowed: false; limit: number }> {
  const limit = planForTier(entitlement.tier).limits.maxClassroomsPerDay;

  return updateDoc<UsageDoc, { allowed: true } | { allowed: false; limit: number }>(
    entitlement.key,
    EMPTY_USAGE,
    (current) => {
      const usage = normalize(current);
      if (usage.classroomsToday >= limit) {
        return { value: usage, result: { allowed: false, limit } };
      }
      usage.classroomsToday += 1;
      return { value: usage, result: { allowed: true } };
    },
  );
}

/** Remaining images and video-seconds this month, for deciding what a new job may attempt. */
export async function remainingMediaAllowance(
  entitlement: EntitlementKey,
): Promise<{ images: number; videoSeconds: number }> {
  const plan = planForTier(entitlement.tier);
  const usage = normalize(await readDoc<UsageDoc>(entitlement.key, EMPTY_USAGE));
  return {
    images: Math.max(0, plan.limits.imagesPerMonth - usage.imagesThisMonth),
    videoSeconds: Math.max(0, plan.limits.videoSecondsPerMonth - usage.videoSecondsThisMonth),
  };
}

/** Records media a job actually produced, after the fact (generation can't be metered up front). */
export async function recordMediaUsage(
  entitlement: EntitlementKey,
  used: { images: number; videoSeconds: number },
): Promise<void> {
  if (used.images <= 0 && used.videoSeconds <= 0) return;
  await updateDoc<UsageDoc, void>(entitlement.key, EMPTY_USAGE, (current) => {
    const usage = normalize(current);
    usage.imagesThisMonth += used.images;
    usage.videoSecondsThisMonth += used.videoSeconds;
    return { value: usage, result: undefined };
  });
}

/** Whether a PDF with this many pages fits the account's plan. */
export function checkPdfPageLimit(
  entitlement: EntitlementKey,
  pageCount: number,
): { allowed: true } | { allowed: false; limit: number } {
  const limit = planForTier(entitlement.tier).limits.pdfPageLimit;
  return pageCount <= limit ? { allowed: true } : { allowed: false, limit };
}
