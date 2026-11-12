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
import { GET as getMe } from '@/app/api/auth/me/route';
import { POST as acceptTerms } from '@/app/api/auth/accept-terms/route';
import { LEGAL_VERSION } from '@/lib/legal';
import { __resetAppStoreForTests } from '@/lib/server/app-store/json-store';
import { createUser, getUserByEmail } from '@/lib/server/auth/user-store';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/server/auth/session';

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

/**
 * When LEGAL_VERSION bumps, existing accounts that accepted an older (or no)
 * version need to find out — GET /api/auth/me flags it, and accepting
 * clears the flag by stamping the current version.
 */
describe('terms-update re-consent notice', () => {
  const authedRequest = (url: string, token: string, init?: { method?: string }) =>
    new NextRequest(url, {
      method: init?.method,
      headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
    });

  it('flags an account on an older terms version as needing reconsent', async () => {
    const u = await createUser(
      { email: 'grandma@example.com', password: 'pw-123456', name: 'Grandma' },
      { termsVersion: '2020-01-01' },
    );
    const token = createSessionToken(u.id);

    const res = await getMe(authedRequest('http://localhost/api/auth/me', token));
    const body = await res.json();
    expect(body.needsTermsReconsent).toBe(true);
  });

  it('flags an account with no recorded terms version at all', async () => {
    const u = await createUser({ email: 'grandpa@example.com', password: 'pw-123456', name: 'Grandpa' });
    const token = createSessionToken(u.id);

    const res = await getMe(authedRequest('http://localhost/api/auth/me', token));
    expect((await res.json()).needsTermsReconsent).toBe(true);
  });

  it('does not flag an account already on the current version', async () => {
    const u = await createUser(
      { email: 'uncle@example.com', password: 'pw-123456', name: 'Uncle' },
      { termsVersion: LEGAL_VERSION },
    );
    const token = createSessionToken(u.id);

    const res = await getMe(authedRequest('http://localhost/api/auth/me', token));
    expect((await res.json()).needsTermsReconsent).toBe(false);
  });

  it('accepting the updated terms stamps the current version and clears the flag', async () => {
    const u = await createUser(
      { email: 'auntie@example.com', password: 'pw-123456', name: 'Auntie' },
      { termsVersion: '2020-01-01' },
    );
    const token = createSessionToken(u.id);

    const acceptRes = await acceptTerms(
      authedRequest('http://localhost/api/auth/accept-terms', token, { method: 'POST' }),
    );
    expect(acceptRes.status).toBe(200);
    const acceptBody = await acceptRes.json();
    expect(acceptBody.user.termsVersion).toBe(LEGAL_VERSION);
    expect(acceptBody.user.termsAcceptedAt).toBeTruthy();

    const meRes = await getMe(authedRequest('http://localhost/api/auth/me', token));
    expect((await meRes.json()).needsTermsReconsent).toBe(false);
  });

  it('refuses to record acceptance for an unauthenticated request', async () => {
    const res = await acceptTerms(
      new NextRequest('http://localhost/api/auth/accept-terms', { method: 'POST' }),
    );
    expect(res.status).toBe(401);
  });
});
