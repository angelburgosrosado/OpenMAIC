import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireAuth } from '@/lib/server/auth/session';
import { updateUser, stripSensitive } from '@/lib/server/auth/user-store';
import { LEGAL_VERSION } from '@/lib/legal';

/**
 * Records that the signed-in user has reviewed the current Terms of Service
 * and Privacy Policy (LEGAL_VERSION). Called when the user dismisses the
 * terms-update notice shown after we bump LEGAL_VERSION — see
 * `needsTermsReconsent` on GET /api/auth/me.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const updated = await updateUser(user.id, {
      termsVersion: LEGAL_VERSION,
      termsAcceptedAt: new Date().toISOString(),
    });

    return apiSuccess({ user: stripSensitive(updated) });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to record terms acceptance';
    return apiError('UNAUTHORIZED', 401, msg);
  }
}
