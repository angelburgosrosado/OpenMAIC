/**
 * Homework helper — shared lesson types, prompts and response normalisation.
 *
 * Pure functions (no I/O) so the API route and tests share one source of truth.
 * Every learner-facing string is bilingual ({ en, es }) so the page can switch
 * language instantly without another model call.
 */

export interface Bi {
  en: string;
  es: string;
}

export interface LessonStep {
  board: Bi;
  say: Bi;
  yourTurn: { q: Bi; a: Bi } | null;
}

export interface CheckQuestion {
  q: Bi;
  options: Bi[];
  correct: number;
  why: Bi;
}

export interface HomeworkLesson {
  subject: Bi;
  concept: Bi;
  goal: Bi;
  problem: Bi;
  steps: LessonStep[];
  answer: Bi;
  parents: { tips: Bi[]; mistake: Bi };
  check: CheckQuestion[];
}

export type LessonResult = { ok: true; lesson: HomeworkLesson } | { ok: false; reason: Bi };

export const LEVELS = {
  k2: 'a young child age 5-7 (kindergarten-2nd grade); very simple words and short sentences',
  g35: 'a child age 8-10 (3rd-5th grade)',
  g68: 'a student age 11-13 (6th-8th grade)',
  hs: 'a high school student age 14-18',
  parent:
    'a parent who wants a quick refresher so they can help their child; explain the method and how schools teach it today',
} as const;

export type LevelId = keyof typeof LEVELS;

export function isLevelId(v: unknown): v is LevelId {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(LEVELS, v);
}

export const MAX_PROBLEM_CHARS = 1500;
export const MAX_QUESTION_CHARS = 200;

export function buildLessonPrompt(opts: {
  text: string;
  hasImage: boolean;
  level: LevelId;
  guide: boolean;
}): { system: string; prompt: string } {
  const system = `You are Profe Luna, the AI teacher in QuéWhat, a bilingual (English + Spanish) homework helper that families use together. You teach concepts so children can do the work themselves; you are warm, accurate and age-appropriate. You reply with JSON only.`;
  const prompt = `Learner: ${LEVELS[opts.level]}.
${opts.hasImage ? 'The attached photo shows the homework page. Read the problem from it (if several problems are visible, use the first one, or the one the text below points to).' : ''}
Homework question typed by the family: ${opts.text ? JSON.stringify(opts.text) : '(none — use the photo)'}

Teach the CONCEPT behind this problem so the child can do it themselves. Rules:
- Solve the actual problem in 3 to 6 small steps. Each step: a short "board" line written like on a chalkboard (math, a key word or a mini example, at most 60 characters) and "say": 1-3 short, warm sentences that explain WHY, in words this learner understands. Use everyday examples (pizza, money, sports, cooking, Puerto Rico/Florida life) when they help.
- In about half the steps add "yourTurn": a tiny question the child answers before moving on, with its short answer. Otherwise null.
- "answer": the final answer with units, one sentence.
- "parents": 2 short tips for a grown-up helping (how to coach without giving the answer), and 1 common mistake to watch for.
- "check": exactly 3 NEW multiple-choice questions on the same skill (not this exact problem), 4 options each, one correct, with a one-sentence "why".
- Everything must be correct, age-appropriate and encouraging.${opts.guide ? ' The family chose guide mode: the final step should lead right up to the answer and let the child finish it.' : ''}
- Every human-readable field has "en" and "es". Spanish must be natural Latin American Spanish (Puerto Rico friendly), not a word-for-word translation. Math notation can be the same in both.
- If there is no readable school problem, or it is not appropriate for a child, return only {"error":{"en":"…","es":"…"}} with a kind one-sentence reason.

Return ONLY this JSON:
{"subject":{"en":"","es":""},"concept":{"en":"","es":""},"goal":{"en":"","es":""},"problem":{"en":"","es":""},
"steps":[{"board":{"en":"","es":""},"say":{"en":"","es":""},"yourTurn":{"q":{"en":"","es":""},"a":{"en":"","es":""}}}],
"answer":{"en":"","es":""},
"parents":{"tips":[{"en":"","es":""},{"en":"","es":""}],"mistake":{"en":"","es":""}},
"check":[{"q":{"en":"","es":""},"options":[{"en":"","es":""},{"en":"","es":""},{"en":"","es":""},{"en":"","es":""}],"correct":0,"why":{"en":"","es":""}}]}`;
  return { system, prompt };
}

