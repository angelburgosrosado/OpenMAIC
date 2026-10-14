import { resolvePrincipal } from '@/lib/server/auth/authorization';
import { resolveRequestOwnerId } from './owner';

/**
 * Resolve the owner identity (authenticated or anonymous) and run a handler
 * with its response headers.
 *
 * If a valid server session exists, ownerId is bound to the verified userId.
 * Otherwise, falls back to the anonymous cookie identity.
 */
export async function withRequestOwnerId(
  req: Pick<Request, 'headers'>,
  handler: (ownerId: string, responseHeaders: Headers) => Promise<Response>,
): Promise<Response> {
  const responseHeaders = new Headers();
  let authenticatedUserId: string | undefined;
  try {
    const principal = await resolvePrincipal(req as Request);
    if (principal && !principal.isAnonymousDev) {
      authenticatedUserId = principal.userId;
    }
  } catch {
    // Continue with anonymous fallback if unauthenticated
  }

  const ownerId = resolveRequestOwnerId(req, responseHeaders, authenticatedUserId);
  try {
    return await handler(ownerId, responseHeaders);
  } catch (error) {
    console.error('[agent-runtime] request failed under an owner', error);
    return new Response('Internal Server Error', { status: 500, headers: responseHeaders });
  }
}
