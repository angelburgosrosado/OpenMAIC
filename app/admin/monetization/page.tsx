'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CreditCard,
  Tag,
  DollarSign,
  TrendingUp,
  Plus,
  Trash2,
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { PromoCode, Transaction, RevenueMetrics } from '@/lib/server/monetization/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminMonetizationPage() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newBonusTokens, setNewBonusTokens] = useState<number>(100_000);
  const [newDiscountPercent, setNewDiscountPercent] = useState<number>(0);
  const [newMaxUses, setNewMaxUses] = useState<number>(1000);
  const [newPlanUpgrade, setNewPlanUpgrade] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/monetization');
      const data = await res.json();
      if (data.success && data.data) {
        setPromoCodes(data.data.promoCodes);
        setTransactions(data.data.transactions);
        setMetrics(data.data.metrics);
      }
    } catch {
      toast.error('Failed to load monetization data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) {
      toast.error('Code is required');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/monetization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode.trim().toUpperCase(),
          bonusTokens: newBonusTokens,
          discountPercent: newDiscountPercent > 0 ? newDiscountPercent : undefined,
          planUpgrade: newPlanUpgrade || undefined,
          maxUses: newMaxUses,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Created promo code ${newCode.toUpperCase()}`);
        setModalOpen(false);
        setNewCode('');
        void fetchData();
      } else {
        toast.error(data.error || 'Failed to create promo code');
      }
    } catch {
      toast.error('Network error creating promo code');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCode = async (code: string) => {
    if (!confirm(`Are you sure you want to delete promo code ${code}?`)) return;

    try {
      const res = await fetch(`/api/admin/monetization/${code}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Deleted code ${code}`);
        void fetchData();
      } else {
        toast.error(data.error || 'Failed to delete promo code');
      }
    } catch {
      toast.error('Network error deleting promo code');
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-violet-500" />
            Monetization & Promo Codes
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage subscription plans, generate discount & token promo codes, and audit all platform
            purchases.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={fetchData} className="text-xs">
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </Button>
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="text-xs bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Generate Promo Code
          </Button>
        </div>
      </div>

      {/* Revenue KPI Summary */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl border border-border/60 bg-card/60 space-y-1">
            <div className="text-xs text-muted-foreground font-semibold flex items-center justify-between">
              <span>Total Revenue</span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-3xl font-black text-foreground">
              ${metrics.totalRevenueUsd.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground">Cumulative receipts</div>
          </div>

          <div className="p-5 rounded-2xl border border-border/60 bg-card/60 space-y-1">
            <div className="text-xs text-muted-foreground font-semibold flex items-center justify-between">
              <span>Monthly Recurring Revenue</span>
              <TrendingUp className="w-4 h-4 text-violet-500" />
            </div>
            <div className="text-3xl font-black text-violet-600 dark:text-violet-400">
              ${metrics.monthlyRecurringRevenueUsd}
              <span className="text-xs text-muted-foreground font-normal ml-1">/mo MRR</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              {metrics.activeSubscribers.pro} Pro + {metrics.activeSubscribers.enterprise} Enterprise
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-border/60 bg-card/60 space-y-1">
            <div className="text-xs text-muted-foreground font-semibold flex items-center justify-between">
              <span>Tokens Distributed</span>
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
            <div className="text-3xl font-black text-foreground">
              {metrics.tokensDistributedTotal >= 1_000_000
                ? `${(metrics.tokensDistributedTotal / 1_000_000).toFixed(1)}M`
                : `${(metrics.tokensDistributedTotal / 1_000).toFixed(0)}K`}
            </div>
            <div className="text-[11px] text-muted-foreground">Via subscriptions & top-ups</div>
          </div>
        </div>
      )}

      {/* Promo Codes Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Tag className="w-4 h-4 text-violet-500" />
            Active Promo & Voucher Codes ({promoCodes.length})
          </h2>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/40 font-semibold text-muted-foreground">
                <th className="p-3.5 pl-5">Code</th>
                <th className="p-3.5">Bonus Tokens</th>
                <th className="p-3.5">Discount</th>
                <th className="p-3.5">Tier Upgrade</th>
                <th className="p-3.5">Usage</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 pr-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {promoCodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-muted-foreground">
                    No promo codes created yet.
                  </td>
                </tr>
              ) : (
                promoCodes.map((c) => (
                  <tr key={c.code} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3.5 pl-5 font-mono font-bold text-foreground text-sm">
                      {c.code}
                    </td>
                    <td className="p-3.5 font-bold text-amber-600 dark:text-amber-400">
                      +{c.bonusTokens.toLocaleString()} tokens
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {c.discountPercent ? `${c.discountPercent}% OFF` : '—'}
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {c.planUpgrade ? c.planUpgrade.toUpperCase() : '—'}
                    </td>
                    <td className="p-3.5 text-foreground">
                      {c.usedCount} / {c.maxUses > 0 ? c.maxUses : '∞'}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        ACTIVE
                      </span>
                    </td>
                    <td className="p-3.5 pr-5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCode(c.code)}
                        className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete code"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions History */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-500" />
          Recent Transactions & Purchases ({transactions.length})
        </h2>

        <div className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border/40 bg-muted/40 font-semibold text-muted-foreground">
                <th className="p-3.5 pl-5">Date</th>
                <th className="p-3.5">User</th>
                <th className="p-3.5">Type & Description</th>
                <th className="p-3.5">Amount (USD)</th>
                <th className="p-3.5">Tokens Credited</th>
                <th className="p-3.5 pr-5">Payment Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                transactions.slice(0, 50).map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3.5 pl-5 text-muted-foreground whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleDateString()}{' '}
                      {new Date(tx.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-3.5 font-medium text-foreground">{tx.userEmail}</td>
                    <td className="p-3.5 font-medium text-foreground">{tx.description}</td>
                    <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                      ${tx.amountUsd}
                    </td>
                    <td className="p-3.5 font-bold text-foreground">
                      +{tx.tokensAdded.toLocaleString()}
                    </td>
                    <td className="p-3.5 pr-5 text-muted-foreground font-mono text-[10px]">
                      {tx.paymentMethod}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Promo Code Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Generate Promo Code</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create a custom discount or credit voucher for users to redeem.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCode} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Code String *</Label>
              <Input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="e.g. LAUNCH500K"
                required
                className="text-xs uppercase font-mono h-8"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Bonus Tokens</Label>
                <Input
                  type="number"
                  value={newBonusTokens}
                  onChange={(e) => setNewBonusTokens(parseInt(e.target.value) || 0)}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Max Redemptions</Label>
                <Input
                  type="number"
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(parseInt(e.target.value) || 0)}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Discount % (Optional)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={newDiscountPercent}
                  onChange={(e) => setNewDiscountPercent(parseInt(e.target.value) || 0)}
                  className="text-xs h-8"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Upgrade Tier (Optional)</Label>
                <select
                  value={newPlanUpgrade}
                  onChange={(e) => setNewPlanUpgrade(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-border/60 bg-background"
                >
                  <option value="">None (Credits only)</option>
                  <option value="pro">Creator Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-violet-600 hover:bg-violet-700 text-white font-semibold"
              >
                {submitting ? 'Creating...' : 'Create Promo Code'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
