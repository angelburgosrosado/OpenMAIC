import { promises as fs } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import { createLogger } from '@/lib/logger';
import { listUsers } from '@/lib/server/auth/user-store';
import { getRevenueMetrics, listTransactions } from '@/lib/server/monetization/monetization-store';
import { readUsageRecords } from '@/lib/server/usage-storage';

const log = createLogger('AdminStore');
const DATA_DIR = path.join(process.cwd(), 'data', 'admin');
const SETTINGS_FILE = path.join(DATA_DIR, 'app-settings.json');
const AUDIT_LOG_FILE = path.join(DATA_DIR, 'audit-logs.jsonl');

export interface AppSettings {
  allowRegistrations: boolean;
  defaultTokensOnSignup: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  systemAnnouncement: string;
  requireEmailVerification: boolean;
  freeTierDailyCourseLimit: number;
  paymentMode: 'simulated' | 'stripe';
  updatedAt: string;
  updatedBy?: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  allowRegistrations: true,
  defaultTokensOnSignup: 250_000,
  maintenanceMode: false,
  maintenanceMessage: 'OpenMAIC is undergoing brief scheduled maintenance. We will be back online shortly.',
  systemAnnouncement: '🚀 Welcome to OpenMAIC! Explore the new Monetization & Token Calculator tools.',
  requireEmailVerification: false,
  freeTierDailyCourseLimit: 3,
  paymentMode: 'simulated',
  updatedAt: new Date().toISOString(),
};

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: 'user' | 'promo_code' | 'setting' | 'monetization' | 'system';
  targetId?: string;
  details: string;
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      await ensureDir();
      const tmp = `${SETTINGS_FILE}.${process.pid}.${Date.now()}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
      await fs.rename(tmp, SETTINGS_FILE);
      return DEFAULT_SETTINGS;
    }
    return DEFAULT_SETTINGS;
  }
}

export async function updateAppSettings(
  updates: Partial<AppSettings>,
  adminEmail?: string,
): Promise<AppSettings> {
  await ensureDir();
  let current: AppSettings = DEFAULT_SETTINGS;
  try {
    const raw = await fs.readFile(SETTINGS_FILE, 'utf-8');
    current = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // fallback to DEFAULT_SETTINGS
  }

  const updated: AppSettings = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
    updatedBy: adminEmail || current.updatedBy,
  };

  const tmp = `${SETTINGS_FILE}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(updated, null, 2), 'utf-8');
  await fs.rename(tmp, SETTINGS_FILE);
  return updated;
}

export async function logAuditEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
  await ensureDir();
  const logItem: AuditLogEntry = {
    ...entry,
    id: `aud_${nanoid(12)}`,
    timestamp: new Date().toISOString(),
  };

  try {
    await fs.appendFile(AUDIT_LOG_FILE, JSON.stringify(logItem) + '\n', 'utf-8');
  } catch (err) {
    log.error('Failed to append audit log:', err);
  }
}

export async function listAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
  try {
    const content = await fs.readFile(AUDIT_LOG_FILE, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const parsed: AuditLogEntry[] = [];
    for (let i = lines.length - 1; i >= 0 && parsed.length < limit; i--) {
      try {
        parsed.push(JSON.parse(lines[i]));
      } catch {
        // ignore malformed line
      }
    }
    return parsed;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    return [];
  }
}

export interface AdminOverviewStats {
  users: {
    total: number;
    active: number;
    suspended: number;
    byTier: {
      free: number;
      pro: number;
      enterprise: number;
    };
  };
  monetization: {
    totalRevenueUsd: number;
    monthlyRecurringRevenueUsd: number;
    totalTransactions: number;
  };
  usage: {
    totalRequests: number;
    totalLlmTokens: number;
  };
  recentAuditLogs: AuditLogEntry[];
  settings: AppSettings;
}

export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  const [userResult, revMetrics, usageRecords, recentLogs, settings] = await Promise.all([
    listUsers({ pageSize: 1000 }),
    getRevenueMetrics(),
    readUsageRecords({ limit: 1000 }),
    listAuditLogs(10),
    getAppSettings(),
  ]);

  const byTier = { free: 0, pro: 0, enterprise: 0 };
  let activeUsers = 0;
  let suspendedUsers = 0;

  for (const u of userResult.users) {
    if (u.tier in byTier) {
      byTier[u.tier as keyof typeof byTier] += 1;
    }
    if (u.status === 'active') activeUsers += 1;
    if (u.status === 'suspended') suspendedUsers += 1;
  }

  let totalLlmTokens = 0;
  for (const r of usageRecords) {
    if (r.kind === 'llm') {
      totalLlmTokens += (r.inputTokens || 0) + (r.outputTokens || 0);
    }
  }

  return {
    users: {
      total: userResult.total,
      active: activeUsers,
      suspended: suspendedUsers,
      byTier,
    },
    monetization: {
      totalRevenueUsd: revMetrics.totalRevenueUsd,
      monthlyRecurringRevenueUsd: revMetrics.monthlyRecurringRevenueUsd,
      totalTransactions: revMetrics.totalTransactions,
    },
    usage: {
      totalRequests: usageRecords.length,
      totalLlmTokens,
    },
    recentAuditLogs: recentLogs,
    settings,
  };
}
