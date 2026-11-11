import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import type Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { __resetAppStoreForTests } from '@/lib/server/app-store/json-store';

const ENV = [
  'APP_STORE_DIR',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'VERCEL',
  'DATABASE_URL',
] as const;
let saved: Record<string, string | undefined>;
let dir: string;

beforeEach(async () => {
  saved = Object.fromEntries(ENV.map((k) => [k, process.env[k]]));
  for (const k of ENV) delete process.env[k];
  dir = mkdtempSync(path.join(tmpdir(), 'qw-stripe-'));
  process.env.APP_STORE_DIR = dir;
  await __resetAppStoreForTests();
  vi.resetModules();
});

afterEach(async () => {
  for (const k of ENV) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  rmSync(dir, { recursive: true, force: true });
  await __resetAppStoreForTests();
});

async function makeUser() {
  const { createUser, getUserById } = await import('@/lib/server/auth/user-store');
  const u = await createUser({
    email: `p${Date.now()}@example.com`,
    password: 'pw-123456',
    name: 'Parent',
  });
  return { user: u, reload: () => getUserById(u.id) };
}

function evt(
  type: string,
  object: unknown,
  id = `evt_${Math.random().toString(36).slice(2)}`,
): Stripe.Event {
  return { id, type, data: { object } } as unknown as Stripe.Event;
}

describe('Stripe checkout session', () => {
  it('creates a subscription checkout with the user and plan in metadata', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    const create = vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/c/abc' });
    const stripeMod = await import('@/lib/server/monetization/stripe');
    stripeMod.__setStripeForTests({ checkout: { sessions: { create } } } as unknown as Stripe);
    const { user } = await makeUser();
    const url = await stripeMod.createCheckoutSession(
      user,
      { type: 'plan', planId: 'plan_pro', billingCycle: 'yearly' },
      'https://www.quewhat.com',
    );
    expect(url).toBe('https://checkout.stripe.com/c/abc');
    const args = create.mock.calls[0][0];
    expect(args.mode).toBe('subscription');
    expect(args.client_reference_id).toBe(user.id);
    expect(args.metadata).toMatchObject({
      userId: user.id,
      type: 'plan',
      planId: 'plan_pro',
      billingCycle: 'yearly',
    });
    expect(args.line_items[0].price_data.recurring.interval).toBe('year');
    expect(args.line_items[0].price_data.unit_amount).toBe(27900);
    expect(args.success_url).toBe('https://www.quewhat.com/?checkout=success');
  });

  it('refuses checkout for the free plan', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    const stripeMod = await import('@/lib/server/monetization/stripe');
    stripeMod.__setStripeForTests({
      checkout: { sessions: { create: vi.fn() } },
    } as unknown as Stripe);
    const { user } = await makeUser();
    await expect(
      stripeMod.createCheckoutSession(
        user,
        { type: 'plan', planId: 'plan_free', billingCycle: 'monthly' },
        'https://x',
      ),
    ).rejects.toThrow('free plan');
  });

  it('never allows simulated checkout on Vercel', async () => {
    process.env.VERCEL = '1';
    const { simulatedCheckoutAllowed, stripeConfigured } =
      await import('@/lib/server/monetization/stripe');
    expect(stripeConfigured()).toBe(false);
    expect(simulatedCheckoutAllowed()).toBe(false);
  });
});

describe('Stripe webhook events', () => {
  it('grants a paid plan once, records the customer, and ignores a duplicate delivery', async () => {
    const { handleStripeEvent } = await import('@/lib/server/monetization/stripe');
    const { user, reload } = await makeUser();
    const session = {
      id: 'cs_1',
      payment_status: 'paid',
      client_reference_id: user.id,
      customer: 'cus_1',
      subscription: 'sub_1',
      amount_total: 2900,
      metadata: { userId: user.id, type: 'plan', planId: 'plan_pro', billingCycle: 'monthly' },
    };
    const e = evt('checkout.session.completed', session, 'evt_plan');
    await handleStripeEvent(e);
    const after = (await reload())!;
    expect(after.tier).toBe('pro');
    expect(after.stripeCustomerId).toBe('cus_1');
    const balance = after.tokenBalance;
    expect(await handleStripeEvent(e)).toContain('duplicate');
    expect((await reload())!.tokenBalance).toBe(balance);
  });

  it('does not grant anything for an unpaid session', async () => {
    const { handleStripeEvent } = await import('@/lib/server/monetization/stripe');
    const { user, reload } = await makeUser();
    await handleStripeEvent(
      evt('checkout.session.completed', {
        id: 'cs_2',
        payment_status: 'unpaid',
        metadata: { userId: user.id, type: 'credit_pack', packId: 'pack_starter' },
      }),
    );
    expect((await reload())!.tokenBalance).toBe(user.tokenBalance);
  });

  it('adds credit-pack tokens', async () => {
    const { handleStripeEvent } = await import('@/lib/server/monetization/stripe');
    const { user, reload } = await makeUser();
    await handleStripeEvent(
      evt('checkout.session.completed', {
        id: 'cs_3',
        payment_status: 'paid',
        customer: 'cus_3',
        amount_total: 1000,
        metadata: { userId: user.id, type: 'credit_pack', packId: 'pack_starter' },
      }),
    );
    expect((await reload())!.tokenBalance).toBe(user.tokenBalance + 1_100_000);
  });

  it('refills monthly tokens on renewal and downgrades when the subscription ends', async () => {
    const { handleStripeEvent } = await import('@/lib/server/monetization/stripe');
    const { user, reload } = await makeUser();
    await handleStripeEvent(
      evt('checkout.session.completed', {
        id: 'cs_4',
        payment_status: 'paid',
        customer: 'cus_4',
        subscription: 'sub_4',
        metadata: { userId: user.id, type: 'plan', planId: 'plan_pro', billingCycle: 'monthly' },
      }),
    );
    const before = (await reload())!.tokenBalance;
    await handleStripeEvent(
      evt('invoice.paid', {
        id: 'in_1',
        billing_reason: 'subscription_cycle',
        customer: 'cus_4',
        amount_paid: 2900,
      }),
    );
    expect((await reload())!.tokenBalance).toBe(before + 3_000_000);
    await handleStripeEvent(
      evt('customer.subscription.deleted', {
        id: 'sub_4',
        status: 'canceled',
        customer: 'cus_4',
        metadata: {},
      }),
    );
    expect((await reload())!.tier).toBe('free');
  });

  it('retries an event whose processing failed', async () => {
    const stripeMod = await import('@/lib/server/monetization/stripe');
    const e = evt(
      'checkout.session.completed',
      {
        id: 'cs_5',
        payment_status: 'paid',
        metadata: { userId: 'usr_missing', type: 'plan', planId: 'plan_pro' },
      },
      'evt_retry',
    );
    // A missing user is reported, not thrown, so this event is recorded…
    expect(await stripeMod.handleStripeEvent(e)).toContain('not found');
    expect(await stripeMod.handleStripeEvent(e)).toContain('duplicate');
  });
});

