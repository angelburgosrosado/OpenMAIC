'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import '@fontsource/cabin-sketch/700.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import type { Bi, LevelId } from '@/lib/homework/lesson';
import type { PublicQuizState } from '@/lib/quiz/room';
import s from './quiz.module.css';
import { COLORS, LETTERS, avatarColor, post, useCountdown, type Lang } from './shared';

const T = {
  en: {
    sub: 'Family quiz night',
    setupTitle: 'Pick a topic, any topic',
    setupHelp: 'Profe Luna writes the questions. Everyone plays on their own phone.',
    topic: 'Topic',
    topicPh: 'e.g. fractions, the solar system, Puerto Rico',
    level: 'Who’s playing?',
    count: 'Questions',
    create: 'Write the questions',
    writing: 'Profe Luna is writing your questions…',
    try: 'Try:',
    join: 'Join at',
    code: 'Code',
    waiting: 'Waiting for players…',
    lobbyHelp: 'Scan the code with a phone camera, or go to quewhat.com/join and type the code.',
    start: 'Start the game',
    reveal: 'Show the answer',
    next: 'Next question',
    finish: 'See the winners',
    again: 'Play again',
    newGame: 'New topic',
    end: 'End game',
    question: 'Question',
    of: 'of',
    answered: 'answered',
    winners: 'Final scores',
    noPlayers: 'Nobody joined yet — you need at least one player.',
    fail: 'Something went wrong. Try again.',
    lost: 'This game ended or expired. Start a new one.',
    luna: 'Profe Luna',
  },
  es: {
    sub: 'Noche de trivia en familia',
    setupTitle: 'Escoge un tema, cualquiera',
    setupHelp: 'Profe Luna escribe las preguntas. Cada uno juega en su celular.',
    topic: 'Tema',
    topicPh: 'ej. fracciones, el sistema solar, Puerto Rico',
    level: '¿Quién juega?',
    count: 'Preguntas',
    create: 'Escribir las preguntas',
    writing: 'Profe Luna está escribiendo tus preguntas…',
    try: 'Prueba:',
    join: 'Únete en',
    code: 'Código',
    waiting: 'Esperando jugadores…',
    lobbyHelp:
      'Escanea el código con la cámara del celular, o ve a quewhat.com/join y escribe el código.',
    start: 'Empezar el juego',
    reveal: 'Mostrar la respuesta',
    next: 'Siguiente pregunta',
    finish: 'Ver a los ganadores',
    again: 'Jugar otra vez',
    newGame: 'Otro tema',
    end: 'Terminar',
    question: 'Pregunta',
    of: 'de',
    answered: 'respondieron',
    winners: 'Puntuación final',
    noPlayers: 'Nadie se ha unido — necesitas al menos un jugador.',
    fail: 'Algo salió mal. Inténtalo otra vez.',
    lost: 'Este juego terminó o expiró. Empieza uno nuevo.',
    luna: 'Profe Luna',
  },
} as const;

const LEVEL_LABELS: Record<LevelId, Bi> = {
  k2: { en: 'Little kids (K–2)', es: 'Peques (K–2)' },
  g35: { en: 'Kids (3–5)', es: 'Niños (3–5)' },
  g68: { en: 'Middle school (6–8)', es: 'Intermedia (6–8)' },
  hs: { en: 'High school', es: 'Superior' },
  parent: { en: 'Grown-ups', es: 'Adultos' },
};

const IDEAS: Bi[] = [
  { en: 'Animals', es: 'Animales' },
  { en: 'Fractions', es: 'Fracciones' },
  { en: 'The solar system', es: 'El sistema solar' },
  { en: 'Puerto Rico', es: 'Puerto Rico' },
  { en: 'The human body', es: 'El cuerpo humano' },
];

interface Game {
  code: string;
  hostKey: string;
}

const STORE_KEY = 'quewhat.quiz.host';