export function buildAnotherWayPrompt(opts: {
  level: LevelId;
  problem: string;
  concept: string;
  board: string;
  say: string;
  question?: string;
}): { system: string; prompt: string } {
  const system = `You are Profe Luna, a warm bilingual teacher in the QuéWhat homework helper. You reply with JSON only.`;
  const ask = opts.question
    ? `They asked: ${JSON.stringify(opts.question)}. Answer that question about this step.`
    : `They said: "I don't get it." Explain this same step a DIFFERENT way: simpler words and one everyday comparison or picture-in-words.`;
  const prompt = `Learner: ${LEVELS[opts.level]}.
Problem: ${opts.problem}
Concept: ${opts.concept}
The learner is on this step: board ${JSON.stringify(opts.board)} — explanation ${JSON.stringify(opts.say)}.
${ask}
At most 3 short sentences. Do not jump ahead to the final answer. Be encouraging. If the question is off-topic or not appropriate for a child, gently steer back to the step.
Return ONLY JSON: {"en":"…","es":"…"} (natural Latin American Spanish for "es").`;
  return { system, prompt };
}

/** Pull the first JSON object out of a model reply (tolerates code fences and stray prose). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

const MAX_FIELD = 600;

export function bi(o: unknown): Bi {
  if (o == null) return { en: '', es: '' };
  if (typeof o === 'string') return { en: o.slice(0, MAX_FIELD), es: o.slice(0, MAX_FIELD) };
  if (typeof o === 'object') {
    const r = o as Record<string, unknown>;
    const en = String(r.en ?? r.es ?? '').slice(0, MAX_FIELD);
    const es = String(r.es ?? r.en ?? '').slice(0, MAX_FIELD);
    return { en, es };
  }
  return { en: '', es: '' };
}

/**
 * Validate and normalise a model reply into a lesson. Check-question options
 * are shuffled (with `random`) so the right answer is not always in one spot.
 */
export function normalizeLesson(raw: unknown, random: () => number = Math.random): LessonResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (d.error) return { ok: false, reason: bi(d.error) };

  const steps: LessonStep[] = (Array.isArray(d.steps) ? d.steps : [])
    .slice(0, 8)
    .map((s: unknown) => {
      const st = (s ?? {}) as Record<string, unknown>;
      const yt = st.yourTurn as Record<string, unknown> | null | undefined;
      return {
        board: bi(st.board),
        say: bi(st.say),
        yourTurn: yt && yt.q ? { q: bi(yt.q), a: bi(yt.a) } : null,
      };
    })
    .filter((s) => s.say.en || s.board.en);
  if (!steps.length) return null;

  const check: CheckQuestion[] = (Array.isArray(d.check) ? d.check : [])
    .filter((q: unknown) => {
      const c = q as Record<string, unknown>;
      const correct = Number(c?.correct);
      return Array.isArray(c?.options) && c.options.length === 4 && correct >= 0 && correct < 4;
    })
    .slice(0, 3)
    .map((q: unknown) => {
      const c = q as Record<string, unknown>;
      const correct = Number(c.correct);
      const order = shuffle([0, 1, 2, 3], random);
      const options = (c.options as unknown[]).map(bi);
      return {
        q: bi(c.q),
        options: order.map((i) => options[i]),
        correct: order.indexOf(correct),
        why: bi(c.why),
      };
    });

  const p = (d.parents ?? {}) as Record<string, unknown>;
  return {
    ok: true,
    lesson: {
      subject: bi(d.subject),
      concept: bi(d.concept),
      goal: bi(d.goal),
      problem: bi(d.problem),
      steps,
      answer: bi(d.answer),
      parents: {
        tips: (Array.isArray(p.tips) ? p.tips : []).slice(0, 3).map(bi),
        mistake: bi(p.mistake),
      },
      check,
    },
  };
}

function shuffle<T>(arr: T[], random: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Accepts `data:image/(png|jpeg|webp|gif);base64,...` up to ~4 MB of base64. */
export const MAX_IMAGE_DATA_URL_CHARS = 4_000_000;
export function parseImageDataUrl(v: unknown): { mediaType: string; base64: string } | null {
  if (typeof v !== 'string' || v.length > MAX_IMAGE_DATA_URL_CHARS) return null;
  const m = v.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
  return m ? { mediaType: m[1], base64: m[2] } : null;
}
