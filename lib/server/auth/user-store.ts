import { promises as fs } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { createLogger } from '@/lib/logger';
import { hashPassword, generateApiKey } from './crypto';
import type { User, SafeUser, RegisterInput, UserRole, UserTier, UserStatus } from './types';

const log = createLogger('UserStore');
const DATA_DIR = path.join(process.cwd(), 'data', 'auth');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// In-memory mutex for serial writes
let writeLock: Promise<void> = Promise.resolve();

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeLock.then(fn, fn);
  writeLock = next.then(() => {}, () => {});
  return next;
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export function stripSensitive(user: User): SafeUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, passwordSalt, ...safe } = user;
  return safe;
}

async function readUsersUnsafe(): Promise<User[]> {
  try {
    const raw = await fs.readFile(USERS_FILE, 'utf-8');
    return JSON.parse(raw) as User[];
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    log.error('Failed to read users file:', err);
    return [];
  }
}

async function writeUsersUnsafe(users: User[]): Promise<void> {
  await ensureDataDir();
  const tmpFile = `${USERS_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(users, null, 2), 'utf-8');
  await fs.rename(tmpFile, USERS_FILE);
}

/**
 * Initialize default admin user if none exists
 */
export async function ensureDefaultAdmin(): Promise<User> {
  return withLock(async () => {
    const users = await readUsersUnsafe();
    const existingAdmin = users.find((u) => u.role === 'admin');
    if (existingAdmin) return existingAdmin;

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@openmaic.io';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
    const { hash, salt } = hashPassword(adminPassword);

    const now = new Date().toISOString();
    const adminUser: User = {
      id: `usr_${nanoid(12)}`,
      email: adminEmail.toLowerCase().trim(),
      passwordHash: hash,
      passwordSalt: salt,
      name: 'System Administrator',
      role: 'admin',
      tier: 'enterprise',
      status: 'active',
      avatar: '/avatars/teacher-2.png',
      bio: 'OpenMAIC Platform Administrator',
      tokenBalance: 50_000_000,
      monthlyAllowance: 50_000_000,
      tokensUsedThisMonth: 0,
      totalTokensConsumed: 0,
      apiKey: generateApiKey(),
      createdAt: now,
      updatedAt: now,
    };

    users.push(adminUser);
    await writeUsersUnsafe(users);
    log.info(`Initialized default administrator account: ${adminEmail}`);
    return adminUser;
  });
}

export async function getUserById(id: string): Promise<User | null> {
  await ensureDefaultAdmin();
  const users = await readUsersUnsafe();
  return users.find((u) => u.id === id) || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  await ensureDefaultAdmin();
  const users = await readUsersUnsafe();
  const normalized = email.toLowerCase().trim();
  return users.find((u) => u.email.toLowerCase() === normalized) || null;
}

export async function getUserByApiKey(apiKey: string): Promise<User | null> {
  if (!apiKey) return null;
  await ensureDefaultAdmin();
  const users = await readUsersUnsafe();
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
  return withLock(async () => {
    const users = await readUsersUnsafe();
    const normalizedEmail = input.email.toLowerCase().trim();

    if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      throw new Error('A user with this email address already exists');
    }

    const { hash, salt } = hashPassword(input.password);
    const now = new Date().toISOString();
    const initialTokens = options?.initialTokens ?? 250_000; // 250k free starter bonus tokens

    const newUser: User = {
      id: `usr_${nanoid(12)}`,
      email: normalizedEmail,
      passwordHash: hash,
      passwordSalt: salt,
      name: input.name.trim() || 'New Learner',
      role: options?.role || 'user',
      tier: options?.tier || 'free',
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
    await writeUsersUnsafe(users);
    log.info(`Created new user account: ${newUser.email} (${newUser.id})`);
    return newUser;
  });
}

export async function updateUser(
  id: string,
  updates: Partial<Omit<User, 'id' | 'createdAt'>>,
): Promise<User> {
  return withLock(async () => {
    const users = await readUsersUnsafe();
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
    await writeUsersUnsafe(users);
    return updated;
  });
}

export async function deleteUser(id: string): Promise<boolean> {
  return withLock(async () => {
    const users = await readUsersUnsafe();
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
    await writeUsersUnsafe(users);
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
  const allUsers = await readUsersUnsafe();

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
  return withLock(async () => {
    const users = await readUsersUnsafe();
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
    await writeUsersUnsafe(users);
    return updated;
  });
}
