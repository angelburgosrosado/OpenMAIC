/**
 * App data store for accounts, admin settings, audit logs, plans and usage.
 *
 * Two backends behind one small API:
 *  - PostgreSQL when `DATABASE_URL` is set (production on Vercel + Neon).
 *    Writes run in a transaction with `SELECT … FOR UPDATE`, so concurrent
 *    serverless instances cannot overwrite each other's changes.
 *  - Local JSON files under `data/` otherwise (local development and tests),
 *    at the same paths the file-based stores used before.
 *
 * Documents (`readDoc` / `updateDoc`) hold a whole JSON value per key, e.g.
 * `auth/users`. Logs (`appendLog` / `readLog`) are append-only streams, e.g.
 * `admin/audit-logs`.
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { Pool } from 'pg';
import { createLogger } from '@/lib/logger';

const log = createLogger('AppStore');

const KEY_RE = /^[a-z0-9][a-z0-9/_-]{0,120}$/;

function assertKey(key: string): void {
  if (!KEY_RE.test(key) || key.includes('..')) throw new Error(`Invalid store key: ${key}`);
}

/** Minimal pool shape (pg.Pool satisfies it); lets tests inject an in-memory Postgres. */
interface PoolLike {
  query<R = unknown>(text: string, params?: unknown[]): Promise<{ rows: R[] }>;
  connect(): Promise<ClientLike>;
}
interface ClientLike {
  query<R = unknown>(text: string, params?: unknown[]): Promise<{ rows: R[] }>;
  release(): void;
}

let injectedPool: PoolLike | null = null;

/** True when the Postgres backend is active. */
export function usingDatabase(): boolean {
  return Boolean(injectedPool || process.env.DATABASE_URL);
}

// ───────────────────────────── Postgres backend ─────────────────────────────

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

