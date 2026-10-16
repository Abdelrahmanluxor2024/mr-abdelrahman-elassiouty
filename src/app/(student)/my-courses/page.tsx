'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCourses, DEFAULT_COURSES } from '@/lib/firebase/services';
import type { FirebaseCourse } from '@/lib/firebase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayCircle, BookOpen } from 'lucide-react';
import { formatCurrencyEGP } from '@/lib/utils';

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<FirebaseCourse[]>(DEFAULT_COURSES);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const c = await getCourses();
        if (c && c.length > 0) setCourses(c);
      } catch (err) {
        console.warn('MyCourses fallback:', err);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6" dir="rtl">
      <header>
        <h1 className="font-display text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <span>كورساتي والمناهج المشترك بها</span>
          <span>📚</span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          تابع تقدّمك في محاضرات وامتحانات مستر عبدالرحمن الأسيوطي.
        </p>
      </header>

      {isLoading ? (
        <Skeleton className="h-48 w-full rounded-3xl" />
      ) : courses.length === 0 ? (
        <Card className="rounded-3xl border border-slate-200 dark:border-slate-800">
          <CardContent className="p-10 text-center text-slate-500">
            لست مشتركاً في أي كورس بعد. ابدأ الآن بالكورسات المجانية المتاحة!
            <div className="mt-4">
              <Button asChild className="rounded-2xl bg-blue-600 text-white font-bold">
                <Link href="/courses">تصفّح الكورسات</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c, idx) => (
            <Card key={c.id} className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0E172A] overflow-hidden shadow-sm hover:shadow-md transition">
              <div className="relative h-44 w-full overflow-hidden bg-slate-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.thumbnailUrl || '/images/hero-study.jpg'}
                  alt={c.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">{c.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <Progress value={idx === 0 ? 30 : 0} className="h-2 bg-blue-100 dark:bg-slate-800" />
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>نسبة الإنجاز: {idx === 0 ? '30%' : '0%'}</span>
                  <span>{c.lessonsCount || 12} محاضرة</span>
                </div>
                <Button asChild className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md">
                  <Link href={`/course/${c.id}`}>
                    <PlayCircle className="h-4 w-4 ms-1" />
                    متابعة الكورس الآن
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
