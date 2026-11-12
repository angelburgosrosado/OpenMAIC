/**
 * App store on a real (in-memory) PostgreSQL via PGlite: documents, logs,
 * transactional updates under concurrency, and the account rules that ride on
 * it (no default admin in production, ADMIN_EMAIL promotion, signing secret).
 */
import { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  __resetAppStoreForTests,
  __setAppStorePoolForTests,
  appendLog,
  deleteDoc,
  listDocKeys,
  readDoc,
  readLog,
  updateDoc,
  usingDatabase,
} from '@/lib/server/app-store/json-store';

/** pg-style pool over one PGlite instance; connect() hands out one client at a time. */
function pgliteAdapter(db: PGlite) {
  const run = async (text: string, params?: unknown[]) => {
    if (params && params.length) return db.query(text, params as never[]);
    const res = await db.exec(text);
    return { rows: res.length ? res[res.length - 1].rows : [] };
  };
  let chain: Promise<void> = Promise.resolve();
  return {
    query: <R>(text: string, params?: unknown[]) => chain.then(() => run(text, params)) as Promise<{ rows: R[] }>,
    connect: async () => {
      let release!: () => void;
      const held = new Promise<void>((r) => (release = r));
      const prev = chain;
      chain = prev.then(() => held);
      await prev;
      return {
        query: <R>(text: string, params?: unknown[]) => run(text, params) as Promise<{ rows: R[] }>,
        release,
      };
    },
  };
}

const ENV_KEYS = ['VERCEL', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'AUTH_SECRET', 'ACCESS_CODE'] as const;
let savedEnv: Record<string, string | undefined>;

beforeEach(async () => {
  savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  await __resetAppStoreForTests();
  __setAppStorePoolForTests(pgliteAdapter(new PGlite()));
});

afterEach(async () => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  await __resetAppStoreForTests();
});

describe('app store on PostgreSQL', () => {
  it('uses the database backend when a pool is configured', () => {
    expect(usingDatabase()).toBe(true);
  });

  it('reads a fallback, then the written document', async () => {
    expect(await readDoc('t/doc', { n: 0 })).toEqual({ n: 0 });
    const r = await updateDoc('t/doc', { n: 0 }, (cur) => ({ value: { n: cur.n + 5 }, result: 'ok' }));
    expect(r).toBe('ok');
    expect(await readDoc('t/doc', { n: 0 })).toEqual({ n: 5 });
  });

  it('writes nothing when the update throws', async () => {
    await updateDoc('t/doc', { n: 1 }, () => ({ value: { n: 1 }, result: null }));
    await expect(
      updateDoc('t/doc', { n: 0 }, () => {
        throw new Error('nope');
      }),
    ).rejects.toThrow('nope');
    expect(await readDoc('t/doc', { n: 0 })).toEqual({ n: 1 });
  });

  it('serialises concurrent updates without losing any', async () => {
    await Promise.all(
      Array.from({ length: 20 }, () =>
        updateDoc('t/counter', 0, async (cur) => {
          await new Promise((r) => setTimeout(r, 1));
          return { value: cur + 1, result: null };
        }),
      ),
    );
    expect(await readDoc('t/counter', 0)).toBe(20);
  });

  it('appends and reads logs in either order', async () => {
    for (let i = 1; i <= 5; i++) await appendLog('t/log', { i });
    expect((await readLog<{ i: number }>('t/log')).map((r) => r.i)).toEqual([1, 2, 3, 4, 5]);
    expect((await readLog<{ i: number }>('t/log', { limit: 2, newestFirst: true })).map((r) => r.i)).toEqual([5, 4]);
  });

  it('rejects unsafe keys', async () => {
    await expect(readDoc('../etc/passwd', null)).rejects.toThrow('Invalid store key');
  });

  it('deletes a document, and is a no-op when it does not exist', async () => {
    await updateDoc('t/gone', { n: 0 }, () => ({ value: { n: 1 }, result: null }));
    expect(await readDoc('t/gone', { n: 0 })).toEqual({ n: 1 });
    await deleteDoc('t/gone');
    expect(await readDoc('t/gone', { n: 0 })).toEqual({ n: 0 });
    await expect(deleteDoc('t/gone')).resolves.toBeUndefined();
  });

  it('lists document keys under a prefix', async () => {
    await updateDoc('t/list/a', null, () => ({ value: { n: 1 }, result: null }));
    await updateDoc('t/list/b', null, () => ({ value: { n: 2 }, result: null }));
    await updateDoc('t/other/c', null, () => ({ value: { n: 3 }, result: null }));
    const keys = (await listDocKeys('t/list/')).sort();
    expect(keys).toEqual(['t/list/a', 't/list/b']);
  });
});

describe('accounts on PostgreSQL', () => {
  it('creates and finds users in the database', async () => {
    const { createUser, getUserByEmail } = await import('@/lib/server/auth/user-store');
    const u = await createUser({ email: 'Mom@Example.com', password: 'pw-123456', name: 'Mom' });
    expect((await getUserByEmail('mom@example.com'))?.id).toBe(u.id);
    expect(u.role).toBe('user');
  });

  it('never seeds a default admin password in production', async () => {
    process.env.VERCEL = '1';
    const { ensureDefaultAdmin, listUsers } = await import('@/lib/server/auth/user-store');
    expect(await ensureDefaultAdmin()).toBeNull();
    expect((await listUsers()).total).toBe(0);
  });

  it('makes the first ADMIN_EMAIL sign-up the administrator, once', async () => {
    process.env.VERCEL = '1';
    process.env.ADMIN_EMAIL = 'owner@example.com';
    const { createUser } = await import('@/lib/server/auth/user-store');
    const owner = await createUser({ email: 'Owner@Example.com', password: 'pw-123456', name: 'Owner' });
    expect(owner.role).toBe('admin');
    expect(owner.tier).toBe('enterprise');
    const other = await createUser({ email: 'kid@example.com', password: 'pw-123456', name: 'Kid' });
    expect(other.role).toBe('user');
  });

  it('rejects a duplicate email', async () => {
    const { createUser } = await import('@/lib/server/auth/user-store');
    await createUser({ email: 'a@example.com', password: 'pw-123456', name: 'A' });
    await expect(createUser({ email: 'A@example.com', password: 'pw-123456', name: 'A2' })).rejects.toThrow(
      'already exists',
    );
  });
});

describe('session signing secret', () => {
  it('requires AUTH_SECRET in production and ignores ACCESS_CODE', async () => {
    process.env.VERCEL = '1';
    process.env.ACCESS_CODE = 'shared-with-testers';
    const { getAuthSecret } = await import('@/lib/server/auth/crypto');
    expect(() => getAuthSecret()).toThrow('AUTH_SECRET');
    process.env.AUTH_SECRET = 'x'.repeat(40);
    expect(getAuthSecret()).toBe('x'.repeat(40));
  });

  it('expires session tokens after 30 days', async () => {
    process.env.AUTH_SECRET = 'y'.repeat(40);
    const { signPayload } = await import('@/lib/server/auth/crypto');
    const { parseSessionToken } = await import('@/lib/server/auth/session');
    const fresh = signPayload(`usr_1:${Date.now().toString(36)}`);
    const old = signPayload(`usr_1:${(Date.now() - 31 * 86_400_000).toString(36)}`);
    expect(parseSessionToken(fresh)).toBe('usr_1');
    expect(parseSessionToken(old)).toBeNull();
  });
});
