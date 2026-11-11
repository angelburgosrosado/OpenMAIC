import type { Metadata } from 'next';
import HomeworkHelper from './HomeworkHelper';

export const metadata: Metadata = {
  title: 'Homework helper',
  description:
    'Type or snap a homework problem. Profe Luna explains it step by step in English or Spanish, with tips for grown-ups and a quick check.',
};

export default function HomeworkPage() {
  return <HomeworkHelper />;
}
