'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-4 text-center">
      <div>
        <p className="text-sm uppercase tracking-widest text-error">حصل خطأ</p>
        <h1 className="mt-2 font-display text-3xl font-black text-brand-900">استنى لحظة</h1>
        <p className="mt-2 max-w-md text-slate-600">{error.message || 'حصل خطأ غير متوقع.'}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset}>حاول تاني</Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">الرجوع للرئيسية</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