async function getPool(): Promise<PoolLike> {
  const active: PoolLike | null = injectedPool ?? (pool as unknown as PoolLike | null);
  if (active && schemaReady) {
    await schemaReady;
    return active;
  }
  if (!injectedPool && !pool) {
    const { Pool: PgPool } = await import('pg');
    pool = new PgPool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.APP_STORE_POOL_MAX || 3),
      idleTimeoutMillis: 10_000,
    });
    pool.on('error', (err) => log.warn('Idle database client error (ignored):', err));
  }
  const target: PoolLike = injectedPool ?? (pool as unknown as PoolLike);
  if (!schemaReady) {
    const p = target;
    schemaReady = (async () => {
      await p.query(`
        CREATE TABLE IF NOT EXISTS app_documents (
          key text PRIMARY KEY,
          value jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS app_logs (
          id bigserial PRIMARY KEY,
          stream text NOT NULL,
          data jsonb NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS app_logs_stream_id_idx ON app_logs (stream, id DESC);
      `);
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  await schemaReady;
  return target;
}

async function withClient<T>(fn: (c: ClientLike) => Promise<T>): Promise<T> {
  const p = await getPool();
  const client = await p.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

// ─────────────────────────────── File backend ───────────────────────────────

function fileRoot(): string {
  return process.env.APP_STORE_DIR || path.join(process.cwd(), 'data');
}

function docFile(key: string): string {
  return path.join(fileRoot(), `${key}.json`);
}

function logFile(stream: string): string {
  return path.join(fileRoot(), `${stream}.jsonl`);
}

const fileLocks = new Map<string, Promise<unknown>>();

async function withFileLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = fileLocks.get(key) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  fileLocks.set(
    key,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

async function readFileDoc<T>(key: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(docFile(key), 'utf-8')) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') log.error(`Failed to read ${key}:`, err);
    return fallback;
  }
}

async function writeFileDoc(key: string, value: unknown): Promise<void> {
  const file = docFile(key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), 'utf-8');
  await fs.rename(tmp, file);
}

// ──────────────────────────────── Public API ────────────────────────────────

/** Read a document, or `fallback` when it does not exist yet. */
export async function readDoc<T>(key: string, fallback: T): Promise<T> {
  assertKey(key);
  if (!usingDatabase()) return readFileDoc(key, fallback);
  const p = await getPool();
  const { rows } = await p.query<{ value: T }>('SELECT value FROM app_documents WHERE key = $1', [key]);
  return rows.length ? rows[0].value : fallback;
}

/**
 * Atomically read-modify-write a document. `fn` receives the current value
 * (or `fallback`) and returns the new value plus a result to hand back.
 * If `fn` throws, nothing is written.
 */
export async function updateDoc<T, R>(
  key: string,
  fallback: T,
  fn: (current: T) => Promise<{ value: T; result: R }> | { value: T; result: R },
): Promise<R> {
  assertKey(key);
  if (!usingDatabase()) {
    return withFileLock(`doc:${key}`, async () => {
      const current = await readFileDoc(key, fallback);
      const { value, result } = await fn(current);
      await writeFileDoc(key, value);
      return result;
    });
  }
  return withClient(async (c) => {
    await c.query('BEGIN');
    try {
      await c.query(
        'INSERT INTO app_documents (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO NOTHING',
        [key, JSON.stringify(fallback)],
      );
      const { rows } = await c.query<{ value: T }>(
        'SELECT value FROM app_documents WHERE key = $1 FOR UPDATE',
        [key],
      );
      const { value, result } = await fn(rows[0].value);
      await c.query('UPDATE app_documents SET value = $2::jsonb, updated_at = now() WHERE key = $1', [
        key,
        JSON.stringify(value),
      ]);
      await c.query('COMMIT');
      return result;
    } catch (err) {
      await c.query('ROLLBACK').catch(() => undefined);
      throw err;
    }
  });
}

/** Append one entry to a log stream. */
export async function appendLog(stream: string, data: unknown): Promise<void> {
  assertKey(stream);
  if (!usingDatabase()) {
    const file = logFile(stream);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.appendFile(file, JSON.stringify(data) + '\n', 'utf-8');
    return;
  }
  const p = await getPool();
  await p.query('INSERT INTO app_logs (stream, data) VALUES ($1, $2::jsonb)', [stream, JSON.stringify(data)]);
}

/**
 * Read a log stream. `newestFirst` with `limit` returns the most recent
 * entries; otherwise entries come back oldest first.
 */
export async function readLog<T>(
  stream: string,
  opts: { limit?: number; newestFirst?: boolean } = {},
): Promise<T[]> {
  assertKey(stream);
  const limit = opts.limit && opts.limit > 0 ? Math.floor(opts.limit) : undefined;
  if (!usingDatabase()) {
    let lines: string[];
    try {
      lines = (await fs.readFile(logFile(stream), 'utf-8')).split('\n').filter(Boolean);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') log.error(`Failed to read ${stream}:`, err);
      return [];
    }
    const parsed: T[] = [];
    for (const line of lines) {
      try {
        parsed.push(JSON.parse(line) as T);
      } catch {
        // skip a malformed line
      }
    }
    const ordered = opts.newestFirst ? parsed.reverse() : parsed;
    return limit ? ordered.slice(0, limit) : ordered;
  }
  const p = await getPool();
  const order = opts.newestFirst ? 'DESC' : 'ASC';
  const { rows } = await p.query<{ data: T }>(
    `SELECT data FROM app_logs WHERE stream = $1 ORDER BY id ${order}${limit ? ' LIMIT $2' : ''}`,
    limit ? [stream, limit] : [stream],
  );
  return rows.map((r) => r.data);
}

/** Test hooks: inject a pool (e.g. PGlite-backed) or reset all state. */
export function __setAppStorePoolForTests(p: PoolLike | null): void {
  injectedPool = p;
  schemaReady = null;
}

export async function __resetAppStoreForTests(): Promise<void> {
  const p = pool;
  pool = null;
  injectedPool = null;
  schemaReady = null;
  fileLocks.clear();
  if (p) await p.end().catch(() => undefined);
}
