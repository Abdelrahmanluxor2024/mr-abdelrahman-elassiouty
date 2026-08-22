'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  LayoutGrid, 
  BookOpen, 
  User, 
  Wallet, 
  MessageSquare, 
  Menu, 
  X,
  Sparkles,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar({ studentName, avatarUrl }: { studentName: string; avatarUrl?: string | null }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Listen to mobile toggle from Navbar
  useEffect(() => {
    function handleToggle() {
      setMobileOpen((prev) => !prev);
    }
    window.addEventListener('toggle-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-sidebar', handleToggle);
  }, []);

  const isHome = pathname === '/dashboard';
  const isCourses = pathname.startsWith('/course') || pathname === '/my-courses' || pathname === '/courses';
  const isProfile = pathname.startsWith('/profile');
  const isWallet = pathname.startsWith('/wallet');
  const isForum = pathname.startsWith('/forum');

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex flex-col border-l border-slate-100 bg-white dark:border-slate-800/80 dark:bg-[#0A101D] shadow-2xl transition-all duration-300 lg:sticky lg:top-0 lg:h-screen lg:shadow-none',
          collapsed ? 'w-20' : 'w-72 sm:w-64',
          mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        )}
      >
        {/* Top Header / Collapse bar */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 px-4 py-3.5">
          {/* Desktop Collapse Button */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 lg:flex"
          >
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              {collapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
            {!collapsed && <span>تصغير القائمة</span>}
          </button>

          {/* Mobile Header Inside Sidebar */}
          <div className="flex items-center justify-between w-full lg:hidden">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white font-black text-xs">
                {studentName?.[0] ?? 'ط'}
              </div>
              <div>
                <p className="text-xs font-black text-slate-900 dark:text-white leading-none">{studentName}</p>
                <span className="text-[10px] text-cyan-500 font-bold">القائمة الرئيسية</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-red-50 hover:text-red-600 transition"
              aria-label="إغلاق القائمة"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
          {/* 1. الرئيسية (Dashboard) */}
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-2xl px-4 py-3 font-bold transition-all',
              isHome
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 dark:shadow-blue-500/20'
                : 'text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800/60 hover:text-blue-600 dark:hover:text-blue-400'
            )}
          >
            <LayoutGrid className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="text-sm">الرئيسية</span>}
          </Link>

          {/* 2. الكورسات (Courses) */}
          <div className="space-y-1">
            <Link
              href="/courses"
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-2xl px-4 py-3 font-bold transition-all',
                isCourses
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 dark:shadow-blue-500/20'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800/60 hover:text-blue-600 dark:hover:text-blue-400'
              )}
            >
              <BookOpen className="h-5 w-5 shrink-0" />
              {!collapsed && <span className="text-sm">الكورسات</span>}
            </Link>

            {/* Submenu under Courses */}
            {!collapsed && (
              <div className="mr-6 space-y-1 border-r-2 border-blue-100 dark:border-blue-900/60 pr-3 pt-1">
                <Link
                  href="/courses"
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'block rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors',
                    pathname === '/courses'
                      ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-300'
                  )}
                >
                  جميع الكورسات
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
                >
                  كورساتنا المُقترحة
                </Link>
              </div>
            )}
          </div>

          {/* 3. المنتدى والأسئلة (Forum) */}
          <Link
            href="/forum"
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-2xl px-4 py-3 font-bold transition-all',
              isForum
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800/60 hover:text-blue-600 dark:hover:text-blue-400'
            )}
          >
            <MessageSquare className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="text-sm">المنتدى والأسئلة</span>}
          </Link>

          {/* 4. جروب المنصة (Community Group) */}
          <Link
            href="/community"
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-2xl px-4 py-3 font-bold transition-all',
              pathname === '/community'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800/60 hover:text-blue-600 dark:hover:text-blue-400'
            )}
          >
            <Sparkles className="h-5 w-5 shrink-0 text-cyan-500" />
            {!collapsed && (
              <div className="flex items-center gap-2">
                <span className="text-sm">جروب المنصة</span>
                <span className="rounded-md bg-blue-500/20 text-blue-600 dark:text-cyan-300 text-[10px] px-1.5 py-0.2">جديد</span>
              </div>
            )}
          </Link>

          {/* 4. المحفظة (Wallet) */}
          <Link
            href="/wallet"
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-2xl px-4 py-3 font-bold transition-all',
              isWallet
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800/60 hover:text-blue-600 dark:hover:text-blue-400'
            )}
          >
            <Wallet className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="text-sm">المحفظة والشحن</span>}
          </Link>

          {/* 5. حسابي (Profile) */}
          <Link
            href="/profile"
            onClick={() => setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-2xl px-4 py-3 font-bold transition-all',
              isProfile
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800/60 hover:text-blue-600 dark:hover:text-blue-400'
            )}
          >
            <User className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="text-sm">حسابي</span>}
          </Link>

          {/* 6. الاستفسارات والدعم (WhatsApp) */}
          <a
            href="https://wa.me/201064106070?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%20%D9%85%D8%B3%D8%AA%D8%B1%20%D8%B9%D8%A8%D8%AF%D8%A7%D9%84%D8%B1%D8%AD%D9%85%D9%86%D8%8C%20%D8%B9%D9%86%D8%AF%D9%8A%20%D8%A7%D8%B3%D8%AA%D9%81%D8%B3%D8%A7%D8%B1"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/60"
          >
            <MessageSquare className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            {!collapsed && (
              <div className="flex flex-col text-right">
                <span className="text-sm">الاستفسارات والدعم</span>
                <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-normal">واتساب: 01064106070</span>
              </div>
            )}
          </a>
        </nav>

        {/* Bottom Student Card */}
        {!collapsed && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800/80">
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-slate-900/80 p-3 transition hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 font-bold text-white shadow-md shadow-blue-500/20">
                {studentName?.[0] ?? 'ط'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{studentName}</p>
                <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-cyan-400 font-semibold">
                  <Sparkles className="h-3 w-3" />
                  <span>طالب متميز</span>
                </div>
              </div>
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}

