import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { createUser, stripSensitive } from '@/lib/server/auth/user-store';
import { setSessionCookie } from '@/lib/server/auth/session';
import { getAppSettings } from '@/lib/server/admin/admin-store';
import { redeemPromoCode } from '@/lib/server/monetization/monetization-store';
import { LEGAL_VERSION } from '@/lib/legal';

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
    const { email, password, name, promoCode, adultConfirmed, acceptTerms } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return apiError('INVALID_REQUEST', 400, 'A valid email address is required.');
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return apiError('INVALID_REQUEST', 400, 'Password must be at least 6 characters long.');
    }

    // Accounts are for adults only (parents, guardians, teachers, adult learners).
    // Children use QuéWhat through a grown-up's account and never sign up themselves.
    if (adultConfirmed !== true) {
      return apiError(
        'INVALID_REQUEST',
        400,
        'Accounts are for adults 18 or older. Kids can learn with a parent or guardian’s account.',
      );
    }
    if (acceptTerms !== true) {
      return apiError(
        'INVALID_REQUEST',
        400,
        'Please accept the Terms of Service and Privacy Policy.',
      );
    }

    const user = await createUser(
      {
        email,
        password,
        name: name || email.split('@')[0],
      },
      {
        initialTokens: settings.defaultTokensOnSignup,
        termsVersion: LEGAL_VERSION,
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
      message: 'Registration successful! Welcome to QuéWhat.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Registration failed';
    return apiError('INTERNAL_ERROR', 400, msg);
  }
}
