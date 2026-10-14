export type AppRole =
  | 'learner'
  | 'parent'
  | 'teacher'
  | 'organization_admin'
  | 'platform_admin';

// UserRole includes AppRole and legacy roles for backwards compatibility
export type UserRole = AppRole | 'admin' | 'user' | 'creator';
export type UserTier = 'free' | 'pro' | 'enterprise';
export type UserStatus = 'active' | 'suspended' | 'pending';

export type TenantType = 'personal_family' | 'classroom' | 'organization';

export interface Tenant {
  id: string;
  type: TenantType;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantMembership {
  tenantId: string;
  userId: string;
  role: AppRole;
  createdAt: string;
  tenant?: Tenant;
}

export interface SessionPrincipal {
  userId: string;
  email?: string;
  name?: string;
  role: AppRole;
  tenants: TenantMembership[];
  activeTenant: TenantMembership;
  isAnonymousDev?: boolean;
}

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
