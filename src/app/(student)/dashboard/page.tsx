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
import { PlatformGroupFeed } from '@/components/community/platform-group-feed';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const student = await getCurrentStudent();
  const supabase = createClient();

  const [
    { data: enrollments },
    { data: publishedCourses },
    { data: attempts },
  ] = await Promise.all([
    supabase.from('enrollments').select('*, course:courses(*)').eq('student_id', student.id),
    supabase.from('courses').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(6),
    supabase.from('exam_attempts').select('*').eq('student_id', student.id),
  ]);

  const activeCoursesCount = (enrollments?.length ?? 0) > 0 ? (enrollments?.length ?? 0) : (publishedCourses?.filter(c => c.is_free).length ?? 0);
  const passedAttemptsCount = attempts?.filter(a => a.is_passed || Number(a.percentage) >= 50).length ?? 0;
  const completedCoursesCount = enrollments?.filter((e: any) => e.progress_percentage === 100)?.length ?? 0;

  // Calculate total average progress
  const avgProgress = activeCoursesCount > 0
    ? Math.min(100, Math.round(((passedAttemptsCount * 35) + (enrollments?.length ? 25 : 10))))
    : 0;

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Top 3 Stat Cards in Cyber Blue ──────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Card 1: Completed Courses / Exams Passed */}
        <div className="flex items-center justify-between rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg shadow-blue-500/20">
          <div>
            <p className="font-display text-4xl font-black">{formatArabicNumber(passedAttemptsCount)}</p>
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
            <p className="font-display text-3xl font-black">{formatCurrencyEGP(student.wallet_balance)}</p>
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
          {(publishedCourses ?? []).map((c: any) => (
            <div
              key={c.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#070B14] shadow-sm transition hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700"
            >
              <div className="relative h-44 w-full overflow-hidden bg-slate-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.thumbnail_url || "/images/course-foundation-languages.jpg"}
                  alt={c.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="mb-2">
                    <span className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
                      {c.is_free ? '🎁 كورس مجاني' : `💎 ${formatCurrencyEGP(c.price)}`}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-2">{c.title}</h4>
                  <p className="mt-2 text-[11px] text-slate-400">{c.duration_hours ? `${c.duration_hours} ساعات شرح` : 'دفعة 2026 / 2027'}</p>
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

      {/* ── Platform Group Community Section (جروب المنصة) ───────────────── */}
      <div className="pt-2">
        <PlatformGroupFeed />
      </div>
    </div>
  );
}



