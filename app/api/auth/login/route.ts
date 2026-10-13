import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { getUserByEmail, stripSensitive, updateUser } from '@/lib/server/auth/user-store';
import { verifyPassword } from '@/lib/server/auth/crypto';
import { setSessionCookie } from '@/lib/server/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return apiError('INVALID_REQUEST', 400, 'Email and password are required.');
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return apiError('UNAUTHORIZED', 401, 'Invalid email or password.');
    }

    if (user.status === 'suspended') {
      return apiError(
        'FORBIDDEN',
        403,
        'Your account has been suspended by an administrator. Please reach out to support.',
      );
    }

    const isValid = verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (!isValid) {
      return apiError('UNAUTHORIZED', 401, 'Invalid email or password.');
    }

    // Update last login timestamp
    await updateUser(user.id, {
      lastLoginAt: new Date().toISOString(),
    });

    // Set session cookie
    await setSessionCookie(user.id);

    return apiSuccess({
      user: stripSensitive(user),
      message: 'Signed in successfully.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Login failed';
    return apiError('INTERNAL_ERROR', 500, msg);
  }
}
