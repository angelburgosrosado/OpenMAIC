import { nanoid } from 'nanoid';
import { createLogger } from '@/lib/logger';
import { readDoc, updateDoc } from '@/lib/server/app-store/json-store';
import { hashPassword, generateApiKey } from './crypto';
import type { User, SafeUser, RegisterInput, UserRole, UserTier, UserStatus } from './types';

const log = createLogger('UserStore');
/** Store key: Postgres row when DATABASE_URL is set, else data/auth/users.json. */
const USERS_KEY = 'auth/users';

/** Email that becomes the administrator (set ADMIN_EMAIL in the deployment). */
function adminEmail(): string | null {
  const v = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  return v || null;
}

/**
 * Dev/test convenience only: outside production an admin with a well-known
 * password is seeded so the admin pages can be tried locally. Production never
 * gets a default password.
 */
function devDefaultAdminAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' && !process.env.VERCEL;
}

export function stripSensitive(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, passwordSalt, ...safe } = user;
  return safe;
}

async function readUsers(): Promise<User[]> {
  return readDoc<User[]>(USERS_KEY, []);
}

/** Read-modify-write the user list atomically. */
function mutateUsers<R>(fn: (users: User[]) => R | Promise<R>): Promise<R> {
  return updateDoc<User[], R>(USERS_KEY, [], async (users) => {
    const result = await fn(users);
    return { value: users, result };
  });
}

/**
 * Seed an administrator when none exists.
 *
 * - ADMIN_EMAIL + ADMIN_PASSWORD set: seeds that account (any environment).
 * - Otherwise, only in local development/tests: seeds admin@openmaic.io with a
 *   well-known password. In production nothing is seeded; instead the first
 *   account registered with ADMIN_EMAIL becomes the administrator.
 * Returns the admin, or null when no admin exists and none may be seeded.
 */
export async function ensureDefaultAdmin(): Promise<User | null> {
  const existing = (await readUsers()).find((u) => u.role === 'admin');
  if (existing) return existing;

  const envEmail = adminEmail();
  const envPassword = process.env.ADMIN_PASSWORD;
  let email: string;
  let password: string;
  if (envEmail && envPassword) {
    email = envEmail;
    password = envPassword;
  } else if (devDefaultAdminAllowed()) {
    email = 'admin@openmaic.io';
    password = 'admin123456';
  } else {
    return null;
  }

  return mutateUsers((users) => {
    const again = users.find((u) => u.role === 'admin');
    if (again) return again;
    const { hash, salt } = hashPassword(password);
    const now = new Date().toISOString();
    const adminUser: User = {
      id: `usr_${nanoid(12)}`,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      name: 'System Administrator',
      role: 'admin',
      tier: 'enterprise',
      status: 'active',
      avatar: '/avatars/teacher-2.png',
      bio: 'QuéWhat Platform Administrator',
      tokenBalance: 50_000_000,
      monthlyAllowance: 50_000_000,
      tokensUsedThisMonth: 0,
      totalTokensConsumed: 0,
      apiKey: generateApiKey(),
      createdAt: now,
      updatedAt: now,
    };
    users.push(adminUser);
    log.info(`Initialized administrator account: ${email}`);
    return adminUser;
  });
}

export async function getUserById(id: string): Promise<User | null> {
  await ensureDefaultAdmin();
  const users = await readUsers();
  return users.find((u) => u.id === id) || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  await ensureDefaultAdmin();
  const users = await readUsers();
  const normalized = email.toLowerCase().trim();
  return users.find((u) => u.email.toLowerCase() === normalized) || null;
}

export async function getUserByApiKey(apiKey: string): Promise<User | null> {
  if (!apiKey) return null;
  await ensureDefaultAdmin();
  const users = await readUsers();
  return users.find((u) => u.apiKey === apiKey && u.status === 'active') || null;
}

