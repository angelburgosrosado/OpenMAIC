'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';
import {
  Shield,
  LayoutDashboard,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  FileText,
  ArrowLeft,
  Sparkles,
  Lock,
  LogOut,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { href: '/admin', label: 'Command Center', icon: LayoutDashboard },
  { href: '/admin/users', label: 'User Management', icon: Users },
  { href: '/admin/monetization', label: 'Monetization & Promos', icon: CreditCard },
  { href: '/admin/usage', label: 'Usage & Consumption', icon: BarChart3 },
  { href: '/admin/settings', label: 'Platform Settings', icon: Settings },
  { href: '/admin/audit', label: 'Audit Trail', icon: FileText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const authenticated = useAuthStore((s) => s.authenticated);
  const loading = useAuthStore((s) => s.loading);
  const checkSession = useAuthStore((s) => s.checkSession);
  const setAuthModalOpen = useAuthStore((s) => s.setAuthModalOpen);
  const logout = useAuthStore((s) => s.logout);

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function verify() {
      await checkSession();
      setChecking(false);
    }
    void verify();
  }, [checkSession]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs text-muted-foreground font-medium">
            Verifying administrative access...
          </span>
        </div>
      </div>
    );
  }

  // If not logged in or not admin, show Access Denied guard
  if (!authenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full p-8 rounded-2xl border border-destructive/30 bg-destructive/5 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Administrative Access Restricted</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            You must be logged in as an administrator to access the OpenMAIC Administrative Backend.
            Current user: <code className="text-foreground">{user?.email || 'Guest'}</code>
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/')}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Return to App
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground font-semibold"
              onClick={() => setAuthModalOpen(true, 'signin')}
            >
              Sign In as Admin
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar (dark styled, sleek glassmorphism) */}
      <aside className="w-64 border-r border-border/50 bg-card/60 backdrop-blur-xl flex flex-col justify-between shrink-0">
        <div>
          {/* Logo Brand */}
          <div className="p-5 border-b border-border/40 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="p-2 rounded-xl bg-violet-600 text-white shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-black tracking-tight text-foreground flex items-center gap-1.5">
                  <span>OpenMAIC</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-600 dark:text-violet-400">
                    ADMIN
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">Management Console</div>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all',
                    isActive
                      ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/20 font-bold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer controls */}
        <div className="p-3 border-t border-border/40 space-y-2">
          {/* Admin Info Pill */}
          <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={user.avatar || '/avatars/teacher-2.png'}
                alt={user.name}
                className="w-7 h-7 rounded-full object-cover"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-foreground truncate">{user.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-border/60 hover:bg-muted/40 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to App</span>
            </Link>
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.push('/');
              }}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto min-w-0 bg-background/50">
        {children}
      </main>
    </div>
  );
}
