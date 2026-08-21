import Link from 'next/link';
import Image from 'next/image';
import { 
  Bookmark, 
  BookOpen, 
  CheckSquare, 
  Lightbulb, 
  PlayCircle, 
  Sparkles, 
  ArrowLeft 
} from 'lucide-react';
import { getCurrentStudent } from '@/lib/queries/useStudentServer';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyEGP, formatArabicNumber } from '@/lib/utils';
import { DashboardActivityChart } from '@/components/dashboard/activity-chart';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const student = await getCurrentStudent();
  const supabase = createClient();

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('*, course:courses(*)')
    .eq('student_id', student.id)
    .order('enrolled_at', { ascending: false });

  const activeCoursesCount = enrollments?.length ?? 0;
  const completedCoursesCount = enrollments?.filter((e: any) => e.progress_percentage === 100)?.length ?? 0;

  // Calculate total average progress
  const avgProgress = activeCoursesCount > 0
    ? Math.round(enrollments!.reduce((acc: number, cur: any) => acc + (cur.progress_percentage ?? 0), 0) / activeCoursesCount)
    : 0;

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Top 3 Stat Cards in Cyber Blue ──────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Card 1: Completed Courses */}
        <div className="flex items-center justify-between rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg shadow-blue-500/20">
          <div>
            <p className="font-display text-4xl font-black">{formatArabicNumber(completedCoursesCount)}</p>
            <p className="mt-1 text-sm font-semibold text-white/90">كورس مكتملة</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-md">
            <CheckSquare className="h-6 w-6 text-white" />
          </div>
        </div>

        {/* Card 2: Current Courses */}
        <div className="flex items-center justify-between rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 p-6 text-white shadow-lg shadow-cyan-500/20">
          <div>
            <p className="font-display text-4xl font-black">{formatArabicNumber(activeCoursesCount)}</p>
            <p className="mt-1 text-sm font-semibold text-white/90">كورساتك الحالية</p>
          </div>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-md">
            <Lightbulb className="h-6 w-6 text-white" />
          </div>
        </div>

        {/* Card 3: Saved Videos */}
        <div className="flex items-center justify-between rounded-3xl bg-gradient-to-r from-indigo-700 to-blue-900 p-6 text-white shadow-lg shadow-indigo-500/20">
          <div>
            <p className="font-display text-4xl font-black">{formatArabicNumber(0)}</p>
            <p className="mt-1 text-sm font-semibold text-white/90">الفيديوهات المحفوظة</p>
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
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">تقدمك</h3>
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
            مقياس لكمية الدروس السابقة و المتبقية في كورساتك الحالية!
          </p>
        </div>

        {/* Right Column: Educational Activity Chart */}
        <div className="lg:col-span-8 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0E172A] p-6 shadow-sm transition-colors">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">نشاطك التعليمي</h3>
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span>الأسبوع الماضي</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span>الأسبوع الحالي</span>
              </div>
            </div>
          </div>

          <DashboardActivityChart />

          <p className="mt-2 text-center text-[11px] text-slate-400">
            *ابدأ أول كورس علشان نقدر نعرضلك بيانات نشاطك التعليمية بشكل دقيق!
          </p>
        </div>
      </div>

      {/* ── Bottom Section: Suggested Courses ─────────────────────────────── */}
      <div className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0E172A] p-6 shadow-sm transition-colors">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">الكورسات المقترحة</h3>
          <Link
            href="/courses"
            className="text-xs font-bold text-blue-600 dark:text-cyan-400 hover:underline"
          >
            عرض الكل
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              id: '1',
              title: 'الكورس التأسيسي في البرمجة 2027 | عربي',
              tag: 'كورس مجاني',
              date: 'الدفعة الحالية ٢٠٢٦ / ٢٠٢٧',
            },
            {
              id: '2',
              title: 'الكورس التأسيسي في البرمجة 2027 | لغات',
              tag: 'كورس مجاني',
              date: 'الدفعة الحالية ٢٠٢٦ / ٢٠٢٧',
            },
            {
              id: '3',
              title: 'كورس بايثون والذكاء الاصطناعي الشامل',
              tag: 'كورس مكثف',
              date: 'الدفعة الحالية ٢٠٢٦ / ٢٠٢٧',
            },
          ].map((c) => (
            <div
              key={c.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#070B14] shadow-sm transition hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
            >
              <div className="relative h-44 w-full overflow-hidden bg-slate-950">
                <Image
                  src="/images/teacher-hero.jpg"
                  alt={c.title}
                  fill
                  className="object-cover opacity-90"
                />
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="mb-2">
                    <span className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
                      {c.tag}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{c.title}</h4>
                  <p className="mt-2 text-[11px] text-slate-400">{c.date}</p>
                </div>
                <Link
                  href="/courses"
                  className="mt-4 block w-full rounded-xl border-2 border-blue-600 dark:border-blue-500 py-2 text-center text-xs font-bold text-blue-600 dark:text-blue-400 transition hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white"
                >
                  الدخول للكورس
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


