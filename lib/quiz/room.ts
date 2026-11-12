/**
 * Family quiz night — room state and rules (server side).
 *
 * A room lives in the app store under `quiz/rooms/<code>`. The TV (host) and
 * phones (players) poll `publicState`; every change goes through `updateDoc`,
 * so simultaneous answers from several phones never overwrite each other.
 * Correct answers are never sent to clients before the reveal.
 */

import { randomBytes } from 'crypto';
import { deleteDoc, listDocKeys, readDoc, updateDoc } from '@/lib/server/app-store/json-store';
import { bi, extractJson, type Bi, LEVELS, type LevelId } from '@/lib/homework/lesson';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuizRoom');
const ROOM_PREFIX = 'quiz/rooms/';

export interface QuizQuestion {
  q: Bi;
  answers: Bi[];
  correct: number;
  hint: Bi;
  explain: Bi;
}

export interface QuizPlayer {
  id: string;
  key: string;
  name: string;
  joinedAt: number;
  score: number;
  answers: Record<number, { choice: number; at: number; points: number }>;
}

export type QuizPhase = 'lobby' | 'question' | 'reveal' | 'end';

export interface QuizRoom {
  code: string;
  hostKey: string;
  createdAt: number;
  expiresAt: number;
  topic: Bi;
  level: LevelId;
  questions: QuizQuestion[];
  phase: QuizPhase;
  qi: number;
  questionStartedAt: number | null;
  durationSec: number;
  players: QuizPlayer[];
}

export const MAX_PLAYERS = 12;
export const ROOM_TTL_MS = 4 * 60 * 60 * 1000;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const GRACE_MS = 1500;

export class QuizError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

function key(code: string): string {
  return `quiz/rooms/${code.toLowerCase()}`;
}

