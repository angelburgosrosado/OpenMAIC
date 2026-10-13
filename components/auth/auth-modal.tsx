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
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/store/auth-store';
import { toast } from 'sonner';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  Tag,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function AuthModal() {
  const open = useAuthStore((s) => s.authModalOpen);
  const tab = useAuthStore((s) => s.authModalTab);
  const setOpen = useAuthStore((s) => s.setAuthModalOpen);
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);

  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(tab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync internal state when store tab changes
  if (tab !== activeTab && open) {
    setActiveTab(tab);
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      toast.success('Welcome back!');
    } else {
      toast.error(result.error || 'Failed to sign in');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Email and password are required');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await register(email, password, name, promoCode);
    setLoading(false);

    if (result.success) {
      toast.success('Account created successfully! Welcome to OpenMAIC.');
    } else {
      toast.error(result.error || 'Registration failed');
    }
  };

  const fillDemoAdmin = () => {
    setEmail('admin@openmaic.io');
    setPassword('admin123456');
    setActiveTab('signin');
    toast.info('Filled default admin credentials');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-border/50 bg-background/95 backdrop-blur-2xl shadow-2xl rounded-2xl">
        {/* Top Header Banner */}
        <div className="relative p-6 pb-5 bg-gradient-to-br from-violet-600/10 via-purple-500/5 to-primary/10 border-b border-border/40">
          <div className="flex items-center justify-between mb-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>OpenMAIC Cloud Platform</span>
            </div>
            <button
              type="button"
              onClick={fillDemoAdmin}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground underline decoration-dotted transition-colors"
            >
              Demo Admin Auto-fill
            </button>
          </div>

          <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
            {activeTab === 'signin' ? 'Sign in to your account' : 'Create your free account'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            {activeTab === 'signin'
              ? 'Access your saved classrooms, token allowances, and settings.'
              : 'Start building interactive AI classrooms with 250,000 free bonus tokens.'}
          </DialogDescription>

          {/* Tab Selector */}
          <div className="grid grid-cols-2 p-1 mt-4 rounded-xl bg-muted/60 border border-border/40 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('signin')}
              className={cn(
                'py-1.5 rounded-lg transition-all',
                activeTab === 'signin'
                  ? 'bg-background shadow-sm text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('signup')}
              className={cn(
                'py-1.5 rounded-lg transition-all',
                activeTab === 'signup'
                  ? 'bg-background shadow-sm text-foreground font-semibold'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 pt-4 space-y-4">
          {activeTab === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="signin-email" className="text-xs font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="signin-password" className="text-xs font-medium">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signin-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9 text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium shadow-md shadow-violet-500/20"
              >
                {loading ? 'Signing in...' : 'Sign In'}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="signup-name" className="text-xs font-medium">
                  Your Name / Nickname
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Alex Rivera"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="signup-email" className="text-xs font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="signup-password" className="text-xs font-medium">
                  Password (min 6 characters)
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9 text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="signup-promo" className="text-xs font-medium flex items-center justify-between">
                  <span>Invite or Promo Code (Optional)</span>
                  <span className="text-[10px] text-violet-500 font-semibold">Try: WELCOME100K</span>
                </Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signup-promo"
                    type="text"
                    placeholder="WELCOME100K"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className="pl-9 text-sm uppercase tracking-wider"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-violet-500/5 border border-violet-500/15 flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Includes 250,000 free starter tokens & unlimited basic lectures.</span>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium shadow-md shadow-violet-500/20"
              >
                {loading ? 'Creating Account...' : 'Get Started Free'}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          )}

          {/* Quick Notice */}
          <div className="pt-2 text-center text-[11px] text-muted-foreground border-t border-border/30">
            Protected with salted scrypt hashing & HMAC session security.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
