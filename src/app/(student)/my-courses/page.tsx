'use client';

import Link from 'next/link';
import { useEnrollments } from '@/lib/queries/useCourses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayCircle } from 'lucide-react';

export default function MyCoursesPage() {
  const { data, isLoading } = useEnrollments();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-black text-brand-900">كورساتي</h1>
        <p className="mt-1 text-slate-600">كل الكورسات اللي مشترك فيها وتقدّمك فيها.</p>
      </header>

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-slate-500">
            مش مشترك في أي كورس لسه. ابدأ بالكورس التجريبي المجاني.
            <div className="mt-4">
              <Button asChild>
                <Link href="/courses">تصفّح الكورسات</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((e) => (
            <Card key={e.id}>
              <CardHeader>
                <CardTitle>{e.course.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={e.progress_percentage} />
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>إنجاز: {e.progress_percentage}%</span>
                  <span>{e.completed_lessons} محاضرة مخلّصة</span>
                </div>
                <Button asChild className="w-full">
                  <Link href={`/course/${e.course.id}`}>
                    <PlayCircle className="h-4 w-4" />
                    استمرار
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
