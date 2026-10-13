import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { requireAdmin } from '@/lib/server/auth/session';
import { listUsers, createUser, stripSensitive } from '@/lib/server/auth/user-store';
import { logAuditEvent } from '@/lib/server/admin/admin-store';
import type { UserRole, UserTier, UserStatus } from '@/lib/server/auth/types';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const url = req.nextUrl;
    const search = url.searchParams.get('search') || undefined;
    const role = (url.searchParams.get('role') as UserRole) || undefined;
    const tier = (url.searchParams.get('tier') as UserTier) || undefined;
    const status = (url.searchParams.get('status') as UserStatus) || undefined;
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);

    const result = await listUsers({ search, role, tier, status, page, pageSize });
    return apiSuccess(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Access denied';
    return apiError('UNAUTHORIZED', 403, msg);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();
    const { email, password, name, role, tier, initialTokens } = body;

    if (!email || !password) {
      return apiError('INVALID_REQUEST', 400, 'Email and password are required.');
    }

    const newUser = await createUser(
      { email, password, name },
      {
        role: role || 'user',
        tier: tier || 'free',
        initialTokens: typeof initialTokens === 'number' ? initialTokens : 250_000,
      },
    );

    await logAuditEvent({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'CREATE_USER',
      targetType: 'user',
      targetId: newUser.id,
      details: `Created user ${newUser.email} (${newUser.role}, ${newUser.tier})`,
    });

    return apiSuccess({
      user: stripSensitive(newUser),
      message: 'User created successfully.',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create user';
    return apiError('INTERNAL_ERROR', 400, msg);
  }
}
