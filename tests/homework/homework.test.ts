import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildLessonPrompt,
  extractJson,
  normalizeLesson,
  parseImageDataUrl,
} from '@/lib/homework/lesson';

const callLLMMock = vi.hoisted(() => vi.fn());
const resolveModelMock = vi.hoisted(() => vi.fn());
const resolvePrincipalMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/ai/llm', () => ({ callLLM: callLLMMock }));
vi.mock('@/lib/server/resolve-model', () => ({ resolveModel: resolveModelMock }));
vi.mock('@/lib/server/auth/authorization', () => ({ resolvePrincipal: resolvePrincipalMock }));

const bi = (en: string, es = en) => ({ en, es });
const LESSON = {
  subject: bi('Math', 'Matemáticas'),
  concept: bi('Adding fractions', 'Sumar fracciones'),
  goal: bi('Use a common denominator'),
  problem: bi('3/4 + 1/6'),
  steps: [
    { board: bi('3/4 + 1/6'), say: bi('Slices are different sizes.'), yourTurn: { q: bi('Same size?'), a: bi('No') } },
    { board: bi('LCD = 12'), say: bi('Find 12.'), yourTurn: null },
  ],
  answer: bi('11/12'),
  parents: { tips: [bi('Ask what the bottom number means')], mistake: bi('Adding the bottoms') },
  check: [
    { q: bi('1/2 + 1/4?'), options: [bi('2/6'), bi('3/4'), bi('1/8'), bi('2/4')], correct: 1, why: bi('2/4 + 1/4') },
    { q: bi('bad'), options: [bi('a'), bi('b')], correct: 0, why: bi('x') },
  ],
};

function req(body: unknown) {
  return { json: async () => body, headers: { get: () => null } } as never;
}

describe('homework lesson helpers', () => {
  it('extracts JSON from fenced or chatty replies', () => {
    expect(extractJson('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('here {"b":2} done')).toEqual({ b: 2 });
    expect(extractJson('no json')).toBeNull();
  });

  it('normalises a lesson, drops malformed check questions and keeps the right answer after shuffling', () => {
    const r = normalizeLesson(LESSON, () => 0.3);
    expect(r && r.ok).toBe(true);
    if (!r || !r.ok) return;
    expect(r.lesson.steps).toHaveLength(2);
    expect(r.lesson.steps[0].yourTurn?.a.en).toBe('No');
    expect(r.lesson.check).toHaveLength(1);
    const q = r.lesson.check[0];
    expect(q.options[q.correct].en).toBe('3/4');
  });

  it('passes through a kind refusal', () => {
    expect(normalizeLesson({ error: bi('Not a school question', 'No es una pregunta escolar') })).toEqual({
      ok: false,
      reason: bi('Not a school question', 'No es una pregunta escolar'),
    });
  });

  it('rejects replies without steps', () => {
    expect(normalizeLesson({ steps: [] })).toBeNull();
    expect(normalizeLesson('nope')).toBeNull();
  });

  it('only accepts small base64 image data URLs of supported types', () => {
    expect(parseImageDataUrl('data:image/jpeg;base64,QUJD')).toEqual({ mediaType: 'image/jpeg', base64: 'QUJD' });
    expect(parseImageDataUrl('data:text/html;base64,QUJD')).toBeNull();
    expect(parseImageDataUrl('https://example.com/a.png')).toBeNull();
  });

  it('mentions guide mode and the photo only when used', () => {
    const a = buildLessonPrompt({ text: 'x', hasImage: false, level: 'g35', guide: false });
    expect(a.prompt).not.toContain('guide mode');
    expect(a.prompt).not.toContain('attached photo');
    const b = buildLessonPrompt({ text: '', hasImage: true, level: 'parent', guide: true });
    expect(b.prompt).toContain('guide mode');
    expect(b.prompt).toContain('attached photo');
  });
});

describe('POST /api/homework', () => {
  const originalAccess = process.env.ACCESS_CODE;
  beforeEach(() => {
    callLLMMock.mockReset();
    resolveModelMock.mockReset().mockResolvedValue({ model: 'mock-model' });
    resolvePrincipalMock.mockReset().mockResolvedValue({ userId: 'u1' });
    delete process.env.ACCESS_CODE;
  });
  afterEach(() => {
    if (originalAccess === undefined) delete process.env.ACCESS_CODE;
    else process.env.ACCESS_CODE = originalAccess;
  });

  it('requires sign-in when the site has no access code', async () => {
    resolvePrincipalMock.mockResolvedValue(null);
    const { POST } = await import('@/app/api/homework/route');
    const res = await POST(req({ text: '2+2' }));
    expect(res.status).toBe(401);
  });

  it('allows visitors who passed the access-code gate', async () => {
    resolvePrincipalMock.mockResolvedValue(null);
    process.env.ACCESS_CODE = 'secret';
    callLLMMock.mockResolvedValue({ text: JSON.stringify(LESSON) });
    const { POST } = await import('@/app/api/homework/route');
    const res = await POST(req({ text: '3/4 + 1/6' }));
    expect(res.status).toBe(200);
  });

  it('builds a lesson on the homework-helper stage', async () => {
    callLLMMock.mockResolvedValue({ text: '```json\n' + JSON.stringify(LESSON) + '\n```' });
    const { POST } = await import('@/app/api/homework/route');
    const res = await POST(req({ text: '3/4 + 1/6', level: 'g35', guide: true }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.lesson.concept.es).toBe('Sumar fracciones');
    expect(resolveModelMock).toHaveBeenCalledWith({ stage: 'homework-helper' });
    expect(callLLMMock.mock.calls[0][1]).toBe('homework-helper');
  });

  it('sends a photo as an image part', async () => {
    callLLMMock.mockResolvedValue({ text: JSON.stringify(LESSON) });
    const { POST } = await import('@/app/api/homework/route');
    await POST(req({ image: 'data:image/png;base64,QUJD' }));
    const params = callLLMMock.mock.calls[0][0];
    expect(params.messages[0].content[0]).toEqual({ type: 'image', image: 'QUJD', mediaType: 'image/png' });
  });

  it('rejects empty input and bad photos', async () => {
    const { POST } = await import('@/app/api/homework/route');
    expect((await POST(req({ text: '  ' }))).status).toBe(400);
    expect((await POST(req({ image: 'data:image/svg+xml;base64,QUJD' }))).status).toBe(400);
    expect(callLLMMock).not.toHaveBeenCalled();
  });

  it('returns a refusal instead of a lesson when the model declines', async () => {
    callLLMMock.mockResolvedValue({ text: JSON.stringify({ error: bi('Try a school question') }) });
    const { POST } = await import('@/app/api/homework/route');
    const data = await (await POST(req({ text: 'something' }))).json();
    expect(data.refused.en).toBe('Try a school question');
  });

  it('explains a step another way', async () => {
    callLLMMock.mockResolvedValue({ text: '{"en":"Think of pizza.","es":"Piensa en pizza."}' });
    const { POST } = await import('@/app/api/homework/route');
    const data = await (
      await POST(req({ action: 'another', problem: '3/4 + 1/6', concept: 'fractions', board: 'LCD = 12', say: 'Find 12.' }))
    ).json();
    expect(data.text).toEqual({ en: 'Think of pizza.', es: 'Piensa en pizza.' });
  });
});
