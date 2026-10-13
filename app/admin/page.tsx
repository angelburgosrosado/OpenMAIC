'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users,
  DollarSign,
  Zap,
  Activity,
  ArrowUpRight,
  Shield,
  CreditCard,
  UserPlus,
  Tag,
  Settings,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AdminOverviewStats } from '@/lib/server/admin/admin-store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminOverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOverview() {
      try {
        const res = await fetch('/api/admin/overview');
        const data = await res.json();
        if (data.success && data.data) {
          setStats(data.data);
        }
      } catch {
        toast.error('Failed to load overview statistics');
      } finally {
        setLoading(false);
      }
    }
    void fetchOverview();
  }, []);

  if (loading || !stats) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const { users, monetization, usage, settings, recentAuditLogs } = stats;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Administrative Command Center
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time telemetry, user account management, and monetization metrics for OpenMAIC.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="text-xs">
            <Link href="/admin/users">
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Manage Users
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="text-xs bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
          >
            <Link href="/admin/monetization">
              <Tag className="w-3.5 h-3.5 mr-1.5" />
              Promo Codes
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Users */}
        <div className="p-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md shadow-sm space-y-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Registered Users</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-foreground">{users.total}</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {users.active} active
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/40">
            <span>Free: {users.byTier.free}</span>
            <span>Pro: {users.byTier.pro}</span>
            <span>Enterprise: {users.byTier.enterprise}</span>
          </div>
        </div>

        {/* Card 2: Revenue */}
        <div className="p-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md shadow-sm space-y-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Revenue (USD)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-foreground">
              ${monetization.totalRevenueUsd.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">
              ${monetization.monthlyRecurringRevenueUsd}/mo MRR
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/40 flex items-center justify-between">
            <span>{monetization.totalTransactions} transactions recorded</span>
          </div>
        </div>

        {/* Card 3: Platform Tokens */}
        <div className="p-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md shadow-sm space-y-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">LLM Tokens Consumed</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-foreground">
              {usage.totalLlmTokens >= 1_000_000
                ? `${(usage.totalLlmTokens / 1_000_000).toFixed(2)}M`
                : `${(usage.totalLlmTokens / 1_000).toFixed(0)}K`}
            </span>
            <span className="text-xs text-muted-foreground">{usage.totalRequests} reqs</span>
          </div>
          <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
            Aggregated deployment-wide log
          </div>
        </div>

        {/* Card 4: Platform Health */}
        <div className="p-5 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md shadow-sm space-y-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Platform Status</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-2xl font-black text-foreground">
              {settings.maintenanceMode ? 'Maintenance' : 'Operational'}
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground pt-1 border-t border-border/40 flex items-center justify-between">
            <span>Registrations: {settings.allowRegistrations ? 'Enabled' : 'Paused'}</span>
            <Link href="/admin/settings" className="hover:text-foreground underline">
              Edit
            </Link>
          </div>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: User Tier Breakdown & Quick Links (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Tiers Distribution */}
          <div className="p-6 rounded-2xl border border-border/60 bg-card/60 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">User Tiers & Monetization Share</h3>
              <Link
                href="/admin/monetization"
                className="text-xs text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
              >
                <span>View Plans</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {/* Free Tier Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Free Starter ($0/mo)</span>
                  <span className="font-bold text-foreground">
                    {users.byTier.free} users (
                    {users.total > 0 ? Math.round((users.byTier.free / users.total) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${users.total > 0 ? (users.byTier.free / users.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Creator Pro Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Creator Pro ($29/mo)</span>
                  <span className="font-bold text-foreground">
                    {users.byTier.pro} users (
                    {users.total > 0 ? Math.round((users.byTier.pro / users.total) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-violet-600 rounded-full"
                    style={{
                      width: `${users.total > 0 ? (users.byTier.pro / users.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Enterprise Studio Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Enterprise Studio ($99/mo)</span>
                  <span className="font-bold text-foreground">
                    {users.byTier.enterprise} users (
                    {users.total > 0 ? Math.round((users.byTier.enterprise / users.total) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{
                      width: `${users.total > 0 ? (users.byTier.enterprise / users.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/admin/users"
              className="p-4 rounded-xl border border-border/60 bg-card/40 hover:bg-muted/40 transition-all flex flex-col justify-between space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <Users className="w-5 h-5 text-blue-500" />
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">User Management</div>
                <div className="text-[11px] text-muted-foreground">Adjust credits, change roles</div>
              </div>
            </Link>

            <Link
              href="/admin/monetization"
              className="p-4 rounded-xl border border-border/60 bg-card/40 hover:bg-muted/40 transition-all flex flex-col justify-between space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <CreditCard className="w-5 h-5 text-violet-500" />
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Monetization</div>
                <div className="text-[11px] text-muted-foreground">Promo codes & transactions</div>
              </div>
            </Link>

            <Link
              href="/admin/settings"
              className="p-4 rounded-xl border border-border/60 bg-card/40 hover:bg-muted/40 transition-all flex flex-col justify-between space-y-3 group"
            >
              <div className="flex items-center justify-between">
                <Settings className="w-5 h-5 text-emerald-500" />
                <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground">Settings & Flags</div>
                <div className="text-[11px] text-muted-foreground">Signups, allowances & banner</div>
              </div>
            </Link>
          </div>
        </div>

        {/* Right: Recent Audit Logs Stream (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl border border-border/60 bg-card/60 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Recent Administrative Activity
            </h3>
            <Link href="/admin/audit" className="text-xs text-muted-foreground hover:text-foreground">
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {recentAuditLogs.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No administrative actions logged yet.
              </div>
            ) : (
              recentAuditLogs.slice(0, 6).map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl border border-border/40 bg-background/50 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">{log.action}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-relaxed">
                    {log.details}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    by {log.adminEmail}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
