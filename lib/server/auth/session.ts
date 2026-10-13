import { cookies, headers } from 'next/headers';
import type { NextRequest } from 'next/server';
import { signPayload, verifySignedPayload } from './crypto';
import { getUserById, getUserByApiKey, stripSensitive } from './user-store';
import type { SafeUser, User } from './types';

export const SESSION_COOKIE_NAME = 'openmaic_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * Creates a signed session token encoding the user ID and timestamp
 */
export function createSessionToken(userId: string): string {
  const timestamp = Date.now().toString(36);
  return signPayload(`${userId}:${timestamp}`);
}

/**
 * Extracts and verifies the userId from a signed session token
 */
export function parseSessionToken(token: string): string | null {
  const payload = verifySignedPayload(token);
  if (!payload) return null;
  const [userId] = payload.split(':');
  return userId || null;
}

/**
 * Set session cookie in Next.js
 */
export async function setSessionCookie(userId: string): Promise<string> {
  const token = createSessionToken(userId);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  });
  return token;
}

/**
 * Clear session cookie
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Resolves the currently authenticated user from either:
 * 1. `openmaic_session` HTTP-only cookie
 * 2. `Authorization: Bearer <apiKey>` header
 * 3. In development/fallback without sessions: can fallback if ACCESS_CODE matched
 */
export async function getCurrentUser(req?: NextRequest): Promise<User | null> {
  // 1. Check Authorization header
  let authHeader: string | null = null;
  if (req) {
    authHeader = req.headers.get('authorization');
  } else {
    try {
      const headerStore = await headers();
      authHeader = headerStore.get('authorization');
    } catch {
      // Not in request context
    }
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    // Check if it's an API key (om_live_...)
    if (token.startsWith('om_live_')) {
      const userByKey = await getUserByApiKey(token);
      if (userByKey) return userByKey;
    }
    // Check if it's a bearer session token
    const userId = parseSessionToken(token);
    if (userId) {
      const user = await getUserById(userId);
      if (user && user.status === 'active') return user;
    }
  }

  // 2. Check session cookie
  let cookieToken: string | undefined;
  if (req) {
    cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  } else {
    try {
      const cookieStore = await cookies();
      cookieToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // cookies() unavailable
    }
  }

  if (cookieToken) {
    const userId = parseSessionToken(cookieToken);
    if (userId) {
      const user = await getUserById(userId);
      if (user && user.status === 'active') return user;
    }
  }

  return null;
}

export async function getCurrentSafeUser(req?: NextRequest): Promise<SafeUser | null> {
  const user = await getCurrentUser(req);
  return user ? stripSensitive(user) : null;
}

export async function requireAuth(req?: NextRequest): Promise<User> {
  const user = await getCurrentUser(req);
  if (!user) {
    throw new Error('Authentication required');
  }
  if (user.status === 'suspended') {
    throw new Error('Your account has been suspended. Please contact support.');
  }
  return user;
}

export async function requireAdmin(req?: NextRequest): Promise<User> {
  const user = await requireAuth(req);
  if (user.role !== 'admin') {
    throw new Error('Administrative privileges required');
  }
  return user;
}
