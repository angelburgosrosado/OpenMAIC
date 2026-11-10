'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ClassroomRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams?.toString();
    const destination = qs ? `/classroom/sample?${qs}` : '/classroom/sample';
    router.replace(destination);
  }, [router, searchParams]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-950 text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
        <p className="text-sm font-medium text-gray-400">Loading classroom...</p>
      </div>
    </div>
  );
}

export default function ClassroomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-gray-950 text-white">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
        </div>
      }
    >
      <ClassroomRedirectInner />
    </Suspense>
  );
}

