'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PRICING_PLANS, CREDIT_PACKS } from '@/lib/server/monetization/plans';
import { useAuthStore } from '@/lib/store/auth-store';
import { AuthModal } from '@/components/auth/auth-modal';
import { PricingModal } from '@/components/monetization/pricing-modal';
import {
  Sparkles,
  Zap,
  Check,
  ArrowLeft,
  Tag,
  CreditCard,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const user = useAuthStore((s) => s.user);
  const setAuthModalOpen = useAuthStore((s) => s.setAuthModalOpen);
  const setPricingModalOpen = useAuthStore((s) => s.setPricingModalOpen);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Header */}
      <header className="h-16 px-6 sm:px-12 border-b border-border/40 flex items-center justify-between backdrop-blur-md bg-background/80 sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2 text-sm font-bold text-foreground">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          <span>Back to OpenMAIC Studio</span>
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Logged in as</span>
              <span className="font-bold text-foreground">{user.email}</span>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => setAuthModalOpen(true, 'signin')}
              className="text-xs bg-violet-600 hover:bg-violet-700 text-white font-semibold"
            >
              Sign In
            </Button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 py-12 sm:py-16 space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>OpenMAIC Monetization Program</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
            Simple, Token-Powered Pricing
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Generate unlimited courses, interactive whiteboards, and multimedia voiceovers with
            predictable token allocations and no hidden fees.
          </p>

          {/* Toggle Billing */}
          <div className="inline-flex items-center p-1 rounded-xl bg-muted/60 border border-border/40 text-xs font-semibold mt-4">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={cn(
                'px-5 py-2 rounded-lg transition-all',
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
                'px-5 py-2 rounded-lg transition-all flex items-center gap-1.5',
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

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PRICING_PLANS.map((plan) => {
            const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly;
            const formattedPrice =
              price === 0 ? '$0' : billingCycle === 'yearly' ? `$${Math.round(price / 12)}` : `$${price}`;
            const isCurrent = user?.tier === plan.tier;

            return (
              <div
                key={plan.id}
                className={cn(
                  'relative rounded-2xl p-6 border flex flex-col justify-between transition-all bg-card/60 backdrop-blur-md',
                  plan.isPopular
                    ? 'border-violet-500/60 bg-gradient-to-b from-violet-500/10 via-background to-background shadow-xl ring-1 ring-violet-500/30'
                    : 'border-border/60 hover:border-border',
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-violet-600 text-white shadow-sm">
                    {plan.badge}
                  </div>
                )}

                <div>
                  <div className="text-lg font-bold text-foreground">{plan.name}</div>
                  <div className="text-xs text-muted-foreground mt-1 min-h-[36px]">
                    {plan.description}
                  </div>

                  <div className="mt-4 pb-4 border-b border-border/40">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-foreground">{formattedPrice}</span>
                      <span className="text-xs text-muted-foreground">/ month</span>
                    </div>
                    {billingCycle === 'yearly' && price > 0 && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        ${price} billed annually
                      </div>
                    )}
                    <div className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-md text-xs font-semibold bg-muted text-foreground">
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>{plan.monthlyTokens.toLocaleString()} Tokens / mo</span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="mt-5 space-y-2.5 text-xs">
                    {plan.features.map((feat, i) => (
                      <li
                        key={i}
                        className={cn(
                          'flex items-start gap-2',
                          feat.included
                            ? feat.highlight
                              ? 'text-violet-600 dark:text-violet-400 font-semibold'
                              : 'text-foreground'
                            : 'text-muted-foreground/50 line-through',
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

                <div className="mt-8 pt-4">
                  <Button
                    onClick={() => {
                      if (!user) {
                        setAuthModalOpen(true, 'signup');
                      } else {
                        setPricingModalOpen(true);
                      }
                    }}
                    className={cn(
                      'w-full font-bold text-xs',
                      isCurrent
                        ? 'bg-muted text-muted-foreground'
                        : plan.isPopular
                          ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-500/20'
                          : 'bg-primary text-primary-foreground',
                    )}
                  >
                    {isCurrent ? 'Current Plan' : price === 0 ? 'Get Started Free' : 'Choose Plan'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Booster Packs Grid */}
        <div className="space-y-4 pt-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
              On-Demand Token Boosters
            </h2>
            <p className="text-xs text-muted-foreground">
              Need extra capacity for an intensive seminar or course? Top up once, keep forever.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CREDIT_PACKS.map((pack) => (
              <div
                key={pack.id}
                className={cn(
                  'p-5 rounded-2xl border flex flex-col justify-between bg-card/60 backdrop-blur-md',
                  pack.popular ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'border-border/60',
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">{pack.name}</span>
                    {pack.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        {pack.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-foreground mt-2">${pack.priceUsd}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    +{(pack.tokens + pack.bonusTokens).toLocaleString()} tokens
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!user) setAuthModalOpen(true, 'signin');
                    else setPricingModalOpen(true);
                  }}
                  className="mt-4 text-xs font-semibold w-full hover:bg-amber-500/10 hover:border-amber-500/50"
                >
                  Buy Pack
                </Button>
              </div>
            ))}
          </div>
        </div>
      </main>

      <AuthModal />
      <PricingModal />
    </div>
  );
}
