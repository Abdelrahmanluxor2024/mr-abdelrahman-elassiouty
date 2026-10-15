'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getCourses } from '@/lib/firebase/services';
import type { FirebaseCourse } from '@/lib/firebase/types';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, BookOpen, Clock, Sparkles, ArrowLeft, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CoursesPage() {
  const [courses, setCourses] = useState<FirebaseCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'paid' | 'free'>('all');

  useEffect(() => {
    async function load() {
      try {
        const data = await getCourses();
        setCourses(data);
      } catch (err) {
        console.error('Failed to load courses', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const filteredCourses = courses.filter((c) => {
    if (activeTab === 'free') return c.isFree;
    if (activeTab === 'paid') return !c.isFree;
    return true;
  });

  return (
    <div className="space-y-8" dir="rtl">
      {/* ── Top Header & Filter Tabs ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            <span className="text-blue-500">📚</span> كورسات ومحاضرات المنصة
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            اختر كورس أو محاضرة وابدأ المذاكرة بنظام التتابع والاختبارات الدورية
          </p>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 rounded-2xl bg-[#0B1324] p-1.5 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={cn(
              'rounded-xl px-4 py-2 text-xs font-bold transition-all',
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            )}
          >
            جميع الكورسات ({courses.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paid')}
            className={cn(
              'rounded-xl px-4 py-2 text-xs font-bold transition-all',
              activeTab === 'paid'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            )}
          >
            الكورسات الشهرية
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('free')}
            className={cn(
              'rounded-xl px-4 py-2 text-xs font-bold transition-all',
              activeTab === 'free'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            )}
          >
            الكورسات التأسيسية المجانية
          </button>
        </div>
      </div>

      {/* ── Courses Grid (Screenshot 1 Exact Layout) ────────────────────── */}
      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-[460px] w-full rounded-3xl bg-slate-800/40" />
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="grid place-items-center rounded-3xl border border-dashed border-slate-800 bg-[#0B1324] p-12 text-center">
          <p className="text-sm font-semibold text-slate-400">لا توجد كورسات متاحة في هذا القسم حالياً.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((c) => (
            <div
              key={c.id}
              className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-800 bg-[#0B1324] shadow-xl hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/20"
            >
              <div>
                {/* 1. Course Poster / Thumbnail */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.thumbnailUrl || '/images/hero-study.jpg'}
                    alt={c.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B1324] via-transparent to-black/40" />
                  
                  {/* Tag Badge */}
                  {c.tag && (
                    <span className="absolute top-3 right-3 rounded-xl bg-blue-600/90 backdrop-blur-md px-3 py-1 text-xs font-black text-white shadow">
                      {c.tag}
                    </span>
                  )}

                  {/* Free / Discount Badge */}
                  {c.isFree ? (
                    <span className="absolute top-3 left-3 rounded-xl bg-emerald-600 px-3 py-1 text-xs font-black text-white shadow">
                      مجاني بالكامل
                    </span>
                  ) : c.discountPrice && c.discountPrice > c.price ? (
                    <span className="absolute top-3 left-3 rounded-xl bg-amber-500 text-black px-2.5 py-1 text-xs font-black shadow">
                      خصم خاص
                    </span>
                  ) : null}
                </div>

                {/* 2. Course Details Body */}
                <div className="p-5 space-y-4">
                  {/* Price Banner (Matching Egyptian LMS style: e.g. 200 L.E) */}
                  <div className="flex items-baseline justify-between border-b border-slate-800 pb-3">
                    <div>
                      {c.isFree ? (
                        <div className="text-xl font-black text-emerald-400">0 L.E (مجاني)</div>
                      ) : (
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-white tracking-tight">
                            {c.price} <span className="text-sm font-bold text-amber-400">L.E</span>
                          </span>
                          {c.discountPrice && c.discountPrice > c.price && (
                            <span className="text-xs text-slate-500 line-through">
                              {c.discountPrice} L.E
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="h-3.5 w-3.5 text-blue-400" />
                      <span>{c.durationHours || 40} ساعة شرح</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-black text-white line-clamp-2 leading-relaxed">
                    {c.title}
                  </h3>

                  {/* Description */}
                  {c.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>
                  )}

                  {/* Features List with Yellow Bullet Points (Matching Reference Screenshot) */}
                  <div className="space-y-2 pt-2">
                    {(c.features || [
                      'شرح وافٍ وتطبيقات شاملة مع الواجبات والامتحانات',
                      'مذكرات وملخصات PDF احترافية',
                      'اختبار بعد كل جزء لقياس الفهم بنظام التتابع'
                    ]).slice(0, 3).map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
                        <span className="line-clamp-1">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Action Buttons (اشترك الآن + تفاصيل الكورس) */}
              <div className="p-5 pt-0 grid grid-cols-2 gap-3">
                <Link
                  href={`/course/${c.id}`}
                  className="flex items-center justify-center gap-1 rounded-2xl bg-emerald-600 hover:bg-emerald-500 py-3 text-xs font-black text-white shadow-lg shadow-emerald-600/30 transition hover:scale-[1.02]"
                >
                  {c.isFree ? 'ابدأ الآن مجاناً' : 'اشترك الآن ⚡'}
                </Link>

                <Link
                  href={`/course/${c.id}`}
                  className="flex items-center justify-center gap-1 rounded-2xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 py-3 text-xs font-bold text-slate-200 transition"
                >
                  تفاصيل الكورس
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
