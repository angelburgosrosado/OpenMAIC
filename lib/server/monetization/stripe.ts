/**
 * Stripe payments for plans (subscriptions) and credit packs (one-time).
 *
 * Money only changes hands on Stripe's hosted Checkout page. Plans and credits
 * are granted by the signed webhook (`/api/stripe/webhook`), never by the
 * browser, and each Stripe event is applied at most once.
 *
 * Env:
 *  - STRIPE_SECRET_KEY       sk_test_… / sk_live_…
 *  - STRIPE_WEBHOOK_SECRET   whsec_… (from the webhook endpoint in Stripe)
 *  - APP_URL (optional)      public origin for return URLs, e.g. https://www.quewhat.com
 */

import type Stripe from 'stripe';
import { createLogger } from '@/lib/logger';
import { logAuditEvent } from '@/lib/server/admin/admin-store';
import { readDoc, updateDoc } from '@/lib/server/app-store/json-store';
import { getUserById, getUserByStripeCustomerId, updateUser } from '@/lib/server/auth/user-store';
import type { User } from '@/lib/server/auth/types';
import { CREDIT_PACKS, PRICING_PLANS } from './plans';
import {
  markTransactionRefunded,
  processBuyCreditPack,
  processCheckoutPlan,
  recordTransaction,
} from './monetization-store';

const log = createLogger('Stripe');

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Simulated (free) checkout exists only for local development and tests. */
export function simulatedCheckoutAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' && !process.env.VERCEL;
}

let client: Stripe | null = null;
export async function getStripe(): Promise<Stripe> {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured');
  if (!client) {
    const { default: StripeCtor } = await import('stripe');
    client = new StripeCtor(process.env.STRIPE_SECRET_KEY, { appInfo: { name: 'QuéWhat' } });
  }
  return client;
}

/** Test hook. */
export function __setStripeForTests(s: Stripe | null): void {
  client = s;
}

function cents(usd: number): number {
  return Math.round(usd * 100);
}

export type CheckoutRequest =
  | { type: 'plan'; planId: string; billingCycle: 'monthly' | 'yearly' }
  | { type: 'credit_pack'; packId: string };

/** Create a hosted Checkout session and return its URL. */
export async function createCheckoutSession(
  user: User,
  req: CheckoutRequest,
  origin: string,
): Promise<string> {
  const stripe = await getStripe();
  const base = (process.env.APP_URL || origin).replace(/\/$/, '');
  const common = {
    client_reference_id: user.id,
    success_url: `${base}/?checkout=success`,
    cancel_url: `${base}/?checkout=cancel`,
    allow_promotion_codes: true,
    ...(user.stripeCustomerId
      ? { customer: user.stripeCustomerId }
      : { customer_email: user.email }),
  };

  if (req.type === 'plan') {
    const plan = PRICING_PLANS.find((p) => p.id === req.planId);
    if (!plan) throw new Error(`Plan ${req.planId} not found`);
    const price = req.billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
    if (price <= 0) throw new Error('The free plan does not need checkout');
    const metadata = {
      userId: user.id,
      type: 'plan',
      planId: plan.id,
      billingCycle: req.billingCycle,
    };
    const session = await stripe.checkout.sessions.create({
      ...common,
      mode: 'subscription',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: cents(price),
            recurring: { interval: req.billingCycle === 'yearly' ? 'year' : 'month' },
            product_data: { name: `QuéWhat ${plan.name}`, metadata: { planId: plan.id } },
          },
        },
      ],
      metadata,
      subscription_data: { metadata },
      // Dashboard label for comparing checkout flows.
      integration_identifier: 'quewhat-plans-kmrtpzvy',
    });
    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    return session.url;
  }

  const pack = CREDIT_PACKS.find((p) => p.id === req.packId);
  if (!pack) throw new Error(`Credit pack ${req.packId} not found`);
  const session = await stripe.checkout.sessions.create({
    ...common,
    mode: 'payment',
    ...(user.stripeCustomerId ? {} : { customer_creation: 'always' as const }),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: cents(pack.priceUsd),
          product_data: { name: `QuéWhat ${pack.name}`, metadata: { packId: pack.id } },
        },
      },
    ],
    metadata: { userId: user.id, type: 'credit_pack', packId: pack.id },
    // Buyers get a real Stripe invoice/receipt (useful for co-op and ESA reimbursements).
    invoice_creation: { enabled: true },
    integration_identifier: 'quewhat-packs-dhnjwxce',
  });
  if (!session.url) throw new Error('Stripe did not return a checkout URL');
  return session.url;
}

