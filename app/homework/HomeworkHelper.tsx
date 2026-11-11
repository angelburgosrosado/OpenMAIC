'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import '@fontsource/cabin-sketch/700.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import { useI18n } from '@/lib/hooks/use-i18n';
import type { Bi, HomeworkLesson, LevelId } from '@/lib/homework/lesson';
import s from './homework.module.css';

type Lang = 'en' | 'es';
type View = 'ask' | 'lesson' | 'check';

const T = {
  en: {
    tag: 'Homework helper',
    askTitle: 'What are we stuck on?',
    askLead:
      'Type the homework question or snap a photo of the page. Profe Luna, our AI teacher, explains it one step at a time — then a quick check to make sure it clicked.',
    problemLabel: 'The homework question',
    placeholder: 'e.g. Sara ate 3/8 of a pizza and Leo ate 1/4. How much did they eat in all?',
    photoBtn: 'Add a photo of the page',
    removePhoto: 'Remove photo',
    levelLabel: 'Who’s learning?',
    guideLabel: 'Guide me — hide the final answer until we’ve worked through it',
    goBtn: 'Explain it',
    stop: 'Stop',
    try: 'Try:',
    reading: 'Profe Luna is reading the problem…',
    needInput: 'Type the question or add a photo first.',
    fail: 'Something went wrong. Try again in a moment.',
    badImg: 'That photo couldn’t be used. Try a clearer picture (PNG or JPG).',
    problem: 'The problem',
    step: 'Step',
    of: 'of',
    back: 'Back',
    next: 'Next step',
    another: 'I don’t get it — explain another way',
    askPh: 'Ask Profe Luna about this step…',
    ask: 'Ask',
    anotherTitle: 'Another way to see it',
    yourTurn: 'Your turn',
    show: 'Show me',
    showAnswer: 'Show the final answer',
    finalAnswer: 'Final answer',
    checkBtn: 'Check yourself',
    newProblem: 'New problem',
    parents: 'For grown-ups',
    watch: 'Watch out for',
    checkTitle: 'Quick check',
    checkLead: 'Questions like the homework. Pick an answer to see why.',
    right: 'Right!',
    notQuite: 'Not quite.',
    scoreOf: 'right',
    great: '¡Excelente! It clicked.',
    good: 'Nice work — review the one you missed.',
    again: 'Let’s go over it again together.',
    backLesson: 'Back to the steps',
    thinking: 'Thinking…',
    home: 'Home',
  },
  es: {
    tag: 'Ayuda con las tareas',
    askTitle: '¿En qué nos atascamos?',
    askLead:
      'Escribe la pregunta de la tarea o toma una foto de la página. Profe Luna, nuestra maestra con IA, lo explica paso a paso — y luego un repaso rápido para confirmar que se entendió.',
    problemLabel: 'La pregunta de la tarea',
    placeholder: 'p. ej. Sara comió 3/8 de una pizza y Leo 1/4. ¿Cuánto comieron en total?',
    photoBtn: 'Añadir foto de la página',
    removePhoto: 'Quitar foto',
    levelLabel: '¿Quién está aprendiendo?',
    guideLabel: 'Guíame — esconde la respuesta final hasta que la trabajemos',
    goBtn: 'Explícalo',
    stop: 'Detener',
    try: 'Prueba:',
    reading: 'Profe Luna está leyendo el problema…',
    needInput: 'Escribe la pregunta o añade una foto primero.',
    fail: 'Algo salió mal. Intenta otra vez en un momento.',
    badImg: 'No se pudo usar esa foto. Prueba una foto más clara (PNG o JPG).',
    problem: 'El problema',
    step: 'Paso',
    of: 'de',
    back: 'Atrás',
    next: 'Siguiente paso',
    another: 'No entiendo — explícalo de otra forma',
    askPh: 'Pregúntale a Profe Luna sobre este paso…',
    ask: 'Preguntar',
    anotherTitle: 'Otra forma de verlo',
    yourTurn: 'Tu turno',
    show: 'Muéstrame',
    showAnswer: 'Mostrar la respuesta final',
    finalAnswer: 'Respuesta final',
    checkBtn: 'Repaso rápido',
    newProblem: 'Nuevo problema',
    parents: 'Para los adultos',
    watch: 'Cuidado con',
    checkTitle: 'Repaso rápido',
    checkLead: 'Preguntas como las de la tarea. Escoge una respuesta para ver por qué.',
    right: '¡Correcto!',
    notQuite: 'Casi.',
    scoreOf: 'correctas',
    great: '¡Excelente! Lo entendiste.',
    good: '¡Buen trabajo! Repasa la que fallaste.',
    again: 'Vamos a repasarlo otra vez juntos.',
    backLesson: 'Volver a los pasos',
    thinking: 'Pensando…',
    home: 'Inicio',
  },
} as const;

