'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import '@fontsource/cabin-sketch/700.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import type { PublicQuizState } from '@/lib/quiz/room';
import s from '../quiz/quiz.module.css';
import { COLORS, LETTERS, post, useCountdown, type Lang } from '../quiz/shared';

const T = {
  en: {
    sub: 'Family quiz night',
    joinTitle: 'Join the game',
    code: 'Game code',
    name: 'Your name',
    namePh: 'e.g. Abuela',
    join: 'Join',
    joining: 'Joining…',
    youreIn: 'You’re in!',
    waitStart: 'Look at the TV — the game starts soon.',
    pick: 'Pick your answer',
    locked: 'Answer locked in!',
    waitOthers: 'Waiting for everyone…',
    right: 'Right!',
    wrong: 'Not this time',
    noAnswer: 'Time ran out',
    answerWas: 'The answer was',
    points: 'points',
    score: 'Score',
    place: 'You finished',
    of: 'of',
    over: 'Game over',
    lost: 'This game ended. Ask for a new code.',
    leave: 'Leave game',
    fail: 'Something went wrong. Try again.',
  },
  es: {
    sub: 'Noche de trivia en familia',
    joinTitle: 'Únete al juego',
    code: 'Código del juego',
    name: 'Tu nombre',
    namePh: 'ej. Abuela',
    join: 'Entrar',
    joining: 'Entrando…',
    youreIn: '¡Estás dentro!',
    waitStart: 'Mira la TV — el juego empieza pronto.',
    pick: 'Escoge tu respuesta',
    locked: '¡Respuesta enviada!',
    waitOthers: 'Esperando a todos…',
    right: '¡Correcto!',
    wrong: 'Esta vez no',
    noAnswer: 'Se acabó el tiempo',
    answerWas: 'La respuesta era',
    points: 'puntos',
    score: 'Puntos',
    place: 'Quedaste en el lugar',
    of: 'de',
    over: 'Fin del juego',
    lost: 'Este juego terminó. Pide un código nuevo.',
    leave: 'Salir del juego',
    fail: 'Algo salió mal. Inténtalo otra vez.',
  },
} as const;

interface Me {
  code: string;
  playerId: string;
  playerKey: string;
}

const STORE_KEY = 'quewhat.quiz.player';

