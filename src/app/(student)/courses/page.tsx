'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCourses } from '@/lib/queries/useCourses';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from 'lucide-react';
import { formatCurrencyEGP } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function CoursesPage() {
  const { data: courses, isLoading } = useCourses();
  const [activeTab, setActiveTab] = useState<'all' | 'free' | 'monthly'>('all');

  const filteredCourses = (courses ?? []).filter((c) => {
    if (activeTab === 'free') return c.is_free;
    if (activeTab === 'monthly') return !c.is_free;
    return true;
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Category Tabs ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={cn(
            'rounded-2xl px-6 py-2.5 text-xs font-bold transition-all',
            activeTab === 'all'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E172A] text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700'
          )}
        >
          جميع الكورسات ({courses?.length ?? 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('monthly')}
          className={cn(
            'rounded-2xl px-6 py-2.5 text-xs font-bold transition-all',
            activeTab === 'monthly'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E172A] text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700'
          )}
        >
          الكورسات المدفوعة والشهرية
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('free')}
          className={cn(
            'rounded-2xl px-6 py-2.5 text-xs font-bold transition-all',
            activeTab === 'free'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E172A] text-slate-700 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-700'
          )}
        >
          الكورسات المجانية والتأسيسية
        </button>
      </div>

      {/* ── Courses Grid ────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-3xl" />
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="grid place-items-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E172A] p-12 text-center">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">لا توجد كورسات في هذا القسم حالياً.</p>
          <Button onClick={() => setActiveTab('all')} variant="outline" className="mt-4 rounded-xl">
            عرض كل الكورسات
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((c) => (
            <div
              key={c.id}
              className="flex flex-col overflow-hidden rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0E172A] shadow-sm transition hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-700"
            >
              {/* Thumbnail Banner */}
              <div className="relative h-48 w-full overflow-hidden bg-slate-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.thumbnail_url || '/images/course-foundation-languages.jpg'}
                  alt={c.title}
                  className="h-full w-full object-cover opacity-95 transition-transform duration-500 hover:scale-105"
                />
                <span className="absolute top-3 right-3 rounded-xl bg-black/70 px-3 py-1 text-xs font-bold text-white shadow backdrop-blur-md border border-white/10">
                  {c.is_free ? '🎁 مجاني' : '🔒 كورس مدفوع'}
                </span>
              </div>

              {/* Card Body */}
              <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                <div>
                  {/* Badge */}
                  <div className="mb-2">
                    <span className={cn(
                      "rounded-xl px-3 py-1 text-xs font-bold border",
                      c.is_free 
                        ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300"
                        : "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300"
                    )}>
                      {c.is_free ? 'كورس مجاني متاح للجميع' : `السعر: ${formatCurrencyEGP(c.price)}`}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-slate-900 dark:text-white text-base line-clamp-2 leading-snug">
                    {c.title}
                  </h3>

                  {/* Description */}
                  {c.description && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {c.description}
                    </p>
                  )}

                  {/* Metadata */}
                  <div className="mt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-blue-500" />
                      <span>الدفعة ٢٠٢٦ / ٢٠٢٧</span>
                    </div>
                    <span className="text-blue-600 dark:text-cyan-400 font-bold">{c.lessons_count ?? 3} دروس</span>
                  </div>
                </div>

                {/* Action Button */}
                <Link
                  href={`/course/${c.id}`}
                  className="block w-full rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 py-2.5 text-center text-xs font-bold text-white transition shadow-md shadow-blue-500/20"
                >
                  عرض محتويات وتفاصيل الكورس ←
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


