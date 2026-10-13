import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createUser, stripSensitive } from '@/lib/server/auth/user-store';
import { setSessionCookie } from '@/lib/server/auth/session';
import { getAppSettings } from '@/lib/server/admin/admin-store';
import { redeemPromoCode } from '@/lib/server/monetization/monetization-store';

export async function POST(req: NextRequest) {
  try {
    const settings = await getAppSettings();
    if (!settings.allowRegistrations) {
      return apiError(
        'FORBIDDEN',
        403,
        'New user registrations are currently disabled by the administrator.',
      );
    }

    const body = await req.json();
    const { email, password, name, promoCode } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return apiError('INVALID_REQUEST', 400, 'A valid email address is required.');
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return apiError('INVALID_REQUEST', 400, 'Password must be at least 6 characters long.');
    }

    const user = await createUser(
      {
        email,
        password,
        name: name || email.split('@')[0],
      },
      {
        initialTokens: settings.defaultTokensOnSignup,
      },
    );

    // If promo code provided at signup, auto-redeem it
    if (promoCode && typeof promoCode === 'string' && promoCode.trim()) {
      try {
        await redeemPromoCode(user.id, promoCode.trim());
      } catch {
        // Continue even if promo code failed so user is still registered
      }
    }

    // Set authentication session cookie
    await setSessionCookie(user.id);

    return apiSuccess({
      user: stripSensitive(user),
      message: 'Registration successful! Welcome to OpenMAIC.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Registration failed';
    return apiError('INTERNAL_ERROR', 400, msg);
  }
}
