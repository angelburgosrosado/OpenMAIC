/**
 * Accounts are adults-only and require accepting the Terms + Privacy Policy;
 * the acceptance is recorded on the user.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/auth/register/route';
import { LEGAL_VERSION } from '@/lib/legal';
import { __resetAppStoreForTests } from '@/lib/server/app-store/json-store';
import { createUser, getUserByEmail } from '@/lib/server/auth/user-store';

let dir = '';
const savedDb = process.env.DATABASE_URL;

beforeEach(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'legal-'));
  process.env.APP_STORE_DIR = dir;
  delete process.env.DATABASE_URL;
  await __resetAppStoreForTests();
});

afterEach(async () => {
  await __resetAppStoreForTests();
  delete process.env.APP_STORE_DIR;
  if (savedDb) process.env.DATABASE_URL = savedDb;
  rmSync(dir, { recursive: true, force: true });
});

const register = (body: Record<string, unknown>) =>
  POST(
    new NextRequest('http://localhost/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'mom@example.com',
        password: 'pw-123456',
        name: 'Mom',
        ...body,
      }),
    }),
  );

describe('sign-up consent', () => {
  it('refuses sign-ups that do not confirm the account holder is an adult', async () => {
    const res = await register({ acceptTerms: true });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/18/);
    expect(await getUserByEmail('mom@example.com')).toBeFalsy();
  });

  it('refuses sign-ups that do not accept the terms', async () => {
    const res = await register({ adultConfirmed: true });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Terms/);
  });

  it('does not accept truthy strings in place of an explicit yes', async () => {
    const res = await register({ adultConfirmed: 'yes', acceptTerms: 'yes' });
    expect(res.status).toBe(400);
  });

  it('records the accepted terms version on the account', async () => {
    const u = await createUser(
      { email: 'dad@example.com', password: 'pw-123456', name: 'Dad' },
      { termsVersion: LEGAL_VERSION },
    );
    expect(u.termsVersion).toBe(LEGAL_VERSION);
    expect(u.termsAcceptedAt).toBeTruthy();
  });
});
