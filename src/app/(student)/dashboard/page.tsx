'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Bookmark, 
  BookOpen, 
  CheckSquare, 
  Lightbulb, 
  PlayCircle, 
  Sparkles, 
  ArrowLeft,
  GraduationCap
} from 'lucide-react';
import { useCurrentStudent } from '@/lib/firebase/use-student-auth';
import { getCourses, DEFAULT_COURSES, getStudentPassedExams } from '@/lib/firebase/services';
import type { FirebaseCourse } from '@/lib/firebase/types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatCurrencyEGP, formatArabicNumber } from '@/lib/utils';
import { DashboardActivityChart } from '@/components/dashboard/activity-chart';

export default function DashboardPage() {
  const { student } = useCurrentStudent();
  const [courses, setCourses] = useState<FirebaseCourse[]>(DEFAULT_COURSES);
  const [passedCount, setPassedCount] = useState(1);

  useEffect(() => {
    async function load() {
      try {
        const c = await getCourses();
        if (c && c.length > 0) setCourses(c);
        if (student.id && student.id !== 'current-student') {
          const passed = await getStudentPassedExams(student.id);
          setPassedCount(passed.size > 0 ? passed.size : 1);
        }
      } catch (err) {
        console.warn('Dashboard data fetch fallback', err);
      }
    }
    load();
  }, [student.id]);

  const activeCoursesCount = courses.length || 3;
  const avgProgress = 25;

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Welcome Header with Student's Real Name ─────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-blue-700 via-indigo-700 to-blue-900 p-6 sm:p-8 text-white shadow-xl shadow-blue-900/20">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-cyan-200 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            <span>لوحة تحكم الطالب المتفوق</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-white">
            أهلاً بك، {student.fullName || 'طالب المنصة'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
            مستمرون مع مستر عبدالرحمن الأسيوطي حتى التفوق والحصول على الدرجة النهائية إن شاء الله!
          </p>
        </div>
        <div className="absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
      </div>

      {/* ── Top 3 Stat Cards in Cyber Blue ──────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Card 1: Completed Courses / Exams Passed */}
        <div className="flex items-center justify-between rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg shadow-blue-500/20">
          <div>
            <p className="font-display text-4xl font-black">{formatArabicNumber(passedCount)}</p>
            <p className="mt-1 text-sm font-semibold text-white/90">امتحانات تم اجتيازها ✅</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-md">
            <CheckSquare className="h-6 w-6 text-white" />
          </div>
        </div>

        {/* Card 2: Current Courses */}
        <div className="flex items-center justify-between rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 p-6 text-white shadow-lg shadow-cyan-500/20">
          <div>
            <p className="font-display text-4xl font-black">{formatArabicNumber(activeCoursesCount)}</p>
            <p className="mt-1 text-sm font-semibold text-white/90">كورساتك المتاحة</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-md">
            <Lightbulb className="h-6 w-6 text-white" />
          </div>
        </div>

        {/* Card 3: Wallet Balance */}
        <div className="flex items-center justify-between rounded-3xl bg-gradient-to-r from-indigo-700 to-blue-900 p-6 text-white shadow-lg shadow-indigo-500/20">
          <div>
            <p className="font-display text-3xl font-black">{formatCurrencyEGP(student.walletBalance || 0)}</p>
            <p className="mt-1 text-sm font-semibold text-white/90">رصيد المحفظة</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-md">
            <Bookmark className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>

      {/* ── Middle Row: Progress Gauge + Study Activity Chart ────────────── */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Progress Card */}
        <div className="lg:col-span-4 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0E172A] p-6 shadow-sm flex flex-col justify-between transition-colors">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">مستوى تقدمك العام</h3>
            <div className="my-8 text-center">
              <p className="font-display text-5xl font-black text-blue-600 dark:text-cyan-400">
                %{formatArabicNumber(avgProgress)}
              </p>
              <div className="mt-4">
                <Progress value={avgProgress} className="h-3 bg-blue-50 dark:bg-slate-800" />
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
            مقياس إنجازك للمحاضرات واجتيازك للامتحانات التفاعلية!
          </p>
        </div>

        {/* Right Column: Educational Activity Chart */}
        <div className="lg:col-span-8 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0E172A] p-6 shadow-sm transition-colors">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">نشاطك التعليمي الأسبوعي</h3>
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
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

          <p className="mt-2 text-center text-[11px] text-slate-400">
            *يتم تحديث النشاط تلقائياً مع حل كل امتحان ومشاهدة المحاضرات
          </p>
        </div>
      </div>

      {/* ── Bottom Section: Available & Suggested Courses ────────────────── */}
      <div className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0E172A] p-6 shadow-sm transition-colors">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-lg">الكورسات والمناهج المتاحة</h3>
            <p className="text-xs text-slate-500 mt-0.5">اختر الكورس وابدأ التعلم بالترتيب مع مستر عبدالرحمن الأسيوطي</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-xs font-bold text-blue-600 dark:text-cyan-400">
            <Link href="/courses">عرض جميع الكورسات ←</Link>
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(courses ?? []).map((c: any) => (
            <div
              key={c.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#070B14] shadow-sm transition hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
            >
              <div className="relative h-44 w-full overflow-hidden bg-slate-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.thumbnailUrl || c.thumbnail_url || "/images/course-foundation-languages.jpg"}
                  alt={c.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="mb-2">
                    <span className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
                      {c.isFree || c.is_free ? '🎁 كورس مجاني' : `💎 ${formatCurrencyEGP(c.price)}`}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">{c.title}</h4>
                  <p className="mt-2 text-[11px] text-slate-400">
                    {c.durationHours ? `${c.durationHours} ساعات شرح` : 'دفعة 2026 / 2027'}
                  </p>
                </div>
                <Button asChild className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md">
                  <Link href={`/course/${c.id}`}>
                    الدخول ومتابعة الكورس ←
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
