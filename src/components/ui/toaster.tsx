'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      richColors
      closeButton
      dir="rtl"
      toastOptions={{
        classNames: {
          toast: 'rounded-2xl border-brand-200 shadow-blue-soft',
        },
      }}
    />
  );
}