/** Stripe-hosted page where a customer updates their card or cancels. */
export async function createBillingPortalSession(user: User, origin: string): Promise<string> {
  if (!user.stripeCustomerId)
    throw new Error('No billing account yet — subscribe or buy credits first');
  const stripe = await getStripe();
  const base = (process.env.APP_URL || origin).replace(/\/$/, '');
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${base}/`,
  });
  return session.url;
}

/** Verify the signature and parse a webhook payload. Throws on a bad signature. */
export async function verifyWebhook(
  rawBody: string,
  signature: string | null,
): Promise<Stripe.Event> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  if (!signature) throw new Error('Missing Stripe-Signature header');
  const stripe = await getStripe();
  return stripe.webhooks.constructEvent(rawBody, signature, secret);
}

/** Processed event ids, so a retried or duplicate delivery is not applied twice. */
const EVENTS_KEY = 'stripe/processed-events';

async function alreadyProcessed(eventId: string): Promise<boolean> {
  return (await readDoc<string[]>(EVENTS_KEY, [])).includes(eventId);
}

async function markProcessed(eventId: string): Promise<void> {
  await updateDoc<string[], void>(EVENTS_KEY, [], (ids) => ({
    value: ids.includes(eventId) ? ids : [eventId, ...ids].slice(0, 5000),
    result: undefined,
  }));
}

/** Surface a Stripe risk/system event in the admin audit log. */
async function systemAudit(action: string, targetId: string, details: string): Promise<void> {
  try {
    await logAuditEvent({
      adminId: 'stripe-webhook',
      adminEmail: 'system',
      action,
      targetType: 'monetization',
      targetId,
      details,
    });
  } catch (err) {
    log.warn('Could not write audit log entry:', err);
  }
}

async function findUserByCustomer(customerId: string | null | undefined): Promise<User | null> {
  return customerId ? getUserByStripeCustomerId(customerId) : null;
}

function idOf(v: string | { id: string } | null | undefined): string | undefined {
  if (!v) return undefined;
  return typeof v === 'string' ? v : v.id;
}

/**
 * Apply a verified Stripe event. Returns a short description for logs.
 * Unknown event types are acknowledged and ignored.
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<string> {
  if (await alreadyProcessed(event.id)) return `duplicate ${event.id} ignored`;
  const outcome = await applyEvent(event);
  // Recorded only after success, so a failed attempt is retried by Stripe.
  await markProcessed(event.id);
  return outcome;
}

async function applyEvent(event: Stripe.Event): Promise<string> {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.payment_status !== 'paid' && s.payment_status !== 'no_payment_required') {
        return `session ${s.id} not paid yet (${s.payment_status})`;
      }
      const userId = s.metadata?.userId || s.client_reference_id;
      if (!userId) return `session ${s.id} has no user`;
      const user = await getUserById(userId);
      if (!user) return `session ${s.id}: user ${userId} not found`;
      const customerId = idOf(s.customer);
      const subscriptionId = idOf(s.subscription);
      if (customerId && user.stripeCustomerId !== customerId) {
        await updateUser(user.id, { stripeCustomerId: customerId });
      }
      const amountUsd = (s.amount_total ?? 0) / 100;
      if (s.metadata?.type === 'plan' && s.metadata.planId) {
        const cycle = s.metadata.billingCycle === 'yearly' ? 'yearly' : 'monthly';
        await processCheckoutPlan(user.id, s.metadata.planId, cycle, {
          paymentMethod: 'STRIPE',
          referenceId: subscriptionId || s.id,
          amountUsd,
        });
        return `plan ${s.metadata.planId} granted to ${user.id}`;
      }
      if (s.metadata?.type === 'credit_pack' && s.metadata.packId) {
        await processBuyCreditPack(user.id, s.metadata.packId, {
          paymentMethod: 'STRIPE',
          referenceId: s.id,
          amountUsd,
        });
        return `pack ${s.metadata.packId} granted to ${user.id}`;
      }
      return `session ${s.id} had no QuéWhat metadata`;
    }

    case 'invoice.paid': {
      const inv = event.data.object as Stripe.Invoice & { billing_reason?: string };
      // The first invoice is covered by checkout.session.completed.
      if (inv.billing_reason !== 'subscription_cycle')
        return `invoice ${inv.id} (${inv.billing_reason}) skipped`;
      const user = await findUserByCustomer(idOf(inv.customer as string | { id: string } | null));
      if (!user) return `invoice ${inv.id}: no matching user`;
      const plan = PRICING_PLANS.find((p) => p.tier === user.tier);
      if (!plan || plan.monthlyTokens <= 0) return `invoice ${inv.id}: user on ${user.tier}`;
      await updateUser(user.id, {
        tokenBalance: user.tokenBalance + plan.monthlyTokens,
        tokensUsedThisMonth: 0,
      });
      await recordTransaction({
        userId: user.id,
        userEmail: user.email,
        type: 'subscription',
        description: `Renewed ${plan.name}`,
        amountUsd: (inv.amount_paid ?? 0) / 100,
        tokensAdded: plan.monthlyTokens,
        planTier: plan.tier,
        status: 'completed',
        paymentMethod: 'STRIPE',
        referenceId: inv.id ?? undefined,
      });
      return `renewal credited to ${user.id}`;
    }

    case 'customer.subscription.deleted':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const ended =
        event.type === 'customer.subscription.deleted' ||
        sub.status === 'canceled' ||
        sub.status === 'unpaid' ||
        sub.status === 'incomplete_expired';
      if (!ended) return `subscription ${sub.id} is ${sub.status}`;
      const user =
        (sub.metadata?.userId ? await getUserById(sub.metadata.userId) : null) ??
        (await findUserByCustomer(idOf(sub.customer)));
      if (!user) return `subscription ${sub.id}: no matching user`;
      const free = PRICING_PLANS.find((p) => p.tier === 'free');
      await updateUser(user.id, { tier: 'free', monthlyAllowance: free?.monthlyTokens ?? 0 });
      log.info(`Subscription ${sub.id} ended; ${user.email} moved to free`);
      return `downgraded ${user.id}`;
    }

    case 'checkout.session.async_payment_failed': {
      const s = event.data.object as Stripe.Checkout.Session;
      log.warn(
        `Async payment failed for session ${s.id} (user ${s.metadata?.userId ?? 'unknown'})`,
      );
      await systemAudit(
        'stripe.async_payment_failed',
        s.id,
        `Checkout session ${s.id} payment failed after completion`,
      );
      return `async payment failed for ${s.id}`;
    }

    case 'charge.refunded': {
      const charge = event.data.object as Stripe.Charge;
      const user = await findUserByCustomer(idOf(charge.customer));
      // Resolve the charge back to its Checkout session (our transaction reference).
      let marked = 'no matching transaction';
      const pi = idOf(charge.payment_intent);
      if (pi && stripeConfigured()) {
        try {
          const stripe = await getStripe();
          const sessions = await stripe.checkout.sessions.list({ payment_intent: pi, limit: 1 });
          const sessionId = sessions.data[0]?.id;
          if (sessionId && (await markTransactionRefunded(sessionId)))
            marked = `transaction ${sessionId} marked refunded`;
        } catch (err) {
          log.warn('Could not resolve refunded charge to a session:', err);
        }
      }
      const amount = ((charge.amount_refunded ?? 0) / 100).toFixed(2);
      await systemAudit(
        'stripe.charge_refunded',
        charge.id,
        `Refund of $${amount}${user ? ` for ${user.email}` : ''} (charge ${charge.id}); ${marked}. Review token balance.`,
      );
      return `refund recorded for ${charge.id}; ${marked}`;
    }

    case 'charge.dispute.created': {
      const dispute = event.data.object as Stripe.Dispute;
      const amount = ((dispute.amount ?? 0) / 100).toFixed(2);
      log.warn(`Dispute ${dispute.id} opened for charge ${idOf(dispute.charge)} ($${amount})`);
      await systemAudit(
        'stripe.dispute_created',
        dispute.id,
        `Dispute opened for charge ${idOf(dispute.charge)} ($${amount}, reason: ${dispute.reason}). Respond in the Stripe Dashboard before ${
          dispute.evidence_details?.due_by
            ? new Date(dispute.evidence_details.due_by * 1000).toISOString().slice(0, 10)
            : 'the deadline'
        }.`,
      );
      return `dispute ${dispute.id} logged`;
    }

    case 'radar.early_fraud_warning.created': {
      const warning = event.data.object as Stripe.Radar.EarlyFraudWarning;
      log.warn(`Early fraud warning ${warning.id} for charge ${idOf(warning.charge)}`);
      await systemAudit(
        'stripe.early_fraud_warning',
        warning.id,
        `Early fraud warning for charge ${idOf(warning.charge)} (${warning.fraud_type}). Consider refunding proactively to avoid a dispute.`,
      );
      return `fraud warning ${warning.id} logged`;
    }

    default:
      return `ignored ${event.type}`;
  }
}
