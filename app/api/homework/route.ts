/**
 * Homework helper API.
 *
 * POST { action: 'lesson', text?, image?, level, guide }
 *   → { lesson } — a bilingual step-by-step lesson, parent tips and a 3-question check.
 * POST { action: 'another', level, problem, concept, board, say, question? }
 *   → { text: { en, es } } — re-explain one step another way, or answer a question about it.
 *
 * Runs on the server's configured model (DEFAULT_MODEL, or a MODEL_ROUTES entry for
 * the `homework-helper` stage), so families never need their own AI account.
 * Access: a signed-in user, or — while the site is gated by ACCESS_CODE — anyone
 * who passed the access-code check in middleware.
 */

import { NextRequest } from 'next/server';
import { callLLM } from '@/lib/ai/llm';
import { createLogger } from '@/lib/logger';
import { apiError, apiSuccess } from '@/lib/server/api-response';
import { resolvePrincipal } from '@/lib/server/auth/authorization';
import { resolveModel } from '@/lib/server/resolve-model';
import {
  MAX_PROBLEM_CHARS,
  MAX_QUESTION_CHARS,
  bi,
  buildAnotherWayPrompt,
  buildLessonPrompt,
  extractJson,
  isLevelId,
  normalizeLesson,
  parseImageDataUrl,
} from '@/lib/homework/lesson';

const log = createLogger('Homework Helper');

export const maxDuration = 120;

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export async function POST(req: NextRequest) {
  const principal = await resolvePrincipal(req);
  if (!principal && !process.env.ACCESS_CODE) {
    return apiError('UNAUTHENTICATED', 401, 'Sign in to use the homework helper');
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return apiError('INVALID_REQUEST', 400, 'Body must be JSON');
  }

  const level = isLevelId(body.level) ? body.level : 'g35';

  try {
    const { model } = await resolveModel({ stage: 'homework-helper' });

    if (body.action === 'another') {
      const problem = str(body.problem, MAX_PROBLEM_CHARS);
      const boardLine = str(body.board, 200);
      const say = str(body.say, 800);
      if (!problem || (!boardLine && !say)) {
        return apiError('MISSING_REQUIRED_FIELD', 400, 'problem and the current step are required');
      }
      const { system, prompt } = buildAnotherWayPrompt({
        level,
        problem,
        concept: str(body.concept, 200),
        board: boardLine,
        say,
        question: str(body.question, MAX_QUESTION_CHARS) || undefined,
      });
      const result = await callLLM({ model, system, prompt, maxOutputTokens: 600 }, 'homework-helper');
      const parsed = extractJson(result.text);
      const text = bi(parsed);
      if (!text.en) return apiError('GENERATION_FAILED', 502, 'Could not explain this step');
      return apiSuccess({ text });
    }

    // Default action: build a lesson.
    const text = str(body.text, MAX_PROBLEM_CHARS);
    const image = body.image != null ? parseImageDataUrl(body.image) : null;
    if (body.image != null && !image) {
      return apiError('INVALID_REQUEST', 400, 'Photo must be a PNG, JPEG, WebP or GIF under 3 MB');
    }
    if (!text && !image) {
      return apiError('MISSING_REQUIRED_FIELD', 400, 'Type the question or add a photo');
    }

    const { system, prompt } = buildLessonPrompt({
      text,
      hasImage: !!image,
      level,
      guide: body.guide !== false,
    });

    const result = await callLLM(
      image
        ? {
            model,
            system,
            maxOutputTokens: 6000,
            messages: [
              {
                role: 'user' as const,
                content: [
                  { type: 'image' as const, image: image.base64, mediaType: image.mediaType },
                  { type: 'text' as const, text: prompt },
                ],
              },
            ],
          }
        : { model, system, prompt, maxOutputTokens: 6000 },
      'homework-helper',
    );

    const lesson = normalizeLesson(extractJson(result.text));
    if (!lesson) {
      log.warn('Lesson reply could not be parsed');
      return apiError('PARSE_FAILED', 502, 'Could not build a lesson this time. Please try again.');
    }
    if (!lesson.ok) return apiSuccess({ refused: lesson.reason });
    return apiSuccess({ lesson: lesson.lesson });
  } catch (error) {
    log.error('Homework helper failed:', error);
    return apiError('INTERNAL_ERROR', 500, 'Something went wrong. Please try again.');
  }
}