export async function createUser(
  input: RegisterInput,
  options?: {
    role?: UserRole;
    tier?: UserTier;
    initialTokens?: number;
    avatar?: string;
  },
): Promise<User> {
  return mutateUsers((users) => {
    const normalizedEmail = input.email.toLowerCase().trim();

    if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      throw new Error('A user with this email address already exists');
    }

    const { hash, salt } = hashPassword(input.password);
    const now = new Date().toISOString();
    const initialTokens = options?.initialTokens ?? 250_000; // 250k free starter bonus tokens
    // The deployment's ADMIN_EMAIL becomes the administrator when no admin exists yet.
    const becomesAdmin =
      adminEmail() === normalizedEmail && !users.some((u) => u.role === 'admin');

    const newUser: User = {
      id: `usr_${nanoid(12)}`,
      email: normalizedEmail,
      passwordHash: hash,
      passwordSalt: salt,
      name: input.name.trim() || 'New Learner',
      role: becomesAdmin ? 'admin' : options?.role || 'user',
      tier: becomesAdmin ? 'enterprise' : options?.tier || 'free',
      status: 'active',
      avatar: options?.avatar || '/avatars/user.png',
      tokenBalance: initialTokens,
      monthlyAllowance: initialTokens,
      tokensUsedThisMonth: 0,
      totalTokensConsumed: 0,
      apiKey: generateApiKey(),
      createdAt: now,
      updatedAt: now,
    };

    users.push(newUser);
    log.info(`Created new user account: ${newUser.email} (${newUser.id})`);
    return newUser;
  });
}

export async function updateUser(
  id: string,
  updates: Partial<Omit<User, 'id' | 'createdAt'>>,
): Promise<User> {
  return mutateUsers((users) => {
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new Error(`User ${id} not found`);
    }

    const current = users[index];
    const updated: User = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    users[index] = updated;
    return updated;
  });
}

export async function deleteUser(id: string): Promise<boolean> {
  return mutateUsers((users) => {
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return false;

    // Do not allow deleting the last remaining admin
    if (users[index].role === 'admin') {
      const adminCount = users.filter((u) => u.role === 'admin').length;
      if (adminCount <= 1) {
        throw new Error('Cannot delete the only remaining administrator account');
      }
    }

    users.splice(index, 1);
    log.info(`Deleted user ${id}`);
    return true;
  });
}

export interface ListUsersOptions {
  search?: string;
  role?: UserRole;
  tier?: UserTier;
  status?: UserStatus;
  page?: number;
  pageSize?: number;
}

export async function listUsers(opts: ListUsersOptions = {}): Promise<{
  users: SafeUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  await ensureDefaultAdmin();
  const allUsers = await readUsers();

  let filtered = allUsers;

  if (opts.search) {
    const q = opts.search.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q),
    );
  }

  if (opts.role) {
    filtered = filtered.filter((u) => u.role === opts.role);
  }

  if (opts.tier) {
    filtered = filtered.filter((u) => u.tier === opts.tier);
  }

  if (opts.status) {
    filtered = filtered.filter((u) => u.status === opts.status);
  }

  const total = filtered.length;
  const page = Math.max(1, opts.page || 1);
  const pageSize = Math.max(1, Math.min(100, opts.pageSize || 20));
  const start = (page - 1) * pageSize;
  const pageSlice = filtered.slice(start, start + pageSize);

  return {
    users: pageSlice.map(stripSensitive),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function adjustUserTokenBalance(
  id: string,
  deltaTokens: number,
  consumed = false,
): Promise<User> {
  return mutateUsers((users) => {
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new Error(`User ${id} not found`);
    }

    const current = users[index];
    const newBalance = Math.max(0, current.tokenBalance + deltaTokens);
    const addedConsumed = consumed && deltaTokens < 0 ? Math.abs(deltaTokens) : 0;

    const updated: User = {
      ...current,
      tokenBalance: newBalance,
      tokensUsedThisMonth: current.tokensUsedThisMonth + addedConsumed,
      totalTokensConsumed: current.totalTokensConsumed + addedConsumed,
      updatedAt: new Date().toISOString(),
    };

    users[index] = updated;
    return updated;
  });
}
