'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-8 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      dir="ltr"
      className="relative flex h-8 w-16 items-center rounded-full border border-blue-200/80 bg-blue-50/90 p-1 shadow-inner transition-colors duration-300 dark:border-blue-800/80 dark:bg-[#0E172A] shrink-0"
      aria-label="تبديل الوضع الليلي والنهاري"
      title={isDark ? 'التحويل للوضع النهاري' : 'التحويل للوضع الليلي'}
    >
      {/* Background Icons */}
      <div className="flex w-full items-center justify-between px-1.5 text-slate-400 dark:text-slate-500">
        <Sun className={`h-3.5 w-3.5 ${isDark ? 'text-slate-500' : 'text-blue-600 font-bold'}`} />
        <Moon className={`h-3.5 w-3.5 ${isDark ? 'text-cyan-400 font-bold' : 'text-slate-400'}`} />
      </div>

      {/* Sliding indicator */}
      <span
        style={{ left: isDark ? '34px' : '4px' }}
        className={`absolute top-1 grid h-6 w-6 place-items-center rounded-full shadow-md transition-all duration-300 ${
          isDark
            ? 'bg-blue-600 text-white shadow-blue-500/40'
            : 'bg-white text-blue-600 shadow-blue-300/50 border border-slate-100'
        }`}
      >
        {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}

