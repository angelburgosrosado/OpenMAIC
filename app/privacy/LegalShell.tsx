import type { ReactNode } from 'react';
import Link from 'next/link';
import '@fontsource/cabin-sketch/700.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/900.css';
import s from './legal.module.css';

export function LegalShell(props: {
  title: string;
  titleEs: string;
  version: string;
  children: ReactNode;
}) {
  return (
    <main className={s.page}>
      <article className={s.paper}>
        <header className={s.head}>
          <Link href="/" className={s.logo}>
            ¿QuéWhat?
          </Link>
          <nav className={s.nav} aria-label="Legal">
            <Link href="/privacy">Privacy · Privacidad</Link>
            <Link href="/terms">Terms · Términos</Link>
            <a href="#es">Español</a>
          </nav>
        </header>
        <h1 lang="en">{props.title}</h1>
        <p className={s.meta}>
          Last updated / Última actualización: {props.version} · <a href="#es">{props.titleEs} ↓</a>
        </p>
        {props.children}
      </article>
    </main>
  );
}