export default function QuizPlayer() {
  const params = useSearchParams();
  const [lang, setLang] = useState<Lang>('es');
  const t = T[lang];
  const [code, setCode] = useState((params.get('code') ?? '').toUpperCase().slice(0, 4));
  const [name, setName] = useState('');
  const [me, setMe] = useState<Me | null>(null);
  const [state, setState] = useState<PublicQuizState | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const offset = useRef(0);

  useEffect(() => {
    try {
      const l = localStorage.getItem('quewhat.lang');
      if (l === 'en' || l === 'es') setLang(l);
      const saved = sessionStorage.getItem(STORE_KEY);
      if (saved) {
        const m = JSON.parse(saved) as Me;
        const wanted = (params.get('code') ?? '').toUpperCase();
        if (!wanted || wanted === m.code) setMe(m);
      }
    } catch {
      /* storage unavailable */
    }
  }, [params]);

  const switchLang = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem('quewhat.lang', l);
    } catch {
      /* ignore */
    }
  };

  const leave = () => {
    sessionStorage.removeItem(STORE_KEY);
    setMe(null);
    setState(null);
  };

  useEffect(() => {
    if (!me) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const q = new URLSearchParams({
          code: me.code,
          playerId: me.playerId,
          playerKey: me.playerKey,
        });
        const res = await fetch(`/api/quiz/play?${q}`, { cache: 'no-store' });
        if (res.status === 404) {
          setErr(T[lang].lost);
          leave();
          return;
        }
        const data = (await res.json()) as { state?: PublicQuizState };
        if (data.state && !stop) {
          offset.current = data.state.serverNow - Date.now();
          setState(data.state);
        }
      } catch {
        /* keep polling */
      }
      if (!stop) timer = setTimeout(tick, 1500);
    };
    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me]);

  const join = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr('');
    try {
      const data = await post<Me>('/api/quiz/play', { action: 'join', code, name });
      const m = { code: data.code, playerId: data.playerId, playerKey: data.playerKey };
      sessionStorage.setItem(STORE_KEY, JSON.stringify(m));
      setMe(m);
    } catch (e2) {
      setErr((e2 as Error).message || t.fail);
    } finally {
      setBusy(false);
    }
  };

  const answer = async (choice: number) => {
    if (!me || !state || state.you?.choice != null) return;
    // optimistic lock-in
    setState({ ...state, you: state.you ? { ...state.you, choice } : state.you });
    try {
      await post('/api/quiz/play', {
        action: 'answer',
        code: me.code,
        playerId: me.playerId,
        playerKey: me.playerKey,
        choice,
      });
    } catch (e2) {
      setErr((e2 as Error).message || t.fail);
    }
  };

  const secs = useCountdown(state, offset);

  const header = (
    <header className={s.top}>
      <div>
        <div className={`${s.logo} ${s.chalk}`}>¿QuéWhat?</div>
        <div className={s.sub}>{t.sub}</div>
      </div>
      <div className={s.seg} role="group" aria-label="Language">
        <button aria-pressed={lang === 'en'} onClick={() => switchLang('en')}>
          EN
        </button>
        <button aria-pressed={lang === 'es'} onClick={() => switchLang('es')}>
          ES
        </button>
      </div>
    </header>
  );

  if (!me) {
    return (
      <main className={s.page}>
        <div className={`${s.board} ${s.phone}`}>
          {header}
          <section className={s.center}>
            <h1 className={`${s.title} ${s.chalk}`}>{t.joinTitle}</h1>
            <form className={s.form} onSubmit={join}>
              <div className={s.field}>
                <label htmlFor="jn-code">{t.code}</label>
                <input
                  id="jn-code"
                  value={code}
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={4}
                  style={{ letterSpacing: 8, textTransform: 'uppercase', fontSize: 28 }}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                />
              </div>
              <div className={s.field}>
                <label htmlFor="jn-name">{t.name}</label>
                <input
                  id="jn-name"
                  value={name}
                  maxLength={14}
                  autoComplete="nickname"
                  placeholder={t.namePh}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus={code.length === 4}
                />
              </div>
              <button className={s.btn} disabled={busy || code.length !== 4 || !name.trim()}>
                {busy ? t.joining : t.join}
              </button>
              <p className={err ? s.statusErr : s.status} role="status">
                {err}
              </p>
            </form>
          </section>
        </div>
      </main>
    );
  }

  const you = state?.you;
  const phase = state?.phase ?? 'lobby';
  const rank =
    state && you
      ? [...state.players].sort((a, b) => b.score - a.score).findIndex((p) => p.id === you.id) + 1
      : 0;

  return (
    <main className={s.page}>
      <div className={`${s.board} ${s.phone}`}>
        {header}
        <div className={s.sub} style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{you?.name}</span>
          <span>
            {t.score}: {you?.score ?? 0}
          </span>
        </div>

        {phase === 'lobby' && (
          <section className={s.center}>
            <h1 className={`${s.title} ${s.chalk}`}>{t.youreIn}</h1>
            <p className={s.help}>{t.waitStart}</p>
          </section>
        )}

        {phase === 'question' && state?.question && (
          <>
            <h1 className={`${s.chalk}`} style={{ fontSize: 26, lineHeight: 1.2, margin: 0 }}>
              {state.question.q[lang]}
            </h1>
            <div className={s.timer} aria-hidden>
              <div className={s.bar}>
                <span style={{ width: `${(secs / state.durationSec) * 100}%` }} />
              </div>
              <span className={s.secs}>{secs}</span>
            </div>
            {you?.choice == null ? (
              <div className={s.pad} role="group" aria-label={t.pick}>
                {state.question.answers.map((a, i) => (
                  <button
                    key={i}
                    className={s.padBtn}
                    style={{ background: COLORS[i] }}
                    onClick={() => answer(i)}
                  >
                    <span className={s.lt}>{LETTERS[i]}</span>
                    <span>{a[lang]}</span>
                  </button>
                ))}
              </div>
            ) : (
              <section className={s.center}>
                <div className={`${s.big} ${s.chalk}`} aria-hidden>
                  {LETTERS[you.choice]}
                </div>
                <h2 className={s.chalk} style={{ fontSize: 34, margin: 0 }}>
                  {t.locked}
                </h2>
                <p className={s.help}>{t.waitOthers}</p>
              </section>
            )}
          </>
        )}

        {phase === 'reveal' && state?.reveal && state.question && (
          <section className={s.center} aria-live="polite">
            <h1 className={`${s.title} ${s.chalk}`}>
              {you?.choice == null
                ? t.noAnswer
                : you.choice === state.reveal.correct
                  ? t.right
                  : t.wrong}
            </h1>
            {you?.points ? (
              <p className={s.status} style={{ fontSize: 28 }}>
                +{you.points} {t.points}
              </p>
            ) : null}
            <p className={s.help}>
              {t.answerWas}: {LETTERS[state.reveal.correct]} ·{' '}
              {state.question.answers[state.reveal.correct][lang]}
            </p>
            <p className={s.explain}>{state.reveal.explain[lang]}</p>
          </section>
        )}

        {phase === 'end' && state && (
          <section className={s.center}>
            <h1 className={`${s.title} ${s.chalk}`}>{t.over}</h1>
            <div className={`${s.big} ${s.chalk}`}>#{rank}</div>
            <p className={s.help}>
              {t.place} {rank} {t.of} {state.players.length} · {you?.score ?? 0} {t.points}
            </p>
          </section>
        )}

        <p className={err ? s.statusErr : s.status} role="status">
          {err}
        </p>
        <button className={s.btnGhost} onClick={leave}>
          {t.leave}
        </button>
      </div>
    </main>
  );
}
