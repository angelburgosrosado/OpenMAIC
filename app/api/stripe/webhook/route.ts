/**
 * Stripe webhook. Point a Stripe webhook endpoint at /api/stripe/webhook with:
 *   checkout.session.completed, checkout.session.async_payment_succeeded,
 *   invoice.paid, customer.subscription.updated, customer.subscription.deleted
 * The signature is verified with STRIPE_WEBHOOK_SECRET before anything happens.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { handleStripeEvent, verifyWebhook } from '@/lib/server/monetization/stripe';

const log = createLogger('StripeWebhook');

export async function POST(req: NextRequest) {
  const raw = await req.text();
  let event;
  try {
    event = await verifyWebhook(raw, req.headers.get('stripe-signature'));
  } catch (err) {
    log.warn('Rejected webhook:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }
  try {
    const outcome = await handleStripeEvent(event);
    log.info(`${event.type} ${event.id}: ${outcome}`);
    return NextResponse.json({ received: true });
  } catch (err) {
    // A 500 makes Stripe retry later; the event id is only recorded once applied.
    log.error(`Failed to apply ${event.type} ${event.id}:`, err);
    return NextResponse.json({ error: 'processing failed' }, { status: 500 });
  }
}
