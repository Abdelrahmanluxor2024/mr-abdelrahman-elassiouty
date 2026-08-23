'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCourse, useCourseEnrollment, useStudentPassedExams } from '@/lib/queries/useCourses';
import { purchaseCourse } from '@/app/actions/wallet';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, PlayCircle, ClipboardList, CheckCircle2, Lock, Wallet, ShoppingCart, Loader2, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrencyEGP } from '@/lib/utils';

export default function CoursePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { data, isLoading } = useCourse(id);
  const { data: enrollment, isLoading: enrollmentLoading, refetch: refetchEnrollment } = useCourseEnrollment(id);
  const { data: passedExams = new Set<string>() } = useStudentPassedExams();
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (isLoading || enrollmentLoading) return <Skeleton className="h-96 w-full rounded-3xl" />;
  if (!data) return <p className="text-slate-500">الكورس غير موجود.</p>;

  const isPurchased = data.is_free || !!enrollment;

  function handlePurchase() {
    startTransition(async () => {
      const res = await purchaseCourse(id);
      if (!res.ok) {
        toast.error(res.error);
        if (res.needsTopup) {
          router.push('/wallet');
        }
        return;
      }
      toast.success('🎉 تم الاشتراك في الكورس بنجاح! تم فتح المحاضرة الأولى.');
      await refetchEnrollment();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3" dir="rtl">
      {/* ── Right Column: Course Info ─────────────────────────── */}
      <div className="space-y-4 lg:col-span-1">
        {/* Thumbnail */}
        <div className="relative aspect-video w-full overflow-hidden rounded-3xl bg-slate-950 shadow-xl border border-slate-100 dark:border-slate-800">
          <Image
            src={data.thumbnail_url || "/images/teacher-hero.jpg"}
            alt={data.title}
            fill
            className="object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-4 right-4">
            <h1 className="font-display text-lg font-black text-white leading-snug drop-shadow-md">
              {data.title}
            </h1>
          </div>
        </div>

        {/* Free/Price Badge / Purchase Card */}
        {data.is_free ? (
          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 py-3 text-center text-sm font-bold text-emerald-700 dark:text-emerald-300">
            ✅ هذا الكورس مجاني ومتاح لجميع الطلاب!
          </div>
        ) : isPurchased ? (
          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 p-4 text-center space-y-1">
            <p className="text-sm font-black text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              أنت مشترك بالفعل في هذا الكورس
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">تابع الدروس بالترتيب واجتز امتحاناتها بالنجاح للتقدم</p>
          </div>
        ) : (
          <div className="rounded-3xl border-2 border-blue-500/30 bg-white dark:bg-[#0E172A] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <p className="text-xs text-slate-500">قيمة الكورس</p>
                <p className="font-display text-2xl font-black text-blue-600 dark:text-cyan-400">
                  {formatCurrencyEGP(data.price)}
                </p>
              </div>
              <div className="rounded-2xl bg-blue-50 dark:bg-blue-950 p-2.5 text-blue-600 dark:text-cyan-400">
                <Wallet className="h-6 w-6" />
              </div>
            </div>

            <Button
              onClick={handlePurchase}
              disabled={isPending}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 transition hover:scale-[1.02]"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ms-2" />
                  جاري الاشتراك وخصم الرصيد...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 ms-2" />
                  شراء واشتراك في الكورس ({formatCurrencyEGP(data.price)})
                </>
              )}
            </Button>
            <p className="text-center text-[11px] text-slate-400">
              يتم خصم المبلغ مباشرة من محفظتك على المنصة
            </p>
          </div>
        )}

        {/* Description */}
        <div className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0E172A] p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">تفاصيل ومحاور الكورس</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {data.description || 'كورس تعليمي شامل ومكثف مع مستر عبدالرحمن الأسيوطي.'}
          </p>
        </div>
      </div>

      {/* ── Left Column: Lessons Accordion ───────────────────── */}
      <div className="space-y-3 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-black text-slate-900 dark:text-white">الدروس والمحاضرات (بالترتيب)</h2>
          {!isPurchased && (
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-xl border border-amber-300 dark:border-amber-800">
              🔒 مقفل - يلزم الاشتراك
            </span>
          )}
        </div>

        {data.lessons.map((lesson, i) => {
          const getExamId = (l: any) => l.exams?.[0]?.id || l.exam?.[0]?.id;
          const lessonExamId = getExamId(lesson);

          // Sequential Lock Check:
          let isLessonUnlocked = isPurchased;
          let lockReason = '';

          if (!isPurchased) {
            isLessonUnlocked = false;
            lockReason = 'يلزم الاشتراك في الكورس أولاً';
          } else if (i > 0) {
            // Must have passed exam for all previous lessons
            for (let prevIdx = 0; prevIdx < i; prevIdx++) {
              const prev = data.lessons[prevIdx];
              const prevExamId = getExamId(prev);
              if (prev.has_exam && prevExamId) {
                if (!passedExams.has(prevExamId)) {
                  isLessonUnlocked = false;
                  lockReason = `يجب اجتياز امتحان "${prev.title}" أولاً بنجاح`;
                  break;
                }
              }
            }
          }

          const hasPassedThisExam = !!lessonExamId && passedExams.has(lessonExamId);
          const isOpen = openLesson === lesson.id && isLessonUnlocked;

          return (
            <div
              key={lesson.id}
              className={cn(
                'overflow-hidden rounded-2xl border transition-all',
                isOpen
                  ? 'border-blue-500 bg-blue-600 shadow-lg shadow-blue-600/25 text-white'
                  : isLessonUnlocked
                  ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E172A] hover:border-blue-300 dark:hover:border-blue-700'
                  : 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#0A101D] opacity-80'
              )}
            >
              {/* Header */}
              <button
                type="button"
                onClick={() => {
                  if (!isPurchased) {
                    toast.error('⚠️ هذا الكورس مدفوع. يرجى الاشتراك أولاً للوصول للدروس.');
                    return;
                  }
                  if (!isLessonUnlocked) {
                    toast.error(`🔒 هذا الدرس مقفل: ${lockReason}`);
                    return;
                  }
                  setOpenLesson(isOpen ? null : lesson.id);
                }}
                className="flex w-full items-center justify-between px-5 py-4 text-right"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black',
                      isOpen
                        ? 'bg-white/20 text-white'
                        : hasPassedThisExam
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : isLessonUnlocked
                        ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    )}
                  >
                    {hasPassedThisExam ? <CheckCircle2 className="h-4 w-4" /> : isLessonUnlocked ? i + 1 : <Lock className="h-3.5 w-3.5" />}
                  </span>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <p className={cn('font-bold text-sm', isOpen ? 'text-white' : isLessonUnlocked ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400')}>
                        {lesson.title}
                      </p>
                      {hasPassedThisExam && (
                        <span className="rounded-md bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5">
                          تم اجتيازه ✅
                        </span>
                      )}
                    </div>
                    {lesson.description && (
                      <p className={cn('text-xs mt-0.5', isOpen ? 'text-white/80' : 'text-slate-500 dark:text-slate-400')}>
                        {lesson.description}
                      </p>
                    )}
                  </div>
                </div>
                {isLessonUnlocked ? (
                  isOpen ? (
                    <ChevronUp className="h-5 w-5 shrink-0 text-white" />
                  ) : (
                    <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
                  )
                ) : (
                  <span className="text-xs font-bold text-amber-500">🔒 مقفل</span>
                )}
              </button>

              {/* Expanded Content (Only when purchased) */}
              {isOpen && isPurchased && (
                <div className="border-t border-white/20 bg-white dark:bg-[#0A101D] divide-y divide-slate-100 dark:divide-slate-800">
                  {/* Watch Row (Only if video exists) */}
                  {lesson.video_url && (
                    <Link
                      href={`/lesson/${lesson.id}`}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-blue-50 dark:hover:bg-slate-900 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                          مشاهدة
                        </span>
                        <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                          {lesson.title}
                        </span>
                      </div>
                      <PlayCircle className="h-5 w-5 text-blue-600 dark:text-cyan-400 group-hover:scale-110 transition-transform" />
                    </Link>
                  )}

                  {/* PDF / Document Row */}
                  {lesson.pdf_url && (
                    <a
                      href={lesson.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-blue-50 dark:hover:bg-slate-900 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                          مستند ومذكرة PDF 📄
                        </span>
                        <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                          فتح وتحميل مذكرة المحاضرة مباشرة
                        </span>
                      </div>
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                        فتح المستند ↗
                      </span>
                    </a>
                  )}

                  {/* Exam Row (Only if exam exists) */}
                  {lesson.has_exam && lessonExamId && (
                    <Link
                      href={`/exam/${lessonExamId}`}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-emerald-50 dark:hover:bg-slate-900 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "rounded-lg px-3 py-1 text-xs font-bold text-white shadow-sm",
                          hasPassedThisExam ? "bg-emerald-600" : "bg-cyan-600"
                        )}>
                          {hasPassedThisExam ? "امتحان مجتاز ✅" : "امتحان إجباري"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">📝</span>
                          <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                            امتحان المحاضرة (شرط لفتح الدرس التالي)
                          </span>
                        </div>
                      </div>
                      <ClipboardList className="h-5 w-5 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform" />
                    </Link>
                  )}

                  {/* If neither video nor exam */}
                  {!lesson.video_url && (!lesson.has_exam || !lesson.exam?.length) && (
                    <Link
                      href={`/lesson/${lesson.id}`}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-blue-50 dark:hover:bg-slate-900 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-slate-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                          تفاصيل
                        </span>
                        <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                          {lesson.title}
                        </span>
                      </div>
                      <PlayCircle className="h-5 w-5 text-slate-600 group-hover:scale-110 transition-transform" />
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {data.lessons.length === 0 && (
          <div className="grid place-items-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E172A] py-16 text-center">
            <Lock className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-bold text-slate-600 dark:text-slate-400">لا توجد دروس بعد في هذا الكورس</p>
          </div>
        )}
      </div>
    </div>
  );
}



