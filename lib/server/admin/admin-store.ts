import { nanoid } from 'nanoid';
import { createLogger } from '@/lib/logger';
import { listUsers } from '@/lib/server/auth/user-store';
import { getRevenueMetrics, listTransactions } from '@/lib/server/monetization/monetization-store';
import { readUsageRecords } from '@/lib/server/usage-storage';
import { appendLog, readDoc, readLog, updateDoc } from '@/lib/server/app-store/json-store';

const log = createLogger('AdminStore');
/** Postgres when DATABASE_URL is set, else data/admin/app-settings.json and audit-logs.jsonl. */
const SETTINGS_KEY = 'admin/app-settings';
const AUDIT_STREAM = 'admin/audit-logs';

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
  maintenanceMessage: 'QuéWhat is undergoing brief scheduled maintenance. We will be back online shortly.',
  systemAnnouncement: '',
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

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const stored = await readDoc<Partial<AppSettings> | null>(SETTINGS_KEY, null);
    return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
  } catch (err) {
    log.error('Failed to read app settings; using defaults:', err);
    return DEFAULT_SETTINGS;
  }
}

export async function updateAppSettings(
  updates: Partial<AppSettings>,
  adminEmail?: string,
): Promise<AppSettings> {
  return updateDoc<Partial<AppSettings> | null, AppSettings>(SETTINGS_KEY, null, (stored) => {
    const current: AppSettings = { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
    const updated: AppSettings = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: adminEmail || current.updatedBy,
    };
    return { value: updated, result: updated };
  });
}

export async function logAuditEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
  const logItem: AuditLogEntry = {
    ...entry,
    id: `aud_${nanoid(12)}`,
    timestamp: new Date().toISOString(),
  };
  try {
    await appendLog(AUDIT_STREAM, logItem);
  } catch (err) {
    log.error('Failed to append audit log:', err);
  }
}

export async function listAuditLogs(limit = 100): Promise<AuditLogEntry[]> {
  try {
    return await readLog<AuditLogEntry>(AUDIT_STREAM, { limit, newestFirst: true });
  } catch (err) {
    log.error('Failed to read audit logs:', err);
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
    readUsageRecords().then((records) => records.slice(-1000)),
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
