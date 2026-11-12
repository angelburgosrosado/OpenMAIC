/**
 * Scheduled sweep that deletes expired quiz-night rooms (see vercel.json's
 * `crons`). publicState already does opportunistic cleanup on every poll,
 * so this exists only to catch rooms nobody ever polls again (a host who
 * closes the tab mid-game, a code nobody joined) — without it, those
 * players' nicknames, answers and scores would sit in storage indefinitely
 * past the "deleted within 4 hours" promise in the privacy policy.
 *
 * Vercel Cron requests this with `Authorization: Bearer ${CRON_SECRET}`
 * when CRON_SECRET is set; without it set, the route runs unguarded (fine
 * for local/dev — the worst an outside caller can do is trigger an early,
 * harmless cleanup of already-expired ephemeral game data).
 */
import { NextRequest } from 'next/server';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { sweepExpiredRooms } from '@/lib/quiz/room';

const log = createLogger('Quiz Cleanup');

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return apiError('UNAUTHORIZED', 401, 'Unauthorized');
    }
  }
  try {
    const deleted = await sweepExpiredRooms();
    return apiSuccess({ deleted });
  } catch (err) {
    log.error('Quiz room sweep failed:', err);
    return apiError('UPSTREAM_ERROR', 500, 'Sweep failed');
  }
}
