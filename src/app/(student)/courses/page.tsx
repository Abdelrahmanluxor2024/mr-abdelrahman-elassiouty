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
  const [activeTab, setActiveTab] = useState<'all' | 'free' | 'monthly'>('free');

  const filteredCourses = (courses ?? []).filter((c) => {
    if (activeTab === 'free') return c.is_free;
    if (activeTab === 'monthly') return !c.is_free;
    return true;
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Category Tabs (Image 4) ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2.5">
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
          كورسات الشهور
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
          الكورسات المجانية
        </button>

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
          الكورسات التأسيسية
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
                <Image
                  src="/images/teacher-hero.jpg"
                  alt={c.title}
                  fill
                  className="object-cover opacity-90"
                />
              </div>

              {/* Card Body */}
              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  {/* Badge */}
                  <div className="mb-3">
                    <span className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/70 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">
                      {c.is_free ? 'كورس مجاني' : formatCurrencyEGP(c.price)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-slate-900 dark:text-white text-base line-clamp-2">
                    {c.title}
                  </h3>

                  {/* Metadata */}
                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                    <Calendar className="h-3.5 w-3.5 text-blue-500" />
                    <span>الدفعة الحالية ٢٠٢٦ / ٢٠٢٧</span>
                  </div>
                </div>

                {/* Action Button */}
                <Link
                  href={`/course/${c.id}`}
                  className="mt-5 block w-full rounded-2xl border-2 border-blue-600 dark:border-blue-500 py-2.5 text-center text-xs font-bold text-blue-600 dark:text-blue-400 transition hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white shadow-sm"
                >
                  الدخول للكورس
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


