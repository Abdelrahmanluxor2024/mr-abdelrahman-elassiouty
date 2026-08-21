'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCourse, useCourseEnrollment } from '@/lib/queries/useCourses';
import { purchaseCourse } from '@/app/actions/wallet';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, PlayCircle, ClipboardList, CheckCircle2, Lock, Wallet, ShoppingCart, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrencyEGP } from '@/lib/utils';

export default function CoursePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { data, isLoading } = useCourse(id);
  const { data: enrollment, isLoading: enrollmentLoading, refetch: refetchEnrollment } = useCourseEnrollment(id);
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
      toast.success('🎉 تم الاشتراك في الكورس بنجاح! تم فتح جميع الدروس والامتحانات.');
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
          <div className="rounded-2xl border-2 border-blue-200 dark:border-blue-800/80 bg-blue-50 dark:bg-blue-950/40 py-3 text-center text-sm font-bold text-blue-700 dark:text-blue-300">
            ✅ أنت مشترك في هذا الكورس ومفعل بحسابك
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-amber-300 dark:border-amber-700/80 bg-amber-50 dark:bg-amber-950/40 p-4 text-center space-y-3">
            <div>
              <p className="text-xs text-amber-800 dark:text-amber-300 font-bold">كورس مدفوع</p>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                {formatCurrencyEGP(data.price)}
              </p>
            </div>
            <Button
              onClick={handlePurchase}
              disabled={isPending}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-2.5 rounded-xl shadow-md shadow-blue-500/20"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ms-2" />
                  جاري الشراء...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4 ms-2" />
                  اشترك الآن بـ {formatCurrencyEGP(data.price)}
                </>
              )}
            </Button>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              يتم الخصم مباشرة من رصيد محفظتك بالمنصة.
            </p>
          </div>
        )}

        {/* Quick Lessons List (compact) */}
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0E172A] p-4 shadow-sm transition-colors">
          <p className="mb-3 font-bold text-slate-800 dark:text-slate-200 text-sm">الدروس:</p>
          <div className="grid grid-cols-2 gap-2">
            {data.lessons.map((lesson) => (
              <div key={lesson.id} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                {isPurchased ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                ) : (
                  <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                )}
                <span className="truncate">{lesson.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Left Column: Lessons Accordion ───────────────────── */}
      <div className="space-y-3 lg:col-span-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-black text-slate-900 dark:text-white">الدروس والمحاضرات</h2>
          {!isPurchased && (
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-3 py-1 rounded-xl border border-amber-300 dark:border-amber-800">
              🔒 مقفل - يلزم الاشتراك
            </span>
          )}
        </div>

        {data.lessons.map((lesson, i) => {
          const isOpen = openLesson === lesson.id;
          return (
            <div
              key={lesson.id}
              className={cn(
                'overflow-hidden rounded-2xl border transition-all',
                isOpen && isPurchased
                  ? 'border-blue-500 bg-blue-600 shadow-lg shadow-blue-600/25 text-white'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E172A] hover:border-blue-300 dark:hover:border-blue-700'
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
                  setOpenLesson(isOpen ? null : lesson.id);
                }}
                className="flex w-full items-center justify-between px-5 py-4 text-right"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black',
                      isOpen && isPurchased
                        ? 'bg-white/20 text-white'
                        : isPurchased
                        ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                    )}
                  >
                    {isPurchased ? i + 1 : <Lock className="h-3.5 w-3.5" />}
                  </span>
                  <div className="text-right">
                    <p className={cn('font-bold text-sm', isOpen && isPurchased ? 'text-white' : 'text-slate-900 dark:text-white')}>
                      {lesson.title}
                    </p>
                    {lesson.description && (
                      <p className={cn('text-xs mt-0.5', isOpen && isPurchased ? 'text-white/80' : 'text-slate-500 dark:text-slate-400')}>
                        {lesson.description}
                      </p>
                    )}
                  </div>
                </div>
                {isPurchased ? (
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
                <div className="border-t border-white/20 bg-white dark:bg-[#0A101D]">
                  {/* Watch Row */}
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

                  {/* Exam Row */}
                  {lesson.has_exam && (
                    <Link
                      href={lesson.exam?.[0]?.id ? `/exam/${lesson.exam[0].id}` : `/lesson/${lesson.id}`}
                      className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-5 py-3.5 hover:bg-blue-50 dark:hover:bg-slate-900 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300 group-hover:bg-blue-600 group-hover:text-white transition">
                          امتحن
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">🔑</span>
                          <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                            {lesson.exam?.[0]?.title ?? 'quiz (1)'}
                          </span>
                        </div>
                      </div>
                      <ClipboardList className="h-5 w-5 text-blue-600 dark:text-cyan-400 group-hover:scale-110 transition-transform" />
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