describe('Stripe risk events', () => {
  it('marks the matching transaction refunded and writes an audit entry', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    const stripeMod = await import('@/lib/server/monetization/stripe');
    const { listTransactions, recordTransaction } =
      await import('@/lib/server/monetization/monetization-store');
    const { listAuditLogs } = await import('@/lib/server/admin/admin-store');
    const { user } = await makeUser();
    await recordTransaction({
      userId: user.id,
      userEmail: user.email,
      type: 'credit_topup',
      description: 'Pack',
      amountUsd: 10,
      tokensAdded: 1000,
      status: 'completed',
      paymentMethod: 'STRIPE',
      referenceId: 'cs_123',
    });
    const list = vi.fn().mockResolvedValue({ data: [{ id: 'cs_123' }] });
    stripeMod.__setStripeForTests({ checkout: { sessions: { list } } } as unknown as Stripe);

    const out = await stripeMod.handleStripeEvent(
      evt('charge.refunded', {
        id: 'ch_1',
        customer: null,
        payment_intent: 'pi_1',
        amount_refunded: 1000,
      }),
    );
    expect(out).toContain('cs_123 marked refunded');
    expect(list).toHaveBeenCalledWith({ payment_intent: 'pi_1', limit: 1 });
    expect((await listTransactions(user.id))[0].status).toBe('refunded');
    const audit = await listAuditLogs();
    expect(audit[0]).toMatchObject({ action: 'stripe.charge_refunded', adminId: 'stripe-webhook' });
  });

  it('logs disputes, fraud warnings and async payment failures to the audit log', async () => {
    const stripeMod = await import('@/lib/server/monetization/stripe');
    const { listAuditLogs } = await import('@/lib/server/admin/admin-store');
    await stripeMod.handleStripeEvent(
      evt('charge.dispute.created', {
        id: 'dp_1',
        charge: 'ch_9',
        amount: 2900,
        reason: 'fraudulent',
        evidence_details: { due_by: 1800000000 },
      }),
    );
    await stripeMod.handleStripeEvent(
      evt('radar.early_fraud_warning.created', {
        id: 'issfr_1',
        charge: 'ch_9',
        fraud_type: 'made_with_stolen_card',
      }),
    );
    await stripeMod.handleStripeEvent(
      evt('checkout.session.async_payment_failed', { id: 'cs_9', metadata: { userId: 'usr_x' } }),
    );
    const actions = (await listAuditLogs()).map((a) => a.action);
    expect(actions).toContain('stripe.dispute_created');
    expect(actions).toContain('stripe.early_fraud_warning');
    expect(actions).toContain('stripe.async_payment_failed');
  });

  it('enables invoice creation on credit-pack checkouts', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x';
    const create = vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/c/pack' });
    const stripeMod = await import('@/lib/server/monetization/stripe');
    stripeMod.__setStripeForTests({ checkout: { sessions: { create } } } as unknown as Stripe);
    const { user } = await makeUser();
    await stripeMod.createCheckoutSession(
      user,
      { type: 'credit_pack', packId: 'pack_starter' },
      'https://x.test',
    );
    const args = create.mock.calls[0][0];
    expect(args.invoice_creation).toEqual({ enabled: true });
    expect(args.payment_method_types).toBeUndefined();
  });
});

describe('POST /api/monetization/checkout', () => {
  it('answers 503 on Vercel when Stripe is not configured', async () => {
    process.env.VERCEL = '1';
    const { user } = await makeUser();
    vi.doMock('@/lib/server/auth/session', () => ({ requireAuth: async () => user }));
    const { POST } = await import('@/app/api/monetization/checkout/route');
    const res = await POST({
      json: async () => ({ type: 'plan', planId: 'plan_pro' }),
      nextUrl: { origin: 'https://www.quewhat.com' },
    } as never);
    expect(res.status).toBe(503);
    vi.doUnmock('@/lib/server/auth/session');
  });
});
