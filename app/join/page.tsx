import { Suspense } from 'react';
import type { Metadata } from 'next';
import QuizPlayer from './QuizPlayer';

export const metadata: Metadata = {
  title: 'Join the game',
  description: 'Type the code from the TV to play QuéWhat family quiz night on your phone.',
};

export default function JoinPage() {
  return (
    <Suspense>
      <QuizPlayer />
    </Suspense>
  );
}
