import type { Metadata } from 'next';
import QuizHost from './QuizHost';

export const metadata: Metadata = {
  title: 'Family quiz night',
  description:
    'Pick any topic, Profe Luna writes the questions, and the whole family plays on their phones — in English or Spanish.',
};

export default function QuizPage() {
  return <QuizHost />;
}
