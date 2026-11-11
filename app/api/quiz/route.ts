/**
 * Family quiz night — create a game (the TV calls this).
 * POST { topic, level, count } → { code, hostKey, topic, total }
 * Uses the server's model (stage `quiz-night`), so it needs a signed-in user or
 * the ACCESS_CODE gate. Playing (join/answer/state) is in /api/quiz/play.
 */
import { NextRequest } from 'next/server';
import { callLLM } from '@/lib/ai/llm';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { resolvePrincipal } from '@/lib/server/auth/authorization';
import { resolveModel } from '@/lib/server/resolve-model';
import { isLevelId } from '@/lib/homework/lesson';
import { buildQuizPrompt, createRoom, parseQuizReply } from '@/lib/quiz/room';

const log = createLogger('Quiz Night');
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const principal = await resolvePrincipal(req);
  if (!principal && !process.env.ACCESS_CODE) {
    return apiError('UNAUTHENTICATED', 401, 'Sign in to start a game');
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Body must be JSON');
  }
  const topic = typeof body.topic === 'string' ? body.topic.trim().slice(0, 80) : '';
  if (!topic) return apiError('MISSING_REQUIRED_FIELD', 400, 'Pick a topic');
  const level = isLevelId(body.level) ? body.level : 'g35';
  const count = Math.min(10, Math.max(3, Number(body.count) || 5));

  try {
    const { model } = await resolveModel({ stage: 'quiz-night' });
    const { system, prompt } = buildQuizPrompt(topic, level, count);
    const result = await callLLM({ model, system, prompt, maxOutputTokens: 5000 }, 'quiz-night');
    const parsed = parseQuizReply(result.text, topic);
    if (!parsed)
      return apiError(
        'PARSE_FAILED',
        502,
        'Could not write questions this time. Please try again.',
      );
    const { code, hostKey } = await createRoom({
      topic: parsed.topic,
      level,
      questions: parsed.questions,
    });
    return apiSuccess({ code, hostKey, topic: parsed.topic, total: parsed.questions.length });
  } catch (error) {
    log.error('Quiz creation failed:', error);
    return apiError('INTERNAL_ERROR', 500, 'Something went wrong. Please try again.');
  }
}
