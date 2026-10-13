'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/lib/store/auth-store';
import { PRICING_PLANS, CREDIT_PACKS } from '@/lib/server/monetization/plans';
import type { PricingPlan, CreditPack } from '@/lib/server/monetization/types';
import {
  Check,
  Zap,
  Sparkles,
  Shield,
  CreditCard,
  Tag,
  ArrowRight,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function PricingModal() {
  const open = useAuthStore((s) => s.pricingModalOpen);
  const setOpen = useAuthStore((s) => s.setPricingModalOpen);
  const setAuthModalOpen = useAuthStore((s) => s.setAuthModalOpen);
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [processingPackId, setProcessingPackId] = useState<string | null>(null);

  const handleSelectPlan = async (plan: PricingPlan) => {
    if (!user) {
      setOpen(false);
      setAuthModalOpen(true, 'signup');
      return;
    }

    if (user.tier === plan.tier) {
      toast.info(`You are currently on the ${plan.name} plan.`);
      return;
    }

    setProcessingPlanId(plan.id);
    try {
      const res = await fetch('/api/monetization/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'plan',
          planId: plan.id,
          billingCycle,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Upgraded to ${plan.name}!`);
        await refreshUser();
      } else {
        toast.error(data.error || 'Failed to update plan');
      }
    } catch {
      toast.error('Network error processing checkout');
    } finally {
      setProcessingPlanId(null);
    }
  };

  const handleBuyPack = async (pack: CreditPack) => {
    if (!user) {
      setOpen(false);
      setAuthModalOpen(true, 'signup');
      return;
    }

    setProcessingPackId(pack.id);
    try {
      const res = await fetch('/api/monetization/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'credit_pack',
          packId: pack.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Added ${pack.tokens.toLocaleString()} tokens!`);
        await refreshUser();
      } else {
        toast.error(data.error || 'Failed to purchase credit pack');
      }
    } catch {
      toast.error('Network error purchasing tokens');
    } finally {
      setProcessingPackId(null);
    }
  };

  const handleRedeemPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setOpen(false);
      setAuthModalOpen(true, 'signin');
      return;
    }
    if (!promoCodeInput.trim()) {
      toast.error('Please enter a promo code');
      return;
    }

    setRedeeming(true);
    try {
      const res = await fetch('/api/monetization/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCodeInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Promo code redeemed!');
        setPromoCodeInput('');
        await refreshUser();
      } else {
        toast.error(data.error || 'Failed to redeem promo code');
      }
    } catch {
      toast.error('Error redeeming promo code');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden border-border/50 bg-background/95 backdrop-blur-2xl shadow-2xl rounded-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 bg-gradient-to-br from-violet-600/10 via-purple-500/5 to-primary/10 border-b border-border/40 text-center shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>OpenMAIC Monetization Program</span>
          </div>
          <DialogTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Simple, Transparent Token-Powered Plans
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-lg mx-auto">
            Scale your interactive classroom generation with generous monthly token allowances,
            flagship AI models, and HD multimedia rendering.
          </DialogDescription>

          {/* Monthly / Annual Toggle */}
          <div className="inline-flex items-center p-1 mt-4 rounded-xl bg-muted/60 border border-border/40 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                'px-4 py-1.5 rounded-lg transition-all',
                billingCycle === 'monthly'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={cn(
                'px-4 py-1.5 rounded-lg transition-all flex items-center gap-1.5',
                billingCycle === 'yearly'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                SAVE 20%
              </span>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {/* Plan Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PRICING_PLANS.map((plan) => {
              const isCurrent = user?.tier === plan.tier;
              const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
              const formattedPrice =
                price === 0
                  ? '$0'
                  : billingCycle === 'yearly'
                    ? `$${Math.round(price / 12)}`
                    : `$${price}`;

              return (
                <div
                  key={plan.id}
                  className={cn(
                    'relative rounded-2xl p-5 border flex flex-col justify-between transition-all',
                    plan.isPopular
                      ? 'border-violet-500/60 bg-gradient-to-b from-violet-500/10 via-background to-background shadow-lg shadow-violet-500/10 ring-1 ring-violet-500/30'
                      : 'border-border/60 bg-background/50 hover:border-border',
                  )}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-violet-600 text-white shadow-sm">
                      {plan.badge}
                    </div>
                  )}

                  <div>
                    <div className="text-base font-bold text-foreground">{plan.name}</div>
                    <div className="text-xs text-muted-foreground mt-1 min-h-[32px]">
                      {plan.description}
                    </div>

                    <div className="mt-4 pb-4 border-b border-border/40">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-foreground">{formattedPrice}</span>
                        <span className="text-xs text-muted-foreground">/ month</span>
                      </div>
                      {billingCycle === 'yearly' && price > 0 && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          ${price} billed annually
                        </div>
                      )}
                      <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-md text-xs font-semibold bg-muted text-foreground">
                        <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>{plan.monthlyTokens.toLocaleString()} Tokens / mo</span>
                      </div>
                    </div>

                    {/* Features list */}
                    <ul className="mt-4 space-y-2.5 text-xs">
                      {plan.features.map((feat, i) => (
                        <li
                          key={i}
                          className={cn(
                            'flex items-start gap-2',
                            feat.included
                              ? feat.highlight
                                ? 'text-violet-600 dark:text-violet-400 font-semibold'
                                : 'text-foreground'
                              : 'text-muted-foreground/60 line-through',
                          )}
                        >
                          <Check
                            className={cn(
                              'w-3.5 h-3.5 shrink-0 mt-0.5',
                              feat.included
                                ? feat.highlight
                                  ? 'text-violet-600'
                                  : 'text-emerald-500'
                                : 'text-muted-foreground/30',
                            )}
                          />
                          <span>{feat.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-4">
                    <Button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={processingPlanId === plan.id || isCurrent}
                      className={cn(
                        'w-full font-semibold text-xs',
                        isCurrent
                          ? 'bg-muted text-muted-foreground cursor-default'
                          : plan.isPopular
                            ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20'
                            : 'bg-primary/90 hover:bg-primary text-primary-foreground',
                      )}
                    >
                      {processingPlanId === plan.id
                        ? 'Processing...'
                        : isCurrent
                          ? 'Current Plan'
                          : price === 0
                            ? 'Start Free'
                            : 'Upgrade Now'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Token Booster Packs Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  Instant Token Top-up Booster Packs
                </h3>
                <p className="text-xs text-muted-foreground">
                  Running out of tokens mid-semester? Add one-time tokens that never expire.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {CREDIT_PACKS.map((pack) => (
                <div
                  key={pack.id}
                  className={cn(
                    'p-4 rounded-xl border flex flex-col justify-between transition-all bg-card/60',
                    pack.popular
                      ? 'border-amber-500/50 ring-1 ring-amber-500/20'
                      : 'border-border/60 hover:border-border',
                  )}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{pack.name}</span>
                      {pack.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                          {pack.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-xl font-black text-foreground mt-2">
                      ${pack.priceUsd}
                      <span className="text-xs text-muted-foreground font-normal ml-1">one-time</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      +{(pack.tokens + pack.bonusTokens).toLocaleString()} platform tokens
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBuyPack(pack)}
                    disabled={processingPackId === pack.id}
                    className="mt-4 text-xs font-semibold w-full hover:bg-amber-500/10 hover:border-amber-500/50"
                  >
                    {processingPackId === pack.id ? 'Processing...' : 'Buy Booster'}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Promo Code Box */}
          <div className="p-4 rounded-xl border border-border/50 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Have a Promo or Voucher Code?</div>
                <div className="text-[11px] text-muted-foreground">
                  Redeem promotional grants and test vouchers (e.g. <code>WELCOME100K</code>).
                </div>
              </div>
            </div>

            <form onSubmit={handleRedeemPromo} className="flex items-center gap-2 w-full sm:w-auto">
              <Input
                placeholder="PROMO CODE"
                value={promoCodeInput}
                onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                className="text-xs uppercase h-8 w-full sm:w-36"
              />
              <Button
                type="submit"
                size="sm"
                disabled={redeeming}
                className="h-8 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shrink-0"
              >
                {redeeming ? 'Redeeming...' : 'Apply Code'}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