export default function QuizHost() {
  const [lang, setLang] = useState<Lang>('es');
  const t = T[lang];
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<LevelId>('g35');
  const [count, setCount] = useState(6);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [game, setGame] = useState<Game | null>(null);
  const [state, setState] = useState<PublicQuizState | null>(null);
  const [qr, setQr] = useState('');
  const offset = useRef(0);

  // Resume a game after a refresh.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORE_KEY);
      if (saved) setGame(JSON.parse(saved) as Game);
      const l = localStorage.getItem('quewhat.lang');
      if (l === 'en' || l === 'es') setLang(l);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const switchLang = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem('quewhat.lang', l);
    } catch {
      /* ignore */
    }
  };

  const joinUrl = useMemo(() => {
    if (!game) return '';
    const origin =
      typeof window === 'undefined' ? 'https://www.quewhat.com' : window.location.origin;
    return `${origin}/join?code=${game.code}`;
  }, [game]);

  useEffect(() => {
    if (!joinUrl) return;
    QRCode.toDataURL(joinUrl, {
      margin: 1,
      width: 240,
      color: { dark: '#1F3B2D', light: '#F7F5EE' },
    })
      .then(setQr)
      .catch(() => setQr(''));
  }, [joinUrl]);

  // Poll the room.
  useEffect(() => {
    if (!game) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const res = await fetch(`/api/quiz/play?code=${game.code}`, { cache: 'no-store' });
        if (res.status === 404) {
          setErr(T[lang].lost);
          setGame(null);
          setState(null);
          sessionStorage.removeItem(STORE_KEY);
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
  }, [game]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || busy) return;
    setBusy(true);
    setErr('');
    try {
      const data = await post<{ code: string; hostKey: string }>('/api/quiz', {
        topic,
        level,
        count,
      });
      const g = { code: data.code, hostKey: data.hostKey };
      sessionStorage.setItem(STORE_KEY, JSON.stringify(g));
      setState(null);
      setGame(g);
    } catch (e2) {
      setErr((e2 as Error).message || t.fail);
    } finally {
      setBusy(false);
    }
  };

  const act = useCallback(
    async (action: 'start' | 'reveal' | 'next' | 'again' | 'end') => {
      if (!game) return;
      setErr('');
      try {
        await post('/api/quiz/play', { action, code: game.code, hostKey: game.hostKey });
        const res = await fetch(`/api/quiz/play?code=${game.code}`, { cache: 'no-store' });
        const data = (await res.json()) as { state?: PublicQuizState };
        if (data.state) setState(data.state);
      } catch (e2) {
        setErr((e2 as Error).message || T[lang].fail);
      }
    },
    [game, lang],
  );

  const newGame = async () => {
    if (game) await act('end').catch(() => undefined);
    sessionStorage.removeItem(STORE_KEY);
    setGame(null);
    setState(null);
    setQr('');
  };

  const secs = useCountdown(state, offset);

  const top = (
    <header className={s.top}>
      <div>
        <Link href="/" className={`${s.logo} ${s.chalk}`}>
          ¿QuéWhat?
        </Link>
        <div className={s.sub}>{state ? `${t.sub} · ${state.topic[lang]}` : t.sub}</div>
      </div>
      <div className={s.right}>
        <div className={s.seg} role="group" aria-label="Language">
          <button aria-pressed={lang === 'en'} onClick={() => switchLang('en')}>
            EN
          </button>
          <button aria-pressed={lang === 'es'} onClick={() => switchLang('es')}>
            ES
          </button>
        </div>
        {game && (
          <div className={s.codeBox}>
            <div>
              <small>{t.join} quewhat.com/join</small>
              <strong aria-label={`${t.code} ${game.code.split('').join(' ')}`}>{game.code}</strong>
            </div>
            {qr && <img className={s.qr} src={qr} alt="" />}
          </div>
        )}
      </div>
    </header>
  );

  // ---------- setup ----------
  if (!game) {
    return (
      <main className={s.page}>
        <div className={s.board}>
          {top}
          <section className={s.center}>
            <h1 className={`${s.title} ${s.chalk}`}>{t.setupTitle}</h1>
            <p className={s.help}>{t.setupHelp}</p>
            <form className={s.form} onSubmit={create}>
              <div className={s.field}>
                <label htmlFor="qz-topic">{t.topic}</label>
                <input
                  id="qz-topic"
                  value={topic}
                  maxLength={80}
                  placeholder={t.topicPh}
                  onChange={(e) => setTopic(e.target.value)}
                  autoFocus
                />
              </div>
              <div className={s.chips} aria-label={t.try}>
                {IDEAS.map((i) => (
                  <button type="button" key={i.en} onClick={() => setTopic(i[lang])}>
                    {i[lang]}
                  </button>
                ))}
              </div>
              <div className={s.row}>
                <div className={s.field}>
                  <label htmlFor="qz-level">{t.level}</label>
                  <select
                    id="qz-level"
                    value={level}
                    onChange={(e) => setLevel(e.target.value as LevelId)}
                  >
                    {(Object.keys(LEVEL_LABELS) as LevelId[]).map((l) => (
                      <option key={l} value={l}>
                        {LEVEL_LABELS[l][lang]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={s.field}>
                  <label htmlFor="qz-count">{t.count}</label>
                  <select
                    id="qz-count"
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                  >
                    {[4, 6, 8, 10].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button className={s.btn} disabled={busy || !topic.trim()}>
                {busy ? t.writing : t.create}
              </button>
              <p className={err ? s.statusErr : s.status} role="status">
                {err || (busy ? t.writing : '')}
              </p>
            </form>
          </section>
        </div>
      </main>
    );
  }

  const players = state?.players ?? [];
  const phase = state?.phase ?? 'lobby';
  const last = state ? state.qi >= state.total - 1 : false;

  return (
    <main className={s.page}>
      <div className={s.board}>
        {top}

        {phase === 'lobby' && (
          <section className={s.center}>
            <h1 className={`${s.title} ${s.chalk}`}>
              {players.length ? state?.topic[lang] : t.waiting}
            </h1>
            <p className={s.help}>{t.lobbyHelp}</p>
            {qr && (
              <img className={s.qr} style={{ width: 220, height: 220 }} src={qr} alt={joinUrl} />
            )}
            <ul className={s.players} aria-live="polite" style={{ listStyle: 'none', padding: 0 }}>
              {players.map((p, i) => (
                <li className={s.pl} key={p.id}>
                  <span className={`${s.av} ${s.ring}`} style={{ background: avatarColor(i) }}>
                    {p.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className={s.nm}>{p.name}</span>
                </li>
              ))}
            </ul>
            <button className={s.btn} onClick={() => act('start')} disabled={!players.length}>
              {t.start}
            </button>
            {!players.length && <p className={s.help}>{t.noPlayers}</p>}
          </section>
        )}

        {(phase === 'question' || phase === 'reveal') && state?.question && (
          <>
            <div className={s.sub} style={{ textAlign: 'center' }}>
              {t.question} {state.qi + 1} {t.of} {state.total} ·{' '}
              {players.filter((p) => p.answered).length}/{players.length} {t.answered}
            </div>
            <h1 className={`${s.qtext} ${s.chalk}`}>{state.question.q[lang]}</h1>
            {phase === 'question' && (
              <div className={s.timer} aria-hidden>
                <div className={s.bar}>
                  <span style={{ width: `${(secs / state.durationSec) * 100}%` }} />
                </div>
                <span className={s.secs}>{secs}</span>
              </div>
            )}
            <div className={s.answers}>
              {state.question.answers.map((a, i) => {
                const cls =
                  phase === 'reveal' && state.reveal
                    ? i === state.reveal.correct
                      ? s.ansWin
                      : s.ansDim
                    : s.ans;
                return (
                  <div key={i} className={cls} style={{ background: COLORS[i] }}>
                    <span className={s.lt}>{LETTERS[i]}</span>
                    <span className={s.tx}>{a[lang]}</span>
                  </div>
                );
              })}
            </div>
            <div className={s.foot}>
              <div className={s.host}>
                <span className={s.luna} aria-hidden>
                  PL
                </span>
                <p>
                  <strong>{t.luna}: </strong>
                  {phase === 'reveal' && state.reveal
                    ? state.reveal.explain[lang]
                    : state.question.hint[lang]}
                </p>
              </div>
              <ul className={s.players} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {players.map((p, i) => (
                  <li className={s.pl} key={p.id}>
                    <span
                      className={`${s.av} ${p.answered ? s.ringOk : ''}`}
                      style={{ background: avatarColor(i) }}
                    >
                      {p.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span className={s.sc}>
                      {p.score}
                      {phase === 'reveal' && p.lastPoints ? ` +${p.lastPoints}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
              {phase === 'question' ? (
                <button className={s.btn} onClick={() => act('reveal')}>
                  {t.reveal}
                </button>
              ) : (
                <button className={s.btn} onClick={() => act('next')} autoFocus>
                  {last ? t.finish : t.next}
                </button>
              )}
            </div>
          </>
        )}

        {phase === 'end' && (
          <section className={s.center}>
            <h1 className={`${s.title} ${s.chalk}`}>{t.winners}</h1>
            <ol className={s.rank} style={{ listStyle: 'none', padding: 0 }}>
              {[...players]
                .sort((a, b) => b.score - a.score)
                .map((p, i) => (
                  <li className={s.rankRow} key={p.id}>
                    <span className={s.pos}>{i + 1}</span>
                    <span className={s.who}>{p.name}</span>
                    <span className={s.pts}>{p.score}</span>
                  </li>
                ))}
            </ol>
            <div className={s.row} style={{ justifyContent: 'center', flex: '0 0 auto' }}>
              <button
                className={s.btn}
                style={{ flex: '0 0 auto' }}
                onClick={() => act('again')}
                autoFocus
              >
                {t.again}
              </button>
              <button className={s.btnGhost} style={{ flex: '0 0 auto' }} onClick={newGame}>
                {t.newGame}
              </button>
            </div>
          </section>
        )}

        <p className={err ? s.statusErr : s.status} role="status">
          {err}
        </p>
      </div>
    </main>
  );
}
