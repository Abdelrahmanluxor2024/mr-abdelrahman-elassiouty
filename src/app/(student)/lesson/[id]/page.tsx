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

  // تحويل روابط watch إلى embed تلقائياً إن وجدت
  let videoSrc = lesson.video_url || '';
  if (videoSrc.includes('/watch/')) {
    videoSrc = videoSrc.replace('/watch/', '/embed/');
  }

  // كشف نوع الفيديو - iframe (Viemo, Vimeo, YouTube, إلخ) أو فيديو مباشر HTML5
  const isEmbed = videoSrc
    ? /embed|viemo|vimeo\.com|youtube\.com|youtu\.be|bunnycdn|iframe\.mediadelivery/.test(videoSrc)
    : false;


  return (
    <div className="mx-auto max-w-4xl space-y-6" dir="rtl">
      {/* ── Video Player / Interactive View ──────────── */}
      {lesson.video_url ? (
        <div className="overflow-hidden rounded-3xl border border-slate-100 dark:border-slate-800 bg-black shadow-xl">
          <SecureVideoPlayer src={videoSrc} watermarkText={watermark} embed={isEmbed} />
        </div>
      ) : lesson.pdf_url ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-xl">
          <div className="bg-slate-800/90 px-5 py-3.5 border-b border-slate-700 flex items-center justify-between text-white text-xs">
            <span className="font-bold flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-400" />
              مستند ومذكرة المحاضرة (PDF)
            </span>
            <a
              href={lesson.pdf_url}
              target="_blank"
              rel="noreferrer"
              className="bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-xl font-bold text-white transition flex items-center gap-1.5"
            >
              فتح وقراءة المستند ↗
            </a>
          </div>
          <iframe
            src={lesson.pdf_url.includes('drive.google.com') ? lesson.pdf_url.replace('/view?usp=sharing', '/preview').replace('/view', '/preview') : lesson.pdf_url}
            className="w-full h-[580px] bg-slate-950 border-0"
            title="مستند المحاضرة"
            allow="autoplay"
          />
        </div>
      ) : (
        <div className="grid aspect-video place-items-center rounded-3xl bg-gradient-to-tr from-blue-900 to-indigo-800 text-white p-8 shadow-xl">
          <div className="text-center">
            <span className="rounded-full bg-white/20 px-3.5 py-1 text-xs font-bold text-white backdrop-blur-md">
              محاضرة تفاعلية
            </span>
            <p className="mt-4 font-display text-2xl font-black">{lesson.title}</p>
            <p className="mt-2 text-xs text-white/80">المحاضرة مخصصة للاختبار والتدريب العملي</p>
          </div>
        </div>
      )}

      {/* ── Lesson Info & Description Card ──────────── */}
      <Card className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0E172A] p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="font-display text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{lesson.title}</h1>
              {lesson.is_free_preview && (
                <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                  مجاني
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-blue-600 dark:text-cyan-400 font-bold">{lesson.course?.title}</p>
          </div>
        </div>

        <div className="pt-4 space-y-4">
          {lesson.description ? (
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 font-medium">{lesson.description}</p>
          ) : (
            <p className="text-xs text-slate-400">لا يوجد وصف إضافي لهذه المحاضرة.</p>
          )}

          {lesson.pdf_url && (
            <div className="pt-2">
              <a
                href={lesson.pdf_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-5 py-3 text-xs font-bold text-blue-700 dark:text-cyan-300 transition hover:bg-blue-100 hover:scale-[1.01]"
              >
                <FileText className="h-4 w-4 text-blue-600 dark:text-cyan-400" />
                تحميل وفتح ملخص ومذكرة المحاضرة PDF ↗
              </a>
            </div>
          )}
        </div>
      </Card>

      {/* ── Back to Course Button at the bottom ──────────── */}
      <div className="flex justify-center pt-2 pb-6">
        <Button 
          asChild 
          variant="outline" 
          className="rounded-2xl border-2 border-blue-500/30 dark:border-blue-500/40 bg-white dark:bg-[#0E172A] hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-700 dark:text-cyan-300 font-bold px-8 py-3 text-sm shadow-sm transition hover:scale-105"
        >
          <Link href={`/course/${lesson.course.id}`} className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            الرجوع للكورس
          </Link>
        </Button>
      </div>
    </div>
  );
}

