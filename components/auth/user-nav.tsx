'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Zap,
  Calculator,
  Shield,
  CreditCard,
  LogOut,
  User as UserIcon,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(Math.round(n));
}

export function UserNav() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authenticated = useAuthStore((s) => s.authenticated);
  const loading = useAuthStore((s) => s.loading);
  const checkSession = useAuthStore((s) => s.checkSession);
  const setAuthModalOpen = useAuthStore((s) => s.setAuthModalOpen);
  const setPricingModalOpen = useAuthStore((s) => s.setPricingModalOpen);
  const setCalculatorModalOpen = useAuthStore((s) => s.setCalculatorModalOpen);
  const logout = useAuthStore((s) => s.logout);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    void checkSession();
  }, [checkSession]);

  if (!mounted || loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-7 w-16 rounded-full bg-muted/60 animate-pulse" />
      </div>
    );
  }

  // Not authenticated view
  if (!authenticated || !user) {
    return (
      <div className="flex items-center gap-1.5">
        {/* Token Calculator quick launch */}
        <button
          type="button"
          onClick={() => setCalculatorModalOpen(true)}
          className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          title="Token Consumption Calculator"
          aria-label="Token Consumption Calculator"
        >
          <Calculator className="w-4 h-4" />
        </button>

        {/* Pricing Quick Link */}
        <button
          type="button"
          onClick={() => setPricingModalOpen(true)}
          className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          title="Monetization Plans & Pricing"
          aria-label="Monetization Plans"
        >
          <CreditCard className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-3.5 bg-border/60 mx-0.5" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAuthModalOpen(true, 'signin')}
          className="h-7 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          Sign In
        </Button>
        <Button
          size="sm"
          onClick={() => setAuthModalOpen(true, 'signup')}
          className="h-7 px-3 text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow-sm"
        >
          Sign Up
        </Button>
      </div>
    );
  }

  // Authenticated view
  const tierColor =
    user.role === 'admin'
      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
      : user.tier === 'enterprise'
        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
        : user.tier === 'pro'
          ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30'
          : 'bg-muted text-muted-foreground border-border/40';

  const tierLabel =
    user.role === 'admin' ? 'ADMIN' : user.tier ? user.tier.toUpperCase() : 'FREE';

  const usedPercent =
    user.monthlyAllowance > 0
      ? Math.min(100, Math.round((user.tokensUsedThisMonth / user.monthlyAllowance) * 100))
      : 0;

  return (
    <div className="flex items-center gap-1.5">
      {/* Token Pill */}
      <button
        type="button"
        onClick={() => setCalculatorModalOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/15 transition-all shadow-sm"
        title="Token Balance & Calculator"
      >
        <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
        <span className="font-bold tabular-nums">{formatTokens(user.tokenBalance)}</span>
      </button>

      {/* User Dropdown */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 pl-1 pr-2 py-0.5 rounded-full border border-border/50 hover:border-border bg-background/50 hover:bg-muted/40 transition-all shadow-sm group"
          >
            <img
              src={user.avatar || '/avatars/user.png'}
              alt={user.name}
              className="w-6 h-6 rounded-full object-cover ring-1 ring-border/50"
            />
            <span className="text-xs font-semibold text-foreground max-w-[80px] truncate">
              {user.name.split(' ')[0]}
            </span>
            <span
              className={cn(
                'text-[10px] font-extrabold px-1.5 py-0.2 rounded-full border tracking-wide uppercase',
                tierColor,
              )}
            >
              {tierLabel}
            </span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={8} className="w-64 p-2 rounded-xl">
          {/* User Info Header */}
          <div className="p-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground truncate">{user.name}</span>
              <span
                className={cn(
                  'text-[9px] font-extrabold px-1.5 py-0.5 rounded border tracking-wider',
                  tierColor,
                )}
              >
                {tierLabel}
              </span>
            </div>
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>

            {/* Token Usage Bar */}
            <div className="pt-2.5 pb-1 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-medium">
                <span className="text-muted-foreground">Tokens Used This Month</span>
                <span className="font-bold text-foreground">{usedPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-amber-500 rounded-full transition-all"
                  style={{ width: `${usedPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{formatTokens(user.tokensUsedThisMonth)} used</span>
                <span>{formatTokens(user.tokenBalance)} balance</span>
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Action Items */}
          <DropdownMenuItem
            onClick={() => setPricingModalOpen(true)}
            className="cursor-pointer gap-2.5 py-2"
          >
            <CreditCard className="w-4 h-4 text-violet-500" />
            <div className="flex-1 flex items-center justify-between">
              <span>Upgrade Plan & Add Credits</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setCalculatorModalOpen(true)}
            className="cursor-pointer gap-2.5 py-2"
          >
            <Calculator className="w-4 h-4 text-emerald-500" />
            <span>Token Consumption Calculator</span>
          </DropdownMenuItem>

          {/* Admin Command Center Link (Only shown for admin users) */}
          {user.role === 'admin' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer py-2">
                <Link
                  href="/admin"
                  className="flex items-center gap-2.5 font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-md"
                >
                  <Shield className="w-4 h-4 text-rose-500" />
                  <div className="flex-1 flex items-center justify-between">
                    <span>Admin Command Center</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={async () => {
              await logout();
              toast.info('Signed out');
            }}
            className="cursor-pointer gap-2.5 py-2 text-destructive focus:text-destructive"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
