'use client';

import { useEffect, useState, type MutableRefObject } from 'react';
import type { PublicQuizState } from '@/lib/quiz/room';

export type Lang = 'en' | 'es';

export const LETTERS = ['A', 'B', 'C', 'D'] as const;
export const COLORS = ['#F28B6B', '#F6D365', '#8FC8F0', '#B6E388'] as const;
const AVATARS = [
  '#F28B6B',
  '#F6D365',
  '#8FC8F0',
  '#B6E388',
  '#E3A6F0',
  '#F7B7C8',
  '#9FE0D3',
  '#FFCF8A',
];

export function avatarColor(i: number): string {
  return AVATARS[i % AVATARS.length];
}

/** POST JSON and return the body, throwing the server's message on failure. */
export async function post<T = Record<string, unknown>>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as
    | (T & { success?: boolean; error?: string })
    | null;
  if (!res.ok || !data || data.success === false) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data;
}

/** Seconds left in the current question, using the server clock offset. */
export function useCountdown(
  state: PublicQuizState | null,
  offset: MutableRefObject<number>,
): number {
  const [secs, setSecs] = useState(0);
  const startedAt = state?.phase === 'question' ? state.questionStartedAt : null;
  const duration = state?.durationSec ?? 0;
  useEffect(() => {
    if (startedAt == null) return;
    const tick = () => {
      const left = startedAt + duration * 1000 - (Date.now() + offset.current);
      setSecs(Math.max(0, Math.ceil(left / 1000)));
    };
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 250);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [startedAt, duration, offset]);
  return startedAt == null ? 0 : secs;
}
