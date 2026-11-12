/**
 * `plan.limits` (daily classrooms, monthly images/video-seconds, PDF page
 * limit) was defined in `plans.ts` but never read anywhere -- every account
 * had unlimited usage regardless of tier. These tests cover the enforcement
 * module that actually checks and tracks it.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __resetAppStoreForTests } from '@/lib/server/app-store/json-store';
import { createUser } from '@/lib/server/auth/user-store';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/server/auth/session';
import { PRICING_PLANS } from '@/lib/server/monetization/plans';
import {
  checkPdfPageLimit,
  recordMediaUsage,
  remainingMediaAllowance,
  reserveClassroomSlot,
  resolveEntitlementKey,
} from '@/lib/server/monetization/entitlements';

let dir = '';
const savedDb = process.env.DATABASE_URL;

beforeEach(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'entitlements-'));
  process.env.APP_STORE_DIR = dir;
  delete process.env.DATABASE_URL;
  await __resetAppStoreForTests();
});

afterEach(async () => {
  await __resetAppStoreForTests();
  delete process.env.APP_STORE_DIR;
  if (savedDb) process.env.DATABASE_URL = savedDb;
  rmSync(dir, { recursive: true, force: true });
});

function authedRequest(url: string, token: string): NextRequest {
  return new NextRequest(url, { headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` } });
}

function anonRequest(url: string, headers?: Record<string, string>): NextRequest {
  return new NextRequest(url, { headers });
}

const freePlan = PRICING_PLANS.find((p) => p.tier === 'free')!;
const proPlan = PRICING_PLANS.find((p) => p.tier === 'pro')!;

describe('resolveEntitlementKey', () => {
  it('resolves a signed-in account to its own key at its real tier', async () => {
    const user = await createUser(
      { email: 'pro@example.com', password: 'pw-123456', name: 'Pro User' },
      { tier: 'pro' },
    );
    const token = createSessionToken(user.id);
    const entitlement = await resolveEntitlementKey(
      authedRequest('http://localhost/api/generate-classroom', token),
    );
    expect(entitlement.tier).toBe('pro');
    expect(entitlement.userId).toBe(user.id);
    expect(entitlement.key).toMatch(/^usage\/acct-[a-f0-9]{24}$/);
  });

  it('resolves an anonymous visitor to a free-tier key derived from their learner key', async () => {
    const entitlement = await resolveEntitlementKey(
      anonRequest('http://localhost/api/generate-classroom', { 'x-learner-key': 'visitor-abc' }),
    );
    expect(entitlement.tier).toBe('free');
    expect(entitlement.userId).toBeUndefined();
    expect(entitlement.key).toMatch(/^usage\/anon-[a-f0-9]{24}$/);
  });

  it('gives the same anonymous visitor the same key on repeat requests', async () => {
    const a = await resolveEntitlementKey(
      anonRequest('http://localhost/x', { 'x-learner-key': 'same-visitor' }),
    );
    const b = await resolveEntitlementKey(
      anonRequest('http://localhost/x', { 'x-learner-key': 'same-visitor' }),
    );
    expect(a.key).toBe(b.key);
  });

  it('falls back to forwarded IP when no learner key is sent', async () => {
    const entitlement = await resolveEntitlementKey(
      anonRequest('http://localhost/x', { 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }),
    );
    expect(entitlement.key).toMatch(/^usage\/anon-[a-f0-9]{24}$/);
  });
});

describe('reserveClassroomSlot', () => {
  it('allows requests up to the plan daily cap, then rejects', async () => {
    const entitlement = { key: 'usage/test-daily', tier: 'free' as const };
    const limit = freePlan.limits.maxClassroomsPerDay;

    for (let i = 0; i < limit; i++) {
      const result = await reserveClassroomSlot(entitlement);
      expect(result.allowed).toBe(true);
    }

    const result = await reserveClassroomSlot(entitlement);
    expect(result).toEqual({ allowed: false, limit });
  });

  it('gives a higher cap to a higher tier', async () => {
    expect(proPlan.limits.maxClassroomsPerDay).toBeGreaterThan(freePlan.limits.maxClassroomsPerDay);
  });

  it('does not let concurrent reservations exceed the cap', async () => {
    const entitlement = { key: 'usage/test-concurrent', tier: 'free' as const };
    const limit = freePlan.limits.maxClassroomsPerDay;

    const results = await Promise.all(
      Array.from({ length: limit + 5 }, () => reserveClassroomSlot(entitlement)),
    );
    const allowedCount = results.filter((r) => r.allowed).length;
    expect(allowedCount).toBe(limit);
  });
});

describe('remainingMediaAllowance / recordMediaUsage', () => {
  it('starts at the plan full allowance', async () => {
    const entitlement = { key: 'usage/test-media-fresh', tier: 'free' as const };
    const allowance = await remainingMediaAllowance(entitlement);
    expect(allowance).toEqual({
      images: freePlan.limits.imagesPerMonth,
      videoSeconds: freePlan.limits.videoSecondsPerMonth,
    });
  });

  it('decrements the allowance after usage is recorded', async () => {
    const entitlement = { key: 'usage/test-media-decrement', tier: 'free' as const };
    await recordMediaUsage(entitlement, { images: 3, videoSeconds: 20 });
    const allowance = await remainingMediaAllowance(entitlement);
    expect(allowance).toEqual({
      images: Math.max(0, freePlan.limits.imagesPerMonth - 3),
      videoSeconds: Math.max(0, freePlan.limits.videoSecondsPerMonth - 20),
    });
  });

  it('never goes negative once usage exceeds the allowance', async () => {
    const entitlement = { key: 'usage/test-media-overdraw', tier: 'free' as const };
    await recordMediaUsage(entitlement, {
      images: freePlan.limits.imagesPerMonth + 50,
      videoSeconds: freePlan.limits.videoSecondsPerMonth + 50,
    });
    const allowance = await remainingMediaAllowance(entitlement);
    expect(allowance).toEqual({ images: 0, videoSeconds: 0 });
  });

  it('is a no-op when nothing was used', async () => {
    const entitlement = { key: 'usage/test-media-noop', tier: 'free' as const };
    await recordMediaUsage(entitlement, { images: 0, videoSeconds: 0 });
    const allowance = await remainingMediaAllowance(entitlement);
    expect(allowance).toEqual({
      images: freePlan.limits.imagesPerMonth,
      videoSeconds: freePlan.limits.videoSecondsPerMonth,
    });
  });
});

describe('checkPdfPageLimit', () => {
  it('allows a PDF within the plan limit', () => {
    const entitlement = { key: 'usage/test-pdf', tier: 'free' as const };
    const result = checkPdfPageLimit(entitlement, freePlan.limits.pdfPageLimit);
    expect(result).toEqual({ allowed: true });
  });

  it('rejects a PDF over the plan limit', () => {
    const entitlement = { key: 'usage/test-pdf', tier: 'free' as const };
    const result = checkPdfPageLimit(entitlement, freePlan.limits.pdfPageLimit + 1);
    expect(result).toEqual({ allowed: false, limit: freePlan.limits.pdfPageLimit });
  });

  it('applies the tier-specific limit', () => {
    const entitlement = { key: 'usage/test-pdf-pro', tier: 'pro' as const };
    const result = checkPdfPageLimit(entitlement, proPlan.limits.pdfPageLimit);
    expect(result).toEqual({ allowed: true });
  });
});

describe('day/month rollover', () => {
  it('rolls usage.classroomsToday over to 0 once stale (via a manual stale write)', async () => {
    const entitlement = { key: 'usage/test-rollover-day', tier: 'free' as const };
    const limit = freePlan.limits.maxClassroomsPerDay;

    for (let i = 0; i < limit; i++) {
      await reserveClassroomSlot(entitlement);
    }
    const exhausted = await reserveClassroomSlot(entitlement);
    expect(exhausted.allowed).toBe(false);

    // Simulate the stored day being stale by writing straight to the underlying doc.
    const { updateDoc } = await import('@/lib/server/app-store/json-store');
    await updateDoc(entitlement.key, {}, (current: Record<string, unknown>) => ({
      value: { ...current, day: '2000-01-01' },
      result: undefined,
    }));

    const fresh = await reserveClassroomSlot(entitlement);
    expect(fresh.allowed).toBe(true);
  });

  it('rolls monthly image/video usage over once the stored month is stale', async () => {
    const entitlement = { key: 'usage/test-rollover-month', tier: 'free' as const };
    await recordMediaUsage(entitlement, { images: 5, videoSeconds: 30 });

    const { updateDoc } = await import('@/lib/server/app-store/json-store');
    await updateDoc(entitlement.key, {}, (current: Record<string, unknown>) => ({
      value: { ...current, month: '2000-01' },
      result: undefined,
    }));

    const allowance = await remainingMediaAllowance(entitlement);
    expect(allowance).toEqual({
      images: freePlan.limits.imagesPerMonth,
      videoSeconds: freePlan.limits.videoSecondsPerMonth,
    });
  });
});
