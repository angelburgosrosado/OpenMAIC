/**
 * Family quiz night: parsing the AI reply and the full room lifecycle
 * (create → join → answer → reveal → next → end → again) on the file backend.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { __resetAppStoreForTests, readDoc } from '@/lib/server/app-store/json-store';
import {
  createRoom,
  hostAction,
  joinRoom,
  MAX_PLAYERS,
  normalizeCode,
  parseQuizReply,
  publicState,
  QuizError,
  submitAnswer,
  sweepExpiredRooms,
  type QuizQuestion,
} from '@/lib/quiz/room';

const q = (n: number, correct = 0): QuizQuestion => ({
  q: { en: `Question ${n}?`, es: `¿Pregunta ${n}?` },
  answers: [0, 1, 2, 3].map((i) => ({ en: `A${i}`, es: `R${i}` })),
  correct,
  hint: { en: 'hint', es: 'pista' },
  explain: { en: 'because', es: 'porque' },
});

let dir = '';
const savedDb = process.env.DATABASE_URL;

beforeEach(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'quiz-'));
  process.env.APP_STORE_DIR = dir;
  delete process.env.DATABASE_URL;
  await __resetAppStoreForTests();
});

afterEach(async () => {
  await __resetAppStoreForTests();
  delete process.env.APP_STORE_DIR;
  if (savedDb) process.env.DATABASE_URL = savedDb;
  rmSync(dir, { recursive: true, force: true });
});

describe('parseQuizReply', () => {
  it('keeps valid questions, shuffles answers and tracks the correct one', () => {
    const reply = JSON.stringify({
      topic: { en: 'Space', es: 'Espacio' },
      questions: [
        {
          q: { en: 'Closest star?', es: '¿Estrella más cercana?' },
          answers: [
            { en: 'The Sun', es: 'El Sol' },
            { en: 'Sirius', es: 'Sirio' },
            { en: 'Vega', es: 'Vega' },
            { en: 'Polaris', es: 'Polaris' },
          ],
          correct: 0,
          hint: 'warm',
          explain: 'It is the Sun.',
        },
        { q: 'bad', answers: ['only', 'three', 'answers'], correct: 0 },
      ],
    });
    const parsed = parseQuizReply('```json\n' + reply + '\n```', 'space', () => 0);
    expect(parsed).not.toBeNull();
    expect(parsed!.topic).toEqual({ en: 'Space', es: 'Espacio' });
    expect(parsed!.questions).toHaveLength(1);
    const one = parsed!.questions[0];
    expect(one.answers[one.correct].en).toBe('The Sun');
  });

  it('returns null when nothing usable came back', () => {
    expect(parseQuizReply('sorry, no', 'x')).toBeNull();
  });
});

describe('room lifecycle', () => {
  it('plays a full game with scoring and hides the answer until reveal', async () => {
    const t0 = 1_000_000;
    const { code, hostKey } = await createRoom({
      topic: { en: 'Test', es: 'Prueba' },
      level: 'g35',
      questions: [q(1, 2), q(2, 1)],
    });
    expect(code).toMatch(/^[A-Z2-9]{4}$/);

    const ana = await joinRoom(code.toLowerCase(), 'Ana', t0);
    const leo = await joinRoom(code, 'ana', t0);
    let st = await publicState(code, {}, t0);
    expect(st.players.map((p) => p.name)).toEqual(['Ana', 'ana 2']);
    expect(st.question).toBeNull();

    await expect(hostAction(code, 'wrong', 'start', t0)).rejects.toBeInstanceOf(QuizError);
    await hostAction(code, hostKey, 'start', t0);
    st = await publicState(code, ana, t0 + 100);
    expect(st.phase).toBe('question');
    expect(st.reveal).toBeNull();
    expect(JSON.stringify(st)).not.toContain('"correct"');

    // Ana right with 18s left, Leo wrong → auto-reveal once everyone answered.
    expect(await submitAnswer(code, ana.playerId, ana.playerKey, 2, t0 + 2000)).toEqual({
      accepted: true,
    });
    expect(await submitAnswer(code, ana.playerId, ana.playerKey, 1, t0 + 2500)).toEqual({
      accepted: false,
    });
    await submitAnswer(code, leo.playerId, leo.playerKey, 0, t0 + 3000);
    st = await publicState(code, ana, t0 + 3100);
    expect(st.phase).toBe('reveal');
    expect(st.reveal?.correct).toBe(2);
    expect(st.you).toMatchObject({ choice: 2, points: 500 + 18 * 25, score: 950 });
    expect(st.players.find((p) => p.id === leo.playerId)?.score).toBe(0);

    await hostAction(code, hostKey, 'next', t0 + 5000);
    st = await publicState(code, {}, t0 + 5000);
    expect(st).toMatchObject({ phase: 'question', qi: 1 });

    // Nobody answers: the timer closes the question.
    st = await publicState(code, {}, t0 + 5000 + 20_000 + 2000);
    expect(st.phase).toBe('reveal');
    await expect(submitAnswer(code, leo.playerId, leo.playerKey, 1, t0 + 30_000)).resolves.toEqual({
      accepted: false,
    });

    await hostAction(code, hostKey, 'next', t0 + 31_000);
    st = await publicState(code, {}, t0 + 31_000);
    expect(st.phase).toBe('end');
    await expect(joinRoom(code, 'Late', t0 + 31_000)).rejects.toThrow(/finished/);

    await hostAction(code, hostKey, 'again', t0 + 32_000);
    st = await publicState(code, {}, t0 + 32_000);
    expect(st.phase).toBe('lobby');
    expect(st.players.every((p) => p.score === 0)).toBe(true);
  });

  it('rejects strangers, bad choices, unknown codes and full rooms', async () => {
    const { code } = await createRoom({
      topic: { en: 'T', es: 'T' },
      level: 'k2',
      questions: [q(1)],
    });
    await expect(submitAnswer(code, 'p_x', 'nope', 0)).rejects.toMatchObject({ status: 403 });
    await expect(submitAnswer(code, 'p_x', 'nope', 7)).rejects.toBeInstanceOf(QuizError);
    await expect(publicState('ZZZZ')).rejects.toMatchObject({ status: 404 });
    for (let i = 0; i < MAX_PLAYERS; i++) await joinRoom(code, `P${i}`);
    await expect(joinRoom(code, 'One more')).rejects.toThrow(/full/);
  });

  it('expires rooms after four hours', async () => {
    const t0 = Date.now();
    const { code } = await createRoom({
      topic: { en: 'T', es: 'T' },
      level: 'k2',
      questions: [q(1)],
    });
    await expect(publicState(code, {}, t0 + 5 * 60 * 60 * 1000)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('deletes an expired room from storage the next time anyone polls it', async () => {
    const t0 = Date.now();
    const { code } = await createRoom({
      topic: { en: 'T', es: 'T' },
      level: 'k2',
      questions: [q(1)],
    });
    const key = `quiz/rooms/${code.toLowerCase()}`;
    expect(await readDoc<unknown>(key, null)).not.toBeNull();

    // Past expiry: publicState still 404s, but it also purges the stored
    // nicknames/answers/scores — they can't just sit there past the
    // "deleted within 4 hours" promise in the privacy policy.
    await expect(publicState(code, {}, t0 + 5 * 60 * 60 * 1000)).rejects.toMatchObject({
      status: 404,
    });
    expect(await readDoc<unknown>(key, null)).toBeNull();
  });

  it('sweeps expired rooms but leaves live ones alone', async () => {
    const t0 = Date.now();
    const { code: liveCode } = await createRoom({
      topic: { en: 'Live', es: 'Vivo' },
      level: 'k2',
      questions: [q(1)],
    });
    const { code: deadCode } = await createRoom({
      topic: { en: 'Dead', es: 'Muerto' },
      level: 'k2',
      questions: [q(1)],
      now: t0 - 5 * 60 * 60 * 1000, // created 5h ago: already past its 4h TTL
    });

    const deleted = await sweepExpiredRooms(t0);
    expect(deleted).toBe(1);
    expect(await readDoc<unknown>(`quiz/rooms/${liveCode.toLowerCase()}`, null)).not.toBeNull();
    expect(await readDoc<unknown>(`quiz/rooms/${deadCode.toLowerCase()}`, null)).toBeNull();
  });

  it('normalizes codes', () => {
    expect(normalizeCode(' ab-c d ')).toBe('ABCD');
  });
});