const LEVEL_LABELS: { id: LevelId; en: string; es: string }[] = [
  { id: 'g35', en: 'Ages 8–10 (3rd–5th grade)', es: '8–10 años (3.º–5.º grado)' },
  { id: 'k2', en: 'Ages 5–7 (K–2nd grade)', es: '5–7 años (K–2.º grado)' },
  { id: 'g68', en: 'Ages 11–13 (6th–8th grade)', es: '11–13 años (6.º–8.º grado)' },
  { id: 'hs', en: 'Teens (9th–12th grade)', es: 'Adolescentes (9.º–12.º grado)' },
  { id: 'parent', en: 'Grown-up — refresh me so I can help', es: 'Adulto — refréscame para poder ayudar' },
];

const CHIPS: Record<Lang, string[]> = {
  en: ['3/4 + 1/6 = ?', 'Why do we have seasons?', 'Find the main idea of a paragraph', 'Round 4,682 to the nearest hundred'],
  es: ['3/4 + 1/6 = ?', '¿Por qué hay estaciones?', 'Conjugar «tener» en presente', 'Redondea 4,682 a la centena más cercana'],
};

/** Shrink a photo to at most 1600px on its long side and re-encode as JPEG. */
async function photoToDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('decode'));
      el.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function post<T>(body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch('/api/homework', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const data = (await res.json().catch(() => null)) as (T & { success?: boolean; error?: string }) | null;
  if (!res.ok || !data || data.success === false) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return data;
}

interface AnotherState {
  loading: boolean;
  text: Bi | null;
  err: string | null;
}

export default function HomeworkHelper() {
  const { locale } = useI18n();
  const [lang, setLang] = useState<Lang>('en');
  useEffect(() => {
    if (locale?.toLowerCase().startsWith('es')) setLang('es');
  }, [locale]);
  const t = T[lang];
  const L = (o: Bi | null | undefined) => (o ? o[lang] || o.en : '');

  const [view, setView] = useState<View>('ask');
  const [text, setText] = useState('');
  const [level, setLevel] = useState<LevelId>('g35');
  const [guide, setGuide] = useState(true);
  const [photo, setPhoto] = useState<{ name: string; dataUrl: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ msg: string; err: boolean }>({ msg: '', err: false });
  const ctlRef = useRef<AbortController | null>(null);

  const [lesson, setLesson] = useState<HomeworkLesson | null>(null);
  const [step, setStep] = useState(0);
  const [maxSeen, setMaxSeen] = useState(0);
  const [turnShown, setTurnShown] = useState<Record<number, boolean>>({});
  const [another, setAnother] = useState<Record<number, AnotherState>>({});
  const [showAnswer, setShowAnswer] = useState(false);
  const [picks, setPicks] = useState<(number | null)[]>([]);
  const [stepQ, setStepQ] = useState('');

  useEffect(() => {
    if (!busy) return;
    const t0 = Date.now();
    const id = setInterval(() => {
      setStatus({ msg: `${T[lang].reading} ${Math.round((Date.now() - t0) / 1000)}s`, err: false });
    }, 1000);
    return () => clearInterval(id);
  }, [busy, lang]);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await photoToDataUrl(file);
      setPhoto({ name: file.name, dataUrl });
    } catch {
      setStatus({ msg: t.badImg, err: true });
    }
  }

  async function explain(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const q = text.trim();
    if (!q && !photo) {
      setStatus({ msg: t.needInput, err: true });
      return;
    }
    setBusy(true);
    setStatus({ msg: t.reading, err: false });
    const ctl = new AbortController();
    ctlRef.current = ctl;
    try {
      const data = await post<{ lesson?: HomeworkLesson; refused?: Bi }>(
        { action: 'lesson', text: q, image: photo?.dataUrl, level, guide },
        ctl.signal,
      );
      if (data.refused) {
        setStatus({ msg: L(data.refused), err: true });
        return;
      }
      if (!data.lesson) throw new Error('empty');
      setLesson(data.lesson);
      setStep(0);
      setMaxSeen(0);
      setTurnShown({});
      setAnother({});
      setShowAnswer(!guide);
      setPicks(data.lesson.check.map(() => null));
      setStatus({ msg: '', err: false });
      setView('lesson');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if ((err as Error).name === 'AbortError') setStatus({ msg: '', err: false });
      else setStatus({ msg: t.fail, err: true });
    } finally {
      setBusy(false);
    }
  }

  async function anotherWay(question: string) {
    if (!lesson) return;
    const key = step;
    if (another[key]?.loading) return;
    const st = lesson.steps[key];
    setAnother((a) => ({ ...a, [key]: { loading: true, text: null, err: null } }));
    try {
      const data = await post<{ text: Bi }>({
        action: 'another',
        level,
        problem: lesson.problem.en,
        concept: lesson.concept.en,
        board: st.board.en,
        say: st.say.en,
        question: question || undefined,
      });
      setAnother((a) => ({ ...a, [key]: { loading: false, text: data.text, err: null } }));
    } catch {
      setAnother((a) => ({ ...a, [key]: { loading: false, text: null, err: T[lang].fail } }));
    }
  }

  function reset() {
    setText('');
    setPhoto(null);
    setLesson(null);
    setView('ask');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const header = (
    <header className={s.header}>
      <div className={s.headerIn}>
        <Link href="/" className={`${s.logo} ${s.chalk}`} aria-label={`QuéWhat — ${t.home}`}>
          ¿QuéWhat?
        </Link>
        <span className={s.tag}>{t.tag}</span>
        <div className={s.seg} role="group" aria-label="Language">
          <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
            EN
          </button>
          <button type="button" aria-pressed={lang === 'es'} onClick={() => setLang('es')}>
            ES
          </button>
        </div>
      </div>
    </header>
  );

  if (view === 'ask' || !lesson) {
    return (
      <div className={s.page} lang={lang}>
        {header}
        <main className={s.main}>
          <div className={s.frame}>
            <form className={s.board} onSubmit={explain}>
              <h1 className={s.chalk}>{t.askTitle}</h1>
              <p className={s.lead}>{t.askLead}</p>
              <div className={s.askGrid}>
                <div className={s.askLeft}>
                  <label className={s.lbl} htmlFor="hw-problem">
                    {t.problemLabel}
                  </label>
                  <textarea
                    id="hw-problem"
                    className={s.textarea}
                    maxLength={1500}
                    value={text}
                    placeholder={t.placeholder}
                    onChange={(e) => setText(e.target.value)}
                  />
                  <div className={s.chips}>
                    <span>{t.try}</span>
                    {CHIPS[lang].map((c) => (
                      <button key={c} type="button" onClick={() => setText(c)}>
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={s.askRight}>
                  {photo ? (
                    <div className={s.thumb}>
                      <img src={photo.dataUrl} alt={photo.name} />
                      <span>{photo.name}</span>
                      <button type="button" aria-label={t.removePhoto} onClick={() => setPhoto(null)}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className={s.file}>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={(e) => onPhoto(e.target.files?.[0])}
                      />
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                        <circle cx="12" cy="13" r="3.5" />
                      </svg>
                      <span>{t.photoBtn}</span>
                    </label>
                  )}
                  <label className={s.lbl} htmlFor="hw-level">
                    {t.levelLabel}
                  </label>
                  <select id="hw-level" className={s.select} value={level} onChange={(e) => setLevel(e.target.value as LevelId)}>
                    {LEVEL_LABELS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l[lang]}
                      </option>
                    ))}
                  </select>
                  <label className={s.check}>
                    <input type="checkbox" checked={guide} onChange={(e) => setGuide(e.target.checked)} />
                    <span>{t.guideLabel}</span>
                  </label>
                </div>
              </div>
              <div className={s.row}>
                <button type="submit" className={s.go} disabled={busy}>
                  {t.goBtn}
                </button>
                {busy && (
                  <button type="button" className={s.ghostDark} onClick={() => ctlRef.current?.abort()}>
                    {t.stop}
                  </button>
                )}
                <div className={status.err ? s.statusErr : s.status} role="status" aria-live="polite">
                  {status.msg}
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    );
  }

  if (view === 'check') {
    const qs = lesson.check;
    const done = qs.length > 0 && picks.every((p) => p !== null);
    const right = qs.filter((q, i) => picks[i] === q.correct).length;
    const msg = right === qs.length ? t.great : right >= qs.length - 1 ? t.good : t.again;
    return (
      <div className={s.page} lang={lang}>
        {header}
        <main className={s.main}>
          <div className={s.quiz}>
            <div className={s.lessonTop}>
              <div>
                <div className={s.crumb}>{L(lesson.concept)}</div>
                <h2>{t.checkTitle}</h2>
                <p>{t.checkLead}</p>
              </div>
              <button type="button" className={s.ghost} onClick={() => setView('lesson')}>
                {t.backLesson}
              </button>
            </div>
            {qs.map((q, i) => {
              const p = picks[i];
              return (
                <div key={i} className={s.qcard}>
                  <div className={s.qq}>
                    {i + 1}. {L(q.q)}
                  </div>
                  <div className={s.opts}>
                    {q.options.map((o, j) => {
                      let cls = s.opt;
                      if (p !== null && p !== undefined) {
                        if (j === q.correct) cls = s.optRight;
                        else if (j === p) cls = s.optWrong;
                      }
                      return (
                        <button
                          key={j}
                          type="button"
                          className={cls}
                          disabled={p !== null && p !== undefined}
                          onClick={() => setPicks((ps) => ps.map((v, k) => (k === i ? j : v)))}
                        >
                          <span className={s.lt}>{'ABCD'[j]}</span>
                          {L(o)}
                        </button>
                      );
                    })}
                  </div>
                  {p !== null && p !== undefined && (
                    <div className={s.why}>
                      <b className={p === q.correct ? s.whyOk : s.whyNo}>{p === q.correct ? t.right : t.notQuite}</b> {L(q.why)}
                    </div>
                  )}
                </div>
              );
            })}
            {done && (
              <div className={s.score}>
                <span className={`${s.big} ${s.chalk}`}>
                  {right} / {qs.length} {t.scoreOf}
                </span>
                <span className={s.grow} style={{ fontWeight: 800, fontSize: 18 }}>
                  {msg}
                </span>
                <button type="button" className={s.go} onClick={reset}>
                  {t.newProblem}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Lesson view
  const n = lesson.steps.length;
  const st = lesson.steps[step];
  const last = step === n - 1;
  const ano = another[step];
  return (
    <div className={s.page} lang={lang}>
      {header}
      <main className={s.main}>
        <div className={s.lessonTop}>
          <div>
            <div className={s.crumb}>{L(lesson.subject)}</div>
            <h2>{L(lesson.concept)}</h2>
            <p>{L(lesson.goal)}</p>
          </div>
          <button type="button" className={s.ghost} onClick={reset}>
            {t.newProblem}
          </button>
        </div>
        <div className={s.cols}>
          <div className={s.colMain}>
            <div className={s.problem}>
              <b>{t.problem}</b>
              {L(lesson.problem)}
            </div>
            <div className={s.frame}>
              <div className={s.stepBoard}>
                <div className={s.dots} aria-label={`${t.step} ${step + 1} ${t.of} ${n}`}>
                  {lesson.steps.map((_, i) => (
                    <span key={i} className={i === step ? s.dotOn : i <= maxSeen ? s.dotDone : s.dot} />
                  ))}
                  <em>
                    {t.step} {step + 1} {t.of} {n}
                  </em>
                </div>
                <div className={`${s.chalkLine} ${s.chalk}`}>{L(st.board)}</div>
                <div className={s.say}>{L(st.say)}</div>
                {st.yourTurn && (
                  <div className={s.turn}>
                    <div className={s.turnQ}>
                      {t.yourTurn}: {L(st.yourTurn.q)}
                    </div>
                    {turnShown[step] ? (
                      <div className={s.turnA}>{L(st.yourTurn.a)}</div>
                    ) : (
                      <div>
                        <button type="button" className={s.ghostDark} onClick={() => setTurnShown((m) => ({ ...m, [step]: true }))}>
                          {t.show}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {ano && (
                  <div className={s.another} role="status" aria-live="polite">
                    <b>{t.anotherTitle}</b>
                    {ano.loading ? t.thinking : ano.err ? ano.err : L(ano.text)}
                  </div>
                )}
                <div className={s.nav}>
                  <button type="button" className={s.ghostDark} disabled={step === 0} onClick={() => setStep((v) => Math.max(0, v - 1))}>
                    {t.back}
                  </button>
                  <span className={s.grow} />
                  {!last && (
                    <button
                      type="button"
                      className={s.go}
                      onClick={() => {
                        const nx = Math.min(step + 1, n - 1);
                        setStep(nx);
                        setMaxSeen((m) => Math.max(m, nx));
                      }}
                    >
                      {t.next}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className={s.nav}>
              <button type="button" className={s.ghost} onClick={() => anotherWay('')}>
                {t.another}
              </button>
            </div>
            <form
              className={s.askRow}
              onSubmit={(e) => {
                e.preventDefault();
                const q = stepQ.trim();
                if (q) {
                  anotherWay(q);
                  setStepQ('');
                }
              }}
            >
              <label htmlFor="hw-stepq" className={s.srOnly}>
                {t.askPh}
              </label>
              <input id="hw-stepq" type="text" maxLength={200} placeholder={t.askPh} value={stepQ} onChange={(e) => setStepQ(e.target.value)} />
              <button type="submit" className={s.ghost}>
                {t.ask}
              </button>
            </form>
            {last && (
              <div className={s.nav} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                {showAnswer ? (
                  <div className={s.answerBox}>
                    {t.finalAnswer}: {L(lesson.answer)}
                  </div>
                ) : (
                  <div>
                    <button type="button" className={s.ghost} onClick={() => setShowAnswer(true)}>
                      {t.showAnswer}
                    </button>
                  </div>
                )}
                {lesson.check.length > 0 && (
                  <div>
                    <button
                      type="button"
                      className={s.go}
                      onClick={() => {
                        setPicks(lesson.check.map(() => null));
                        setView('check');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      {t.checkBtn} ({lesson.check.length})
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <aside className={s.colSide}>
            <div className={s.card}>
              <h3>{t.parents}</h3>
              <ul>
                {lesson.parents.tips.map((tip, i) => (
                  <li key={i}>{L(tip)}</li>
                ))}
              </ul>
              {lesson.parents.mistake.en && (
                <div className={s.warn}>
                  <b>{t.watch}:</b> {L(lesson.parents.mistake)}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
