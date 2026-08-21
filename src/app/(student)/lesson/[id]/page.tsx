'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useLesson, useCourseEnrollment } from '@/lib/queries/useCourses';
import { useStudent } from '@/lib/queries/useStudent';
import { SecureVideoPlayer } from '@/components/course/secure-video-player';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FileText, ClipboardList, BookOpen, ArrowRight, Sparkles, CheckCircle2, Lock, ShoppingCart } from 'lucide-react';
import { formatCurrencyEGP } from '@/lib/utils';

export default function LessonPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: lesson, isLoading } = useLesson(id);
  const { data: student } = useStudent();
  const { data: enrollment, isLoading: enrollmentLoading } = useCourseEnrollment(lesson?.course_id ?? '');

  if (isLoading || enrollmentLoading) return <Skeleton className="h-96 w-full rounded-3xl" />;
  if (!lesson) return <p className="text-slate-500">المحاضرة غير موجودة.</p>;

  const isAuthorized = lesson.course?.is_free || lesson.is_free_preview || !!enrollment;

  if (!isAuthorized) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center" dir="rtl">
        <div className="rounded-3xl border border-amber-300 dark:border-amber-700/80 bg-white dark:bg-[#0E172A] p-8 shadow-2xl space-y-6">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
            <Lock className="h-10 w-10" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-black text-slate-900 dark:text-white">
              هذه المحاضرة تتطلب الاشتراك في الكورس 🔒
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              كورس &quot;{lesson.course?.title}&quot; كورس مدفوع ({formatCurrencyEGP(lesson.course?.price ?? 0)}). يرجى الاشتراك في الكورس للوصول إلى الفيديو والواجبات والامتحانات.
            </p>
          </div>
          <div className="pt-2">
            <Button asChild className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3 rounded-2xl shadow-lg shadow-blue-500/30">
              <Link href={`/course/${lesson.course_id}`}>
                <ShoppingCart className="h-5 w-5 ms-2" />
                الانتقال لصفحة الكورس للاشتراك
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const watermark = student ? `${student.full_name} • ${student.phone}` : 'منصة مستر عبدالرحمن الأسيوطي';
  const exam = lesson.exam?.[0];

  // كشف نوع الفيديو - Vimeo أو YouTube = iframe, غيره = HTML5
  const isEmbed = lesson.video_url
    ? /vimeo\.com|youtube\.com|youtu\.be|bunnycdn|iframe\.mediadelivery/.test(lesson.video_url)
    : false;


  return (
    <div className="grid gap-6 lg:grid-cols-3" dir="rtl">
      {/* ── Main Content: Video Player + Lesson Details ──────────── */}
      <div className="space-y-4 lg:col-span-2">
        {lesson.video_url ? (
          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-black shadow-lg">
            <SecureVideoPlayer src={lesson.video_url} watermarkText={watermark} embed={isEmbed} />
          </div>
        ) : (
          <div className="grid aspect-video place-items-center rounded-3xl bg-gradient-to-tr from-purple-900 to-indigo-800 text-white p-8">
            <div className="text-center">
              <span className="rounded-full bg-white/20 px-3.5 py-1 text-xs font-bold text-white backdrop-blur-md">
                محاضرة تفاعلية
              </span>
              <p className="mt-4 font-display text-2xl font-black">{lesson.title}</p>
              <p className="mt-2 text-xs text-white/80">المحاضرة مخصصة للاختبار والتدريب العملي</p>
            </div>
          </div>
        )}

        {/* Lesson Info Card */}
        <Card className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-display text-xl font-black text-slate-900">{lesson.title}</h1>
                {lesson.is_free_preview && (
                  <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                    مجاني
                  </span>
                )}
              </div>
              <p className="text-xs text-purple-700 font-semibold">{lesson.course.title}</p>
            </div>
          </div>

          <div className="pt-4 space-y-4">
            {lesson.description && (
              <p className="text-sm leading-relaxed text-slate-600">{lesson.description}</p>
            )}

            {lesson.pdf_url && (
              <a
                href={lesson.pdf_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-purple-50 px-4 py-2.5 text-xs font-bold text-purple-800 transition hover:bg-purple-100"
              >
                <FileText className="h-4 w-4 text-purple-700" />
                تحميل ملخص ومذكرة المحاضرة PDF
              </a>
            )}
          </div>
        </Card>
      </div>

      {/* ── Sidebar: Exam Card + About Course Card ──────────────── */}
      <div className="space-y-4">
        {/* Exam Card */}
        <Card className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-purple-50 text-purple-700">
              <ClipboardList className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">امتحان المحاضرة</h3>
          </div>

          {exam ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-purple-50/50 p-4 border border-purple-100/60">
                <p className="font-bold text-slate-900 text-sm">{exam.title}</p>
                <p className="mt-1 text-xs text-slate-500 font-medium">المدة: {exam.duration_minutes} دقيقة</p>
              </div>

              <Button 
                asChild 
                className="w-full rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 shadow-md shadow-purple-700/20"
              >
                <Link href={`/exam/${exam.id}`}>ابدأ الامتحان</Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center">
              <p className="text-xs font-semibold text-slate-500">لا يوجد امتحان مرتبط بهذه المحاضرة.</p>
            </div>
          )}
        </Card>

        {/* About Course Card */}
        <Card className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base">عن الكورس</h3>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">{lesson.course.description}</p>
            <Button 
              asChild 
              variant="outline" 
              className="w-full rounded-2xl border-purple-200 text-purple-800 hover:bg-purple-50 font-bold py-2.5"
            >
              <Link href={`/course/${lesson.course.id}`}>الرجوع للكورس</Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

