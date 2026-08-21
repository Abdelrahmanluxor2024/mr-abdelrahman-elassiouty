'use client';

import { Bell, LogOut, Wallet as WalletIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { logout } from '@/app/actions/auth';
import { formatCurrencyEGP } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { fetchWalletBalance, fetchUnreadCount } from '@/lib/queries/useStudent';
import { ThemeToggle } from './theme-toggle';

export function Navbar({ studentName }: { studentName: string }) {
  const { data: balance = 0 } = useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: fetchWalletBalance,
  });

  const { data: unread = 0 } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: fetchUnreadCount,
    refetchInterval: 60_000,
  });

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-100 bg-white/90 px-4 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#0A101D]/90 lg:px-8 transition-colors">
      {/* Right Brand on Navbar */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative h-12 w-14 shrink-0">
            <Image
              src="/images/logo.png"
              alt="شعار مستر عبدالرحمن الأسيوطي"
              fill
              className="object-contain drop-shadow-md group-hover:scale-105 transition-transform"
            />
          </div>
          <div>
            <p className="font-display text-sm font-black text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">
              مستر عبدالرحمن الأسيوطي
            </p>
            <p className="text-[11px] text-blue-600 dark:text-cyan-400 font-semibold">البرمجة والذكاء الاصطناعي</p>
          </div>
        </Link>

        {/* Working Theme Switcher Capsule (Sun / Moon) */}
        <div className="mr-2">
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

        {/* Notification Bell with Badge */}
        <Link
          href="/notifications"
          className="relative grid h-9 w-9 place-items-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
          aria-label="الإشعارات"
        >
          <Bell className="h-5 w-5 text-slate-700 dark:text-slate-200" />
          {unread > 0 && (
            <span className="absolute top-1 left-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>

        {/* Avatar Profile Icon */}
        <Link
          href="/profile"
          className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 text-sm font-bold text-white shadow-sm shadow-blue-500/30"
        >
          {studentName?.[0] ?? 'ط'}
        </Link>

        {/* Logout */}
        <form action={logout}>
          <Button type="submit" variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-red-600 dark:hover:text-red-400" title="تسجيل الخروج">
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}


