'use client';

import { create } from 'zustand';
import type { SafeUser } from '@/lib/server/auth/types';
import type { PricingPlan } from '@/lib/server/monetization/types';
import { useUserProfileStore } from './user-profile';

interface AuthState {
  user: SafeUser | null;
  plan: PricingPlan | null;
  authenticated: boolean;
  loading: boolean;
  authModalOpen: boolean;
  authModalTab: 'signin' | 'signup';
  onboardingOpen: boolean;
  pricingModalOpen: boolean;
  calculatorModalOpen: boolean;

  // Modal controls
  setAuthModalOpen: (open: boolean, tab?: 'signin' | 'signup') => void;
  setOnboardingOpen: (open: boolean) => void;
  setPricingModalOpen: (open: boolean) => void;
  setCalculatorModalOpen: (open: boolean) => void;

  // Actions
  checkSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
    name?: string,
    promoCode?: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; avatar?: string; bio?: string }) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  plan: null,
  authenticated: false,
  loading: true,
  authModalOpen: false,
  authModalTab: 'signin',
  onboardingOpen: false,
  pricingModalOpen: false,
  calculatorModalOpen: false,

  setAuthModalOpen: (open, tab = 'signin') => {
    set({ authModalOpen: open, authModalTab: tab });
  },
  setOnboardingOpen: (open) => set({ onboardingOpen: open }),
  setPricingModalOpen: (open) => set({ pricingModalOpen: open }),
  setCalculatorModalOpen: (open) => set({ calculatorModalOpen: open }),

  checkSession: async () => {
    try {
      set({ loading: true });
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success && data.authenticated && data.user) {
        set({
          user: data.user,
          plan: data.plan || null,
          authenticated: true,
          loading: false,
        });
        // Sync nickname & avatar to user profile store
        const profileStore = useUserProfileStore.getState();
        if (data.user.name && !profileStore.nickname) {
          profileStore.setNickname(data.user.name);
        }
        if (data.user.avatar && profileStore.avatar === '/avatars/user.png') {
          profileStore.setAvatar(data.user.avatar);
        }
      } else {
        set({ user: null, plan: null, authenticated: false, loading: false });
      }
    } catch {
      set({ user: null, plan: null, authenticated: false, loading: false });
    }
  },

  login: async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        return { success: false, error: data.error || 'Failed to sign in' };
      }

      await get().checkSession();
      set({ authModalOpen: false });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error during sign in',
      };
    }
  },

  register: async (email, password, name, promoCode) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, promoCode }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      await get().checkSession();
      set({ authModalOpen: false, onboardingOpen: true });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error during registration',
      };
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      set({ user: null, plan: null, authenticated: false });
    }
  },

  updateProfile: async (updates) => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success && data.user) {
        set({ user: data.user });
        const profileStore = useUserProfileStore.getState();
        if (updates.name) profileStore.setNickname(updates.name);
        if (updates.avatar) profileStore.setAvatar(updates.avatar);
      }
    } catch {
      // best-effort
    }
  },

  refreshUser: async () => {
    await get().checkSession();
  },
}));
