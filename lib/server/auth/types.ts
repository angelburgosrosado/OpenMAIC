export type UserRole = 'admin' | 'user' | 'creator';
export type UserTier = 'free' | 'pro' | 'enterprise';
export type UserStatus = 'active' | 'suspended' | 'pending';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  name: string;
  role: UserRole;
  tier: UserTier;
  status: UserStatus;
  avatar: string;
  bio?: string;
  tokenBalance: number;
  monthlyAllowance: number;
  tokensUsedThisMonth: number;
  totalTokensConsumed: number;
  apiKey?: string;
  stripeCustomerId?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export type SafeUser = Omit<User, 'passwordHash' | 'passwordSalt'>;

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: number;
  createdAt: number;
  userAgent?: string;
  ip?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  promoCode?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
