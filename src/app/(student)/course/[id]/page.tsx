'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  getCourseById,
  getExamsByCourse,
  getExamByLesson,
  getLessonsByCourse,
  getStudentPassedExams,
  isEnrolledInCourse,
  purchaseCourseFirebase,
} from '@/lib/firebase/services';
import type { FirebaseCourse, FirebaseLesson, FirebaseExam } from '@/lib/firebase/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentStudent } from '@/lib/firebase/use-student-auth';
import {
  CheckCircle2,
  Lock,
  Layers,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CoursePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { student, refreshStudent } = useCurrentStudent();

  const [course, setCourse] = useState<FirebaseCourse | null>(null);
  const [exams, setExams] = useState<FirebaseExam[]>([]);
  const [lessonExams, setLessonExams] = useState<Record<string, string>>({});
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
        setLessons(l);
        setExams(await getExamsByCourse(id));
        const linked = await Promise.all(l.map(async lesson => [lesson.id, (await getExamByLesson(lesson.id))?.id || '']));
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
      <div className="text-center py-20 text-slate-400" dir="rtl">
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
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-l from-[#0E172A] via-[#0B1324] to-[#070B14] p-6 sm:p-10 shadow-2xl">
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
            <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
              {course.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              {course.description}
            </p>
          </div>

          {/* Price / Action Box */}
          <div className="shrink-0 rounded-2xl bg-[#070B14]/80 border border-slate-800 p-5 text-center min-w-[220px]">
            <div className="text-xs text-slate-400">قيمة الاشتراك</div>
            <div className="text-3xl font-black text-white mt-1">
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
                className="mt-4 w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 py-2.5 text-xs font-black text-white shadow-lg shadow-emerald-600/30 transition"
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
          <div className="rounded-2xl bg-[#070B14]/60 p-3 border border-slate-800/50">
            <div className="text-lg sm:text-2xl font-black text-white">
              {course.lessonsCount || lessons.length || 0}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5">محاضرات الكورس</div>
          </div>
          <div className="rounded-2xl bg-[#070B14]/60 p-3 border border-slate-800/50">
            <div className="text-lg sm:text-2xl font-black text-amber-400">
              {lessons.filter(l => l.videoUrl).length + lessons.filter(l => l.pdfUrl).length}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5">أجزاء وتدريبات</div>
          </div>
          <div className="rounded-2xl bg-[#070B14]/60 p-3 border border-slate-800/50">
            <div className="text-lg sm:text-2xl font-black text-cyan-400">
              {exams.length}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-400 mt-0.5">واجبات وامتحانات</div>
          </div>
        </div>
      </div>

      {course.modules?.length ? <section className="rounded-3xl border border-blue-500/30 bg-blue-500/5 p-6 space-y-3"><h2 className="font-black text-xl">٣ كورسات في اشتراك واحد</h2><p className="text-sm text-slate-400">السعر للباقة كاملة وليس لكل كورس فرعي. بعد تأكيد الدفع تقدر تدخل أي وحدة.</p><div className="grid gap-3 sm:grid-cols-3">{course.modules.map((module, index) => <div className="rounded-2xl border border-slate-700 p-4" key={module.id}><span className="text-cyan-400 font-black">٠{index + 1}</span><h3 className="font-bold mt-2">{module.title}</h3><p className="text-xs text-slate-400 mt-2">درس فيديو + PDF + امتحان</p></div>)}</div></section> : null}
      {/* ── Lessons List ─────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-blue-500" />
            محاضرات ودروس الكورس
          </h2>
          <span className="text-xs text-slate-400 font-bold">
            {lessons.length} محاضرة متاحة
          </span>
        </div>

        {!isSubscribed && !course.isFree && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-sm font-bold text-amber-300">
            🔒 يجب الاشتراك في الكورس أولاً للوصول إلى المحاضرات
          </div>
        )}

        {!lessons.length && <div className="rounded-2xl border border-dashed p-8 text-center text-slate-400">المعلم يجهز دروس الكورس. تابعنا قريباً.</div>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson, idx) => {
            const isFirst = idx === 0;
            const prevLesson = idx > 0 ? lessons[idx - 1] : null;
            // Lock if: not subscribed, OR (not first lesson AND previous exam not passed)
            const previousExamId = prevLesson ? lessonExams[prevLesson.id] : null;
            const isLocked = !isSubscribed || (course.sequentialLearning === true && !isFirst && !!previousExamId && !passedExams.has(previousExamId));

            return (
              <div
                key={lesson.id}
                className={cn(
                  'group flex flex-col justify-between overflow-hidden rounded-3xl border bg-[#0B1324] shadow-lg transition-all duration-300',
                  isLocked
                    ? 'border-slate-800/80 opacity-70'
                    : 'border-slate-800 hover:border-blue-500/50 hover:shadow-2xl'
                )}
              >
                <div>
                  {/* Thumbnail */}
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={course.thumbnailUrl || "/images/course-foundation-languages.jpg"}
                      alt={lesson.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B1324] via-transparent to-black/50" />

                    {isLocked && (
                      <div className="absolute inset-0 grid place-items-center bg-black/60 backdrop-blur-[2px]">
                        <div className="flex items-center gap-1.5 rounded-2xl bg-black/80 border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300">
                          <Lock className="h-4 w-4 text-amber-400" />
                          {!isSubscribed ? 'اشترك في الكورس أولاً' : 'اجتز امتحان الدرس السابق أولاً'}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-3">
                    {lesson.moduleTitle && <p className="text-xs font-bold text-cyan-400">{lesson.moduleTitle}</p>}
                    <h3 className="text-base font-black text-white line-clamp-2">
                      {lesson.title}
                    </h3>
                    {lesson.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {lesson.description}
                      </p>
                    )}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        <span>فيديو الشرح التفاعلي والمفاهيم الأساسية</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        <span>مذكرة وتطبيقات المحاضرة بصيغة PDF</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        <span>امتحان تقييمي إلكتروني بعد الحصة</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-5 pt-0">
                  {isLocked ? (
                    <button
                      disabled
                      className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 py-3 text-center text-xs font-bold text-slate-500 cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Lock className="h-3.5 w-3.5" /> مقفول حالياً
                    </button>
                  ) : (
                    <Link
                      href={`/lesson/${lesson.id}`}
                      className="flex items-center justify-center gap-1.5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 py-3 text-center text-xs font-black text-white shadow-lg shadow-blue-600/30 transition hover:scale-[1.02]"
                    >
                      الدخول للدرس
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {exams.length > 0 && <section className="space-y-4"><h2 className="text-xl font-black text-white">امتحانات الكورس</h2><div className="grid gap-4 sm:grid-cols-2">{exams.map(exam => <div key={exam.id} className="rounded-2xl border border-slate-800 bg-[#0B1324] p-5 space-y-3"><h3 className="font-bold text-white">{exam.title}</h3><p className="text-sm text-slate-400">{exam.questionsCount} سؤال · {exam.durationMinutes} دقيقة · النجاح من {exam.passingMarks} / {exam.totalMarks}</p>{isSubscribed ? <Link href={`/exam/${exam.id}`} className="inline-block rounded-xl bg-blue-600 px-5 py-2 text-white font-bold">ابدأ الامتحان</Link> : <p className="text-sm text-amber-300">اشترك في الكورس لبدء الامتحان</p>}</div>)}</div></section>}
    </div>
  );
}
