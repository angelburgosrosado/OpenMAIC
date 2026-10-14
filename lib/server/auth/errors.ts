import { NextResponse } from 'next/server';

export type AuthErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'RESOURCE_NOT_FOUND'
  | 'TENANT_MISMATCH';

export class AuthError extends Error {
  constructor(
    readonly code: AuthErrorCode,
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export function unauthenticated(message = 'Authentication required'): AuthError {
  return new AuthError('UNAUTHENTICATED', 401, message);
}

export function forbidden(message = 'Access denied: insufficient permissions'): AuthError {
  return new AuthError('FORBIDDEN', 403, message);
}

export function resourceNotFound(message = 'Resource not found'): AuthError {
  return new AuthError('RESOURCE_NOT_FOUND', 404, message);
}

export function authErrorResponse(err: unknown, customHeaders?: Headers): Response {
  const headers = customHeaders ?? new Headers();
  if (err instanceof AuthError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message } },
      { status: err.statusCode, headers },
    );
  }

  const message = err instanceof Error ? err.message : 'Internal authorization failure';
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message } },
    { status: 500, headers },
  );
}
