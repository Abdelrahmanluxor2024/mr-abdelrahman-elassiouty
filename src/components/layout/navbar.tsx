'use client';

import { Bell, LogOut, Wallet as WalletIcon, Menu } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { formatCurrencyEGP } from '@/lib/utils';
import { ThemeToggle } from './theme-toggle';
import { signOut } from '@/lib/firebase/auth-service';

export function Navbar({ studentName, balance = 0 }: { studentName: string; balance?: number }) {
  const unread = 0;

  async function handleLogout() {
    try {
      await signOut();
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('mr_ass_student_profile');
      } catch {}
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = '/login';
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-100 bg-white/90 px-3 sm:px-4 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#0A101D]/90 lg:px-8 transition-colors">
      {/* Right Brand & Mobile Menu Trigger on Navbar */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile Hamburger Menu (الثلاث شرط) */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
          className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-cyan-400 border border-blue-200/60 dark:border-slate-700 shadow-sm transition hover:scale-105 active:scale-95 lg:hidden"
          aria-label="فتح القائمة الجانبية"
        >
          <Menu className="h-5 w-5" />
        </button>

        <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3 group">
          <div className="relative h-10 w-12 sm:h-12 sm:w-14 shrink-0">
            <Image
              src="/images/logo.png"
              alt="شعار مستر عبدالرحمن الأسيوطي"
              fill
              className="object-contain drop-shadow-md group-hover:scale-105 transition-transform"
            />
          </div>
          <div className="hidden xs:block">
            <p className="font-display text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
              مستر عبدالرحمن الأسيوطي
            </p>
            <p className="text-[10px] sm:text-[11px] text-blue-600 dark:text-cyan-400 font-semibold">لغة عربية وثانوية عامة</p>
          </div>
        </Link>

        {/* Working Theme Switcher Capsule (Sun / Moon) */}
        <div className="mr-1 hidden sm:block">
          <ThemeToggle />
        </div>
      </div>

      {/* Left Actions on Navbar */}
      <div className="flex items-center gap-2.5">
        {/* Wallet Pill */}
        <Link
          href="/wallet"
          className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:bg-blue-950/60 dark:border dark:border-blue-800/60 dark:text-blue-300 dark:hover:bg-blue-900/60"
        >
          <WalletIcon className="h-3.5 w-3.5 text-blue-600 dark:text-cyan-400" />
          <span>{formatCurrencyEGP(balance)}</span>
        </Link>

        {/* Avatar Profile Icon */}
        <Link
          href="/profile"
          className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-sm font-bold text-white shadow-sm shadow-blue-500/30"
        >
          {studentName?.[0] ?? 'ط'}
        </Link>

        {/* Logout */}
        <button
          type="button"
          onClick={handleLogout}
          className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition"
          title="تسجيل الخروج"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
