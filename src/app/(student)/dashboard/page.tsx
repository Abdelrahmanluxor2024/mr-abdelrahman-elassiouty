'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  CheckSquare,
  Lightbulb,
  GraduationCap
} from 'lucide-react';
import { getCourses, getStudentPassedExams } from '@/lib/firebase/services';
import type { FirebaseCourse } from '@/lib/firebase/types';
import { Progress } from '@/components/ui/progress';
import { formatArabicNumber } from '@/lib/utils';
import { DashboardActivityChart } from '@/components/dashboard/activity-chart';

interface StudentInfo {
  uid: string;
  full_name: string;
  wallet_balance: number;
}

export default function DashboardPage() {
  const [student, setStudent] = useState<StudentInfo>({ uid: '', full_name: 'طالب', wallet_balance: 0 });
  const [courses, setCourses] = useState<FirebaseCourse[]>([]);
  const [passedCount, setPassedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const match = typeof document !== 'undefined' ? document.cookie.match(/(?:^|;\s*)token=([^;]*)/) : null;
        const token = match ? decodeURIComponent(match[1]) : 'guest';

        const [coursesData, passedExams] = await Promise.all([
          getCourses(),
          getStudentPassedExams(token),
        ]);

        if (!isMounted) return;

        setCourses(coursesData.slice(0, 6));
        setPassedCount(passedExams.size);

        if (token && token !== 'guest') {
          try {
            const { getUserProfile } = await import('@/lib/firebase/auth-service');
            const profile = await getUserProfile(token);
            if (profile && isMounted) {
              setStudent({
                uid: token,
                full_name: profile.fullName || profile.full_name || 'طالب',
                wallet_balance: profile.walletBalance || profile.wallet_balance || 0,
              });
            }
          } catch {}
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const avgProgress = Math.min(100, passedCount * 25);

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Welcome Banner ────────────────────────────── */}
      <div className="rounded-3xl bg-gradient-to-l from-blue-600/10 via-[#0B1324] to-[#0E172A] border border-blue-500/20 p-6 flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm font-bold">مرحباً بك في لوحة التحكم 👋</p>
          <h2 className="text-2xl font-black text-white mt-1">
            {isLoading ? '...' : student.full_name}
          </h2>
          <p className="text-xs text-slate-400 mt-1">تابع مستواك واجتز الامتحانات لفتح المحاضرات الجديدة</p>
        </div>
        <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
          <GraduationCap className="h-8 w-8" />
        </div>
      </div>

      {/* ── Top 3 Stat Cards ─────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg shadow-blue-500/20">
          <div>
            <p className="font-display text-4xl font-black">{formatArabicNumber(passedCount)}</p>
            <p className="mt-1 text-sm font-semibold text-white/90">امتحانات تم اجتيازها ✅</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-md">
            <CheckSquare className="h-6 w-6 text-white" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 p-6 text-white shadow-lg shadow-cyan-500/20">
          <div>
            <p className="font-display text-4xl font-black">{formatArabicNumber(courses.length)}</p>
            <p className="mt-1 text-sm font-semibold text-white/90">كورساتك المتاحة</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-md">
            <Lightbulb className="h-6 w-6 text-white" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-3xl bg-gradient-to-r from-indigo-700 to-blue-900 p-6 text-white shadow-lg shadow-indigo-500/20">
          <div>
            <p className="font-display text-3xl font-black">
              {isLoading ? '...' : `${student.wallet_balance} L.E`}
            </p>
            <p className="mt-1 text-sm font-semibold text-white/90">رصيد المحفظة</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-md">
            <Bookmark className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>

      {/* ── Progress + Activity Chart ──────────────── */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4 rounded-3xl border border-slate-800 bg-[#0E172A] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-200 text-base">مستوى تقدمك العام</h3>
            <div className="my-8 text-center">
              <p className="font-display text-5xl font-black text-cyan-400">
                {formatArabicNumber(avgProgress)}%
              </p>
              <div className="mt-4">
                <Progress value={avgProgress} className="h-3 bg-slate-800" />
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400 text-center leading-relaxed">
            مقياس إنجازك للمحاضرات واجتيازك للامتحانات التفاعلية!
          </p>
        </div>

        <div className="lg:col-span-8 rounded-3xl border border-slate-800 bg-[#0E172A] p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-white text-base">نشاطك التعليمي الأسبوعي</h3>
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>المعدل الموصى به</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span>إنجازك الفعلي</span>
              </div>
            </div>
          </div>
          <DashboardActivityChart />
          <p className="mt-2 text-center text-[11px] text-slate-500">
            *يتم تحديث النشاط تلقائياً مع حل كل امتحان ومشاهدة المحاضرات
          </p>
        </div>
      </div>

      {/* ── Available Courses Grid ─────────────────── */}
      <div className="rounded-3xl border border-slate-800 bg-[#0E172A] p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-lg">الكورسات والمناهج المتاحة</h3>
            <p className="text-xs text-slate-400 mt-0.5">اختر الكورس وابدأ التعلم بالترتيب مع مستر عبدالرحمن الأسيوطي</p>
          </div>
          <Link href="/courses" className="text-xs font-bold text-cyan-400 hover:underline">
            عرض جميع الكورسات ←
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-52 rounded-2xl bg-slate-800/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <div
                key={c.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#070B14] shadow-sm transition hover:border-blue-500/50 hover:shadow-xl"
              >
                <div className="relative h-40 w-full overflow-hidden bg-slate-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.thumbnailUrl || '/images/course-foundation-languages.jpg'}
                    alt={c.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070B14] via-transparent to-black/30" />
                  <span className="absolute top-2 right-2 rounded-lg bg-blue-600/90 px-2.5 py-1 text-[11px] font-black text-white">
                    {c.tag || 'كورس'}
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-xs font-black text-amber-400">
                      {c.isFree ? '🎁 مجاني' : `${c.price} L.E`}
                    </span>
                    <h4 className="font-bold text-white text-sm line-clamp-2 mt-1">{c.title}</h4>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {c.durationHours ? `${c.durationHours} ساعات شرح` : 'دفعة 2026 / 2027'}
                    </p>
                  </div>
                  <Link
                    href={`/course/${c.id}`}
                    className="block w-full rounded-xl bg-blue-600 hover:bg-blue-500 py-2 text-center text-xs font-black text-white shadow-md shadow-blue-600/20 transition"
                  >
                    الدخول ومتابعة الكورس ←
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
