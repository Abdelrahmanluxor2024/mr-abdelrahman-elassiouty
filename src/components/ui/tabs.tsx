'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type TabsContext = {
  value: string;
  setValue: (v: string) => void;
};

const Ctx = React.createContext<TabsContext | null>(null);

function useTabs() {
  const c = React.useContext(Ctx);
  if (!c) throw new Error('Tabs components must be used inside <Tabs>');
  return c;
}

export function Tabs({
  defaultValue,
  value: controlled,
  onValueChange,
  className,
  children,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? '');
  const value = controlled ?? internal;
  const setValue = (v: string) => {
    if (controlled === undefined) setInternal(v);
    onValueChange?.(v);
  };
  return (
    <Ctx.Provider value={{ value, setValue }}>
      <div className={cn('space-y-4', className)}>{children}</div>
    </Ctx.Provider>
  );
}

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'inline-flex h-11 items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1',
        className
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const { value: active, setValue } = useTabs();
  const isActive = active === value;
  return (
    <button
      type="button"
      onClick={() => setValue(value)}
      className={cn(
        'rounded-xl px-4 py-1.5 text-sm font-semibold transition-colors',
        isActive ? 'bg-brand-600 text-white shadow-blue-soft' : 'text-slate-600 hover:bg-slate-100',
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const { value: active } = useTabs();
  if (active !== value) return null;
  return <div className={className}>{children}</div>;
}