export function normalizeCode(v: unknown): string {
  return String(v ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

function secret(): string {
  return randomBytes(18).toString('base64url');
}

function newCode(): string {
  const bytes = randomBytes(4);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

// ───────────────────────── Question generation ─────────────────────────

export function buildQuizPrompt(
  topic: string,
  level: LevelId,
  count: number,
): { system: string; prompt: string } {
  const system =
    'You write quiz questions for QuéWhat, a bilingual English/Spanish family learning game shown on a TV and answered on phones. You reply with JSON only.';
  const prompt = `Topic: ${JSON.stringify(topic)}
Players: ${LEVELS[level]}
Write exactly ${count} multiple-choice questions about the topic.
Rules:
- Every fact must be correct and appropriate for children. If the topic is not suitable for kids, quietly switch to a closely related, school-appropriate topic.
- Exactly 4 answer options per question, exactly one correct. No "all/none of the above". No trick questions.
- Keep it short: question at most 90 characters, each answer at most 24 characters.
- Go from easier to a bit harder. Vary which option is correct.
- "hint": a gentle nudge that does NOT give the answer away.
- "explain": one friendly sentence a parent could read aloud that says WHY the answer is right.
- Spanish must be natural Latin American Spanish (Puerto Rico friendly), not a word-for-word translation.
Return ONLY this JSON:
{"topic":{"en":"","es":""},"questions":[{"q":{"en":"","es":""},"answers":[{"en":"","es":""},{"en":"","es":""},{"en":"","es":""},{"en":"","es":""}],"correct":0,"hint":{"en":"","es":""},"explain":{"en":"","es":""}}]}`;
  return { system, prompt };
}

export function parseQuizReply(
  text: string,
  fallbackTopic: string,
  random: () => number = Math.random,
): { topic: Bi; questions: QuizQuestion[] } | null {
  const data = extractJson(text) as Record<string, unknown> | null;
  const raw = data && Array.isArray(data.questions) ? (data.questions as unknown[]) : [];
  const questions: QuizQuestion[] = [];
  for (const item of raw) {
    const q = (item ?? {}) as Record<string, unknown>;
    const answers = Array.isArray(q.answers) ? (q.answers as unknown[]).map(bi) : [];
    const correct = Number(q.correct);
    const text = bi(q.q);
    if (
      answers.length !== 4 ||
      !(correct >= 0 && correct < 4) ||
      !text.en ||
      answers.some((a) => !a.en)
    )
      continue;
    const order = [0, 1, 2, 3];
    for (let i = 3; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    questions.push({
      q: text,
      answers: order.map((i) => answers[i]),
      correct: order.indexOf(correct),
      hint: bi(q.hint),
      explain: bi(q.explain),
    });
  }
  if (!questions.length) return null;
  const topic = data?.topic ? bi(data.topic) : { en: fallbackTopic, es: fallbackTopic };
  return {
    topic: topic.en ? topic : { en: fallbackTopic, es: fallbackTopic },
    questions: questions.slice(0, 10),
  };
}

// ───────────────────────────── Room lifecycle ─────────────────────────────

export async function createRoom(input: {
  topic: Bi;
  level: LevelId;
  questions: QuizQuestion[];
  durationSec?: number;
  now?: number;
}): Promise<{ code: string; hostKey: string }> {
  const now = input.now ?? Date.now();
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = newCode();
    const hostKey = secret();
    const created = await updateDoc<QuizRoom | null, boolean>(key(code), null, (existing) => {
      if (existing && existing.expiresAt > now) return { value: existing, result: false };
      const room: QuizRoom = {
        code,
        hostKey,
        createdAt: now,
        expiresAt: now + ROOM_TTL_MS,
        topic: input.topic,
        level: input.level,
        questions: input.questions,
        phase: 'lobby',
        qi: 0,
        questionStartedAt: null,
        durationSec: input.durationSec ?? 20,
        players: [],
      };
      return { value: room, result: true };
    });
    if (created) return { code, hostKey };
  }
  throw new QuizError('Could not create a room, please try again', 503);
}

function live(room: QuizRoom | null, now: number): QuizRoom {
  if (!room || room.expiresAt <= now)
    throw new QuizError('That game code was not found or has ended', 404);
  return room;
}

function allAnswered(room: QuizRoom): boolean {
  return room.players.length > 0 && room.players.every((p) => p.answers[room.qi] !== undefined);
}

/** Close the question when time is up or everyone answered. Returns true if changed. */
function maybeAutoReveal(room: QuizRoom, now: number): boolean {
  if (room.phase !== 'question' || room.questionStartedAt == null) return false;
  const timeUp = now >= room.questionStartedAt + room.durationSec * 1000 + GRACE_MS;
  if (timeUp || allAnswered(room)) {
    room.phase = 'reveal';
    return true;
  }
  return false;
}

export async function joinRoom(
  codeIn: string,
  nameIn: string,
  now = Date.now(),
): Promise<{ code: string; playerId: string; playerKey: string }> {
  const code = normalizeCode(codeIn);
  const name =
    String(nameIn ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 14) || 'Player';
  return updateDoc<QuizRoom | null, { code: string; playerId: string; playerKey: string }>(
    key(code),
    null,
    (r) => {
      const room = live(r, now);
      if (room.phase === 'end') throw new QuizError('This game has finished', 409);
      if (room.players.length >= MAX_PLAYERS) throw new QuizError('This game is full', 409);
      let unique = name;
      for (
        let n = 2;
        room.players.some((p) => p.name.toLowerCase() === unique.toLowerCase());
        n++
      ) {
        unique = `${name.slice(0, 11)} ${n}`;
      }
      const player: QuizPlayer = {
        id: `p_${secret().slice(0, 10)}`,
        key: secret(),
        name: unique,
        joinedAt: now,
        score: 0,
        answers: {},
      };
      room.players.push(player);
      return { value: room, result: { code, playerId: player.id, playerKey: player.key } };
    },
  );
}

export async function submitAnswer(
  codeIn: string,
  playerId: string,
  playerKey: string,
  choiceIn: unknown,
  now = Date.now(),
): Promise<{ accepted: boolean }> {
  const code = normalizeCode(codeIn);
  const choice = Number(choiceIn);
  if (!Number.isInteger(choice) || choice < 0 || choice > 3)
    throw new QuizError('Pick A, B, C or D');
  return updateDoc<QuizRoom | null, { accepted: boolean }>(key(code), null, (r) => {
    const room = live(r, now);
    const player = room.players.find((p) => p.id === playerId && p.key === playerKey);
    if (!player) throw new QuizError('You are not in this game', 403);
    if (room.phase !== 'question' || room.questionStartedAt == null)
      return { value: room, result: { accepted: false } };
    const deadline = room.questionStartedAt + room.durationSec * 1000 + GRACE_MS;
    if (now > deadline || player.answers[room.qi] !== undefined)
      return { value: room, result: { accepted: false } };
    const q = room.questions[room.qi];
    const secondsLeft = Math.max(
      0,
      Math.ceil((room.questionStartedAt + room.durationSec * 1000 - now) / 1000),
    );
    const points = choice === q.correct ? 500 + secondsLeft * 25 : 0;
    player.answers[room.qi] = { choice, at: now, points };
    player.score += points;
    maybeAutoReveal(room, now);
    return { value: room, result: { accepted: true } };
  });
}

export type HostAction = 'start' | 'reveal' | 'next' | 'again' | 'end';

export async function hostAction(
  codeIn: string,
  hostKey: string,
  action: HostAction,
  now = Date.now(),
): Promise<void> {
  const code = normalizeCode(codeIn);
  await updateDoc<QuizRoom | null, void>(key(code), null, (r) => {
    const room = live(r, now);
    if (room.hostKey !== hostKey)
      throw new QuizError('Only the TV that created this game can control it', 403);
    switch (action) {
      case 'start':
        if (room.phase !== 'lobby') break;
        room.phase = 'question';
        room.qi = 0;
        room.questionStartedAt = now;
        break;
      case 'reveal':
        if (room.phase === 'question') room.phase = 'reveal';
        break;
      case 'next':
        if (room.phase !== 'reveal') break;
        if (room.qi < room.questions.length - 1) {
          room.qi += 1;
          room.phase = 'question';
          room.questionStartedAt = now;
        } else {
          room.phase = 'end';
        }
        break;
      case 'again':
        room.phase = 'lobby';
        room.qi = 0;
        room.questionStartedAt = null;
        for (const p of room.players) {
          p.score = 0;
          p.answers = {};
        }
        break;
      case 'end':
        room.phase = 'end';
        break;
      default:
        throw new QuizError('Unknown action');
    }
    return { value: room, result: undefined };
  });
}

/** What the TV and phones may see. Hides the correct answer until the reveal. */
export interface PublicQuizState {
  code: string;
  topic: Bi;
  phase: QuizPhase;
  qi: number;
  total: number;
  durationSec: number;
  questionStartedAt: number | null;
  serverNow: number;
  question: { q: Bi; answers: Bi[]; hint: Bi } | null;
  reveal: { correct: number; explain: Bi } | null;
  players: {
    id: string;
    name: string;
    score: number;
    answered: boolean;
    lastPoints: number | null;
  }[];
  you: {
    id: string;
    name: string;
    score: number;
    choice: number | null;
    points: number | null;
  } | null;
}

export async function publicState(
  codeIn: string,
  opts: { playerId?: string; playerKey?: string } = {},
  now = Date.now(),
): Promise<PublicQuizState> {
  const code = normalizeCode(codeIn);
  const stored = await readDoc<QuizRoom | null>(key(code), null);
  if (stored && stored.expiresAt <= now) {
    // publicState is polled continuously by the host TV and every player's
    // phone, so this opportunistically purges most expired rooms (nicknames,
    // answers, scores) within moments of expiry. sweepExpiredRooms (run on a
    // schedule) catches any room nobody polls again. Best-effort: a failed
    // delete here must never block the 404 the caller is about to get.
    try {
      await deleteDoc(key(code));
    } catch (err) {
      log.warn(`Failed to delete expired quiz room ${code}:`, err);
    }
  }
  let room = live(stored, now);
  if (room.phase === 'question' && room.questionStartedAt != null) {
    const shouldClose =
      now >= room.questionStartedAt + room.durationSec * 1000 + GRACE_MS || allAnswered(room);
    if (shouldClose) {
      room = await updateDoc<QuizRoom | null, QuizRoom>(key(code), null, (r) => {
        const fresh = live(r, now);
        maybeAutoReveal(fresh, now);
        return { value: fresh, result: fresh };
      });
    }
  }
  const showAnswer = room.phase === 'reveal' || room.phase === 'end';
  const q = room.phase === 'lobby' ? null : room.questions[room.qi];
  const me = opts.playerId
    ? room.players.find((p) => p.id === opts.playerId && p.key === opts.playerKey)
    : undefined;
  return {
    code: room.code,
    topic: room.topic,
    phase: room.phase,
    qi: room.qi,
    total: room.questions.length,
    durationSec: room.durationSec,
    questionStartedAt: room.questionStartedAt,
    serverNow: now,
    question: q ? { q: q.q, answers: q.answers, hint: q.hint } : null,
    reveal: q && showAnswer ? { correct: q.correct, explain: q.explain } : null,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      answered: p.answers[room.qi] !== undefined,
      lastPoints: showAnswer ? (p.answers[room.qi]?.points ?? 0) : null,
    })),
    you: me
      ? {
          id: me.id,
          name: me.name,
          score: me.score,
          choice: me.answers[room.qi]?.choice ?? null,
          points: showAnswer ? (me.answers[room.qi]?.points ?? 0) : null,
        }
      : null,
  };
}

/**
 * Delete every quiz room past its `expiresAt`. publicState's opportunistic
 * delete handles rooms that are still being polled; this backstops rooms
 * nobody checks on again (a host who closes the tab, a game nobody joined),
 * so expired players' nicknames, answers and scores don't just sit in
 * storage indefinitely. Meant to run on a schedule (see the quiz-cleanup
 * cron route). Returns the number of rooms deleted.
 */
export async function sweepExpiredRooms(now = Date.now()): Promise<number> {
  const keys = await listDocKeys(ROOM_PREFIX);
  let deleted = 0;
  for (const k of keys) {
    const room = await readDoc<QuizRoom | null>(k, null);
    if (room && room.expiresAt <= now) {
      await deleteDoc(k);
      deleted++;
    }
  }
  return deleted;
}
