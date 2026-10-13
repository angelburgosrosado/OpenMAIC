import type { UserTier } from '@/lib/server/auth/types';

export interface PlanFeature {
  name: string;
  included: boolean;
  highlight?: boolean;
}

export interface PricingPlan {
  id: string;
  name: string;
  tier: UserTier;
  description: string;
  priceMonthly: number;
  priceYearly: number; // e.g. billed annually (~20% off)
  monthlyTokens: number;
  badge?: string;
  isPopular?: boolean;
  features: PlanFeature[];
  limits: {
    maxClassroomsPerDay: number;
    imagesPerMonth: number;
    videoSecondsPerMonth: number;
    pdfPageLimit: number;
    priorityQueue: boolean;
    customModelKeys: boolean;
    multiVoiceNarration: boolean;
    highResVideoExport: boolean;
  };
}

export interface CreditPack {
  id: string;
  name: string;
  tokens: number;
  bonusTokens: number;
  priceUsd: number;
  badge?: string;
  popular?: boolean;
}

export interface PromoCode {
  code: string;
  bonusTokens: number;
  discountPercent?: number;
  planUpgrade?: UserTier;
  maxUses: number;
  usedCount: number;
  expiresAt?: string;
  active: boolean;
  createdAt: string;
}

export type TransactionType = 'subscription' | 'credit_topup' | 'promo_redeem';
export type TransactionStatus = 'completed' | 'pending' | 'failed' | 'refunded';

export interface Transaction {
  id: string;
  userId: string;
  userEmail: string;
  type: TransactionType;
  description: string;
  amountUsd: number;
  tokensAdded: number;
  planTier?: UserTier;
  status: TransactionStatus;
  paymentMethod: string;
  referenceId?: string;
  createdAt: string;
}

export interface RevenueMetrics {
  totalRevenueUsd: number;
  monthlyRecurringRevenueUsd: number;
  totalTransactions: number;
  activeSubscribers: {
    free: number;
    pro: number;
    enterprise: number;
  };
  tokensDistributedTotal: number;
}
