import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireAuth } from '@/lib/server/auth/session';
import { updateUser, stripSensitive } from '@/lib/server/auth/user-store';

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const { name, avatar, bio } = body;

    const updates: Record<string, string> = {};
    if (typeof name === 'string' && name.trim()) updates.name = name.trim();
    if (typeof avatar === 'string' && avatar.trim()) updates.avatar = avatar.trim();
    if (typeof bio === 'string') updates.bio = bio.trim();

    const updated = await updateUser(user.id, updates);

    return apiSuccess({
      user: stripSensitive(updated),
      message: 'Profile updated successfully.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update profile';
    return apiError('UNAUTHORIZED', 401, msg);
  }
}
