'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  getCourseById,
  getExamsByLesson,
  getLessonsByCourse,
  getStudentPassedExams,
  isEnrolledInCourse,
  purchaseCourseFirebase,
} from '@/lib/firebase/services';
import type { FirebaseCourse, FirebaseLesson } from '@/lib/firebase/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentStudent } from '@/lib/firebase/use-student-auth';
import {
  CheckCircle2,
  Lock,
  Layers,
  ChevronLeft,
  PlayCircle, FileText, Video, ArrowUpLeft,
} from 'lucide-react';
import { lessonVideos, lessonFiles } from '@/lib/learning-content';
import { cn } from '@/lib/utils';

export default function CoursePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { student, refreshStudent } = useCurrentStudent();

  const [course, setCourse] = useState<FirebaseCourse | null>(null);
  const [lessonExams, setLessonExams] = useState<Record<string, string[]>>({});
  const [lessons, setLessons] = useState<FirebaseLesson[]>([]);
  const [passedExams, setPassedExams] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true); setIsSubscribed(false);
      try {
        const c = await getCourseById(id);
        setCourse(c);

        const l = await getLessonsByCourse(id);
        l.sort((a, b) => {const rank = (id?: string) => {const i = c?.modules?.findIndex(m => m.id === id); return i === undefined || i < 0 ? Number.MAX_SAFE_INTEGER : i;}; return rank(a.moduleId) - rank(b.moduleId) || a.orderIndex - b.orderIndex;});
        setLessons(l);
        const linked = await Promise.all(l.map(async lesson => [lesson.id, (await getExamsByLesson(lesson.id)).map(e => e.id)]));
        setLessonExams(Object.fromEntries(linked));

        const studentId = student?.id || 'current-student';

        // Check real enrollment
        const enrolled = await isEnrolledInCourse(studentId, id);
        if (cancelled) return;
        setIsSubscribed(enrolled);

        // Get passed exams
        const passed = await getStudentPassedExams(studentId);
        setPassedExams(passed);
      } catch (err) {
        console.error('Failed to load course details', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {cancelled = true;};
  }, [id, student?.id]);

  const handleSubscribe = async () => {
    const studentId = student?.id;
    if (!studentId || studentId === 'current-student') {
      toast.error('يجب تسجيل الدخول أولاً للشراء.');
      return;
    }

    if (course && !course.isFree && !confirm(`سيتم خصم ${course.price} جنيه من رصيد محفظتك لتفعيل الكورس. تأكيد الشراء؟`)) return;
    setIsPurchasing(true);
    try {
      const result = await purchaseCourseFirebase(studentId, id);
      if (result.ok) {
        const verified = await isEnrolledInCourse(studentId, id);
        if (!verified) {toast.error('لم يتم تأكيد الاشتراك. أعد تحميل الصفحة أو راجع الإدارة قبل إعادة الدفع'); return;}
        setIsSubscribed(true);
        if (refreshStudent) await refreshStudent();
        if (result.alreadyEnrolled) {
          toast.info('أنت مشترك في هذا الكورس بالفعل.');
        } else {
          toast.success('🎉 تم الاشتراك في الكورس بنجاح! يمكنك الآن متابعة المحاضرات.');
        }
      } else {
        toast.error(result.error || 'فشل الاشتراك، يرجى المحاولة مرة أخرى.');
      }
    } catch (err) {
      toast.error('حدث خطأ غير متوقع، حاول مجدداً.');
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6" dir="rtl">
        <Skeleton className="h-64 w-full rounded-3xl bg-slate-800/40" />
        <Skeleton className="h-32 w-full rounded-3xl bg-slate-800/40" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-20 text-muted" dir="rtl">
        <p className="text-lg font-bold">الكورس المطلوب غير موجود أو تم نقله.</p>
        <Link href="/courses" className="mt-4 inline-block text-blue-400 font-bold hover:underline">
          العودة لكل الكورسات ←
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir="rtl">
      {/* ── Hero Header ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 theme-inverse bg-gradient-to-l from-[#0E172A] via-[#0B1324] to-[#070B14] p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {isSubscribed && (
              <div className="inline-flex items-center gap-2 rounded-2xl bg-blue-950/80 border border-blue-500/30 px-3.5 py-1.5 text-xs font-black text-cyan-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>أنت مشترك في هذا الكورس</span>
              </div>
            )}
            <h1 className="text-2xl sm:text-4xl font-black text-ink leading-tight">
              {course.title}
            </h1>
            <p className="text-xs sm:text-sm text-muted leading-relaxed font-medium">
              {course.description}
            </p>
          </div>

          {/* Price / Action Box */}
          <div className="shrink-0 rounded-2xl theme-panel bg-slate-50/80 dark:bg-[#070B14]/80 border border-slate-200 dark:border-slate-800 p-5 text-center min-w-[220px]">
            <div className="text-xs text-muted">قيمة الاشتراك</div>
            <div className="text-3xl font-black text-ink mt-1">
              {course.isFree ? (
                <span className="text-emerald-400">مجاناً</span>
              ) : (
                <>
                  {course.price} <span className="text-base text-amber-400">ج.م</span>
                </>
              )}
            </div>

            {!isSubscribed ? (
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={isPurchasing}
                className="mt-4 w-full rounded-xl theme-inverse bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 py-2.5 text-xs font-black text-ink shadow-lg shadow-emerald-600/30 transition"
              >
                {isPurchasing ? 'جاري تأكيد العملية…' : course.isFree ? 'اشترك مجاناً' : `ادفع ${course.price} ج.م من المحفظة`}
              </button>
            ) : (
              <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> تم التفعيل بنجاح
              </div>
            )}
          </div>
        </div>

        {/* Course Stats */}
        <div className="mt-8 grid grid-cols-3 gap-3 border-t border-slate-800/80 pt-6 text-center">
          <div className="rounded-2xl theme-panel bg-slate-50/60 dark:bg-[#070B14]/60 p-3 border border-slate-800/50">
            <div className="text-lg sm:text-2xl font-black text-ink">
              {lessons.length}
            </div>
            <div className="text-[11px] sm:text-xs text-muted mt-0.5">محاضرات الكورس</div>
          </div>
          <div className="rounded-2xl theme-panel bg-slate-50/60 dark:bg-[#070B14]/60 p-3 border border-slate-800/50">
            <div className="text-lg sm:text-2xl font-black text-amber-400">
              {lessons.reduce((sum, l) => sum + lessonVideos(l).length, 0)}
            </div>
            <div className="text-[11px] sm:text-xs text-muted mt-0.5">فيديوهات الشرح</div>
          </div>
          <div className="rounded-2xl theme-panel bg-slate-50/60 dark:bg-[#070B14]/60 p-3 border border-slate-800/50">
            <div className="text-lg sm:text-2xl font-black text-cyan-400">
              {lessons.reduce((sum, l) => sum + lessonFiles(l).length, 0)}
            </div>
            <div className="text-[11px] sm:text-xs text-muted mt-0.5">ملفات المذاكرة</div>
          </div>
        </div>
      </div>

      <section className="space-y-6" aria-labelledby="lessons-title">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="mb-2 text-xs font-bold tracking-wide text-blue-600 dark:text-cyan-400">رحلتك في الكورس</p><h2 id="lessons-title" className="text-2xl sm:text-3xl font-black text-ink dark:text-white">كل درس، خطوة لقدّام.</h2><p className="mt-2 text-sm text-muted dark:text-slate-400">شرح واضح ومذكرة في مكان واحد. اختار درسك وابدأ على راحتك.</p></div>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-cyan-300">{lessons.length.toLocaleString('ar-EG')} دروس في الكورس</span>
        </div>
        {!isSubscribed && <div className="flex items-center gap-3 rounded-2xl border border-amber-300/40 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"><Lock className="h-5 w-5 shrink-0"/>فعّل اشتراكك لفتح الشرح والمذكرات.</div>}
        {!lessons.length && <div className="rounded-3xl border border-dashed p-10 text-center text-muted">بنجهز لك دروس مميزة. تابعنا قريباً.</div>}
        <div className="grid gap-5 lg:grid-cols-2">
          {lessons.map((lesson, index) => {
            const previous = index > 0 ? lessonExams[lessons[index - 1].id] : null;
            const sequenceLocked = course.sequentialLearning === true && !!previous?.length && !previous.every(exam => passedExams.has(exam));
            const locked = !isSubscribed || sequenceLocked;
            const completed = !!lessonExams[lesson.id]?.length && lessonExams[lesson.id].every(exam => passedExams.has(exam));
            return <article key={lesson.id} className={cn('group relative flex flex-col overflow-hidden rounded-[28px] border theme-panel bg-white dark:bg-slate-900 transition-all duration-300 dark:bg-[#0c1424]', locked ? 'border-slate-200 dark:border-slate-800' : 'border-blue-100 hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 dark:border-slate-700/70 dark:hover:border-cyan-500/60')}>
              <div className="relative flex items-center justify-between gap-4 overflow-hidden border-b border-slate-100 bg-gradient-to-l from-blue-50 via-slate-50 to-white px-6 py-5 dark:border-slate-800 dark:from-blue-950/70 dark:via-slate-900/60 dark:to-[#0c1424]">
                <div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl theme-inverse bg-blue-600 text-sm font-black text-ink shadow-lg shadow-blue-500/20">{String(index + 1).padStart(2, '0')}</span><span className="text-xs font-bold text-muted dark:text-slate-300">{lesson.moduleTitle || `الدرس ${index + 1}`}</span></div>
                <span className={cn('shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold', completed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : locked ? 'bg-slate-200/70 text-muted dark:bg-slate-800 dark:text-slate-400' : 'bg-blue-100 text-blue-700 dark:bg-cyan-400/10 dark:text-cyan-300')}>{completed ? 'تم اجتيازه ✓' : locked ? 'مقفل حالياً' : 'جاهز للتعلّم'}</span>
              </div>
              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <div className="mb-5 flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-50 text-blue-600 dark:bg-blue-500/10 dark:text-cyan-400"><PlayCircle className="h-7 w-7"/></div><div><h3 className="text-lg font-black leading-relaxed text-ink dark:text-white">{lesson.title}</h3><p className="mt-2 line-clamp-2 text-sm leading-7 text-muted dark:text-slate-400">{lesson.description || 'ابدأ الشرح، رتّب أفكارك، وراجع أهم النقاط من مذكرة الدرس.'}</p></div></div>
                <div className="mb-6 flex flex-wrap gap-2">{lessonVideos(lesson).length > 0 && <span className="inline-flex items-center gap-2 rounded-xl theme-panel bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-muted dark:bg-slate-800/60 dark:text-slate-300"><Video className="h-4 w-4 text-blue-500"/>{lessonVideos(lesson).length} فيديو</span>}{lessonFiles(lesson).length > 0 && <span className="inline-flex items-center gap-2 rounded-xl theme-panel bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-muted dark:bg-slate-800/60 dark:text-slate-300"><FileText className="h-4 w-4 text-teal-500"/>{lessonFiles(lesson).length} ملفات PDF</span>}</div>
                <div className="mt-auto border-t border-slate-100 pt-5 dark:border-slate-800">{locked ? <button disabled className="flex w-full items-center justify-center gap-2 rounded-2xl theme-panel bg-slate-100 dark:bg-slate-800 py-3.5 text-sm font-bold text-muted dark:bg-slate-800"><Lock className="h-4 w-4"/>{sequenceLocked && isSubscribed ? 'أكمل الدرس السابق أولاً' : 'اشترك لفتح الدرس'}</button> : <Link href={`/lesson/${lesson.id}`} className="flex w-full items-center justify-between rounded-2xl theme-inverse bg-blue-600 px-5 py-3.5 text-sm font-black text-ink transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500"><span>{completed ? 'ارجع لشرح الدرس' : 'يلا نبدأ الدرس'}</span><ArrowUpLeft className="h-5 w-5 transition group-hover:-translate-x-1 group-hover:-translate-y-1"/></Link>}</div>
              </div>
            </article>;
          })}
        </div>
        <p className="text-center text-xs text-muted">كل محتوى الدرس متجمع جواه، علشان تركّز في خطوة واحدة كل مرة.</p>
      </section>
    </div>
  );
}
