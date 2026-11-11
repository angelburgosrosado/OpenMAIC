/**
 * Family quiz night — play (phones and the TV poll this; no AI calls).
 * GET  ?code=ABCD[&playerId=&playerKey=] → public game state
 * POST { action: 'join', code, name }                       → { playerId, playerKey }
 * POST { action: 'answer', code, playerId, playerKey, choice }
 * POST { action: 'start'|'reveal'|'next'|'again'|'end', code, hostKey }
 * Reachable without ACCESS_CODE so family phones can join with just the game code;
 * every write is authorised by the room's secret host/player keys.
 */
import { NextRequest } from 'next/server';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import {
  hostAction,
  joinRoom,
  publicState,
  QuizError,
  submitAnswer,
  type HostAction,
} from '@/lib/quiz/room';

const HOST_ACTIONS: HostAction[] = ['start', 'reveal', 'next', 'again', 'end'];

function fail(err: unknown) {
  if (err instanceof QuizError) {
    const code =
      err.status === 404 ? 'ASSET_NOT_FOUND' : err.status === 403 ? 'FORBIDDEN' : 'INVALID_REQUEST';
    return apiError(code, err.status, err.message);
  }
  return apiError('INTERNAL_ERROR', 500, 'Something went wrong');
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  try {
    const state = await publicState(sp.get('code') ?? '', {
      playerId: sp.get('playerId') ?? undefined,
      playerKey: sp.get('playerKey') ?? undefined,
    });
    return apiSuccess({ state: state as unknown as Record<string, unknown> });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(req: NextRequest) {
  let b: Record<string, unknown>;
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Body must be JSON');
  }
  const code = String(b.code ?? '');
  try {
    if (b.action === 'join') return apiSuccess(await joinRoom(code, String(b.name ?? '')));
    if (b.action === 'answer') {
      return apiSuccess(
        await submitAnswer(code, String(b.playerId ?? ''), String(b.playerKey ?? ''), b.choice),
      );
    }
    if (HOST_ACTIONS.includes(b.action as HostAction)) {
      await hostAction(code, String(b.hostKey ?? ''), b.action as HostAction);
      return apiSuccess({ ok: true });
    }
    return apiError('INVALID_REQUEST', 400, 'Unknown action');
  } catch (err) {
    return fail(err);
  }
}
