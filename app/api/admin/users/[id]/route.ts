import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireAdmin } from '@/lib/server/auth/session';
import {
  getUserById,
  updateUser,
  deleteUser,
  stripSensitive,
  adjustUserTokenBalance,
} from '@/lib/server/auth/user-store';
import { hashPassword } from '@/lib/server/auth/crypto';
import { logAuditEvent } from '@/lib/server/admin/admin-store';
import type { UserRole, UserTier, UserStatus } from '@/lib/server/auth/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;
    const body = await req.json();

    const existing = await getUserById(id);
    if (!existing) {
      return apiError('NOT_FOUND', 404, 'User not found');
    }

    const updates: Record<string, unknown> = {};

    if (body.role && ['admin', 'user', 'creator'].includes(body.role)) {
      updates.role = body.role as UserRole;
    }
    if (body.tier && ['free', 'pro', 'enterprise'].includes(body.tier)) {
      updates.tier = body.tier as UserTier;
    }
    if (body.status && ['active', 'suspended', 'pending'].includes(body.status)) {
      updates.status = body.status as UserStatus;
    }
    if (typeof body.name === 'string' && body.name.trim()) {
      updates.name = body.name.trim();
    }
    if (typeof body.password === 'string' && body.password.length >= 6) {
      const { hash, salt } = hashPassword(body.password);
      updates.passwordHash = hash;
      updates.passwordSalt = salt;
    }

    // Handle token balance adjustment delta or absolute
    if (typeof body.tokenDelta === 'number' && body.tokenDelta !== 0) {
      await adjustUserTokenBalance(id, body.tokenDelta, false);
    } else if (typeof body.tokenBalance === 'number') {
      updates.tokenBalance = Math.max(0, body.tokenBalance);
    }

    const updated = await updateUser(id, updates);

    await logAuditEvent({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'UPDATE_USER',
      targetType: 'user',
      targetId: id,
      details: `Updated user ${existing.email}: ${JSON.stringify(body)}`,
    });

    return apiSuccess({
      user: stripSensitive(updated),
      message: 'User updated successfully',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Update failed';
    return apiError('INTERNAL_ERROR', 400, msg);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin(req);
    const { id } = await params;

    const existing = await getUserById(id);
    if (!existing) {
      return apiError('NOT_FOUND', 404, 'User not found');
    }

    await deleteUser(id);

    await logAuditEvent({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'DELETE_USER',
      targetType: 'user',
      targetId: id,
      details: `Deleted user ${existing.email} (${id})`,
    });

    return apiSuccess({ message: 'User deleted successfully' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Delete failed';
    return apiError('INTERNAL_ERROR', 400, msg);
  }
}
