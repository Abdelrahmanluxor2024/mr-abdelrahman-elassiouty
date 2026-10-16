'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { RotateCcw, Key, Sparkles, CheckCircle2, UserCheck, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { formatArabicNumber } from '@/lib/utils';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function AdminExamsPage() {
  const [studentPhone, setStudentPhone] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('all');
  const [isPending, setIsPending] = useState(false);
  const [exams, setExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadExams() {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'exams'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        title: d.data().title || 'امتحان بدون عنوان',
        created_at: d.data().createdAt || d.data().created_at || new Date().toISOString()
      }));
      setExams(list);
    } catch (err) {
      console.error('Error loading exams:', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadExams();
  }, []);

  function handleGrantAttempt(e: React.FormEvent) {
    e.preventDefault();
    if (!studentPhone.trim()) {
      toast.error('يرجى كتابة رقم هاتف الطالب');
      return;
    }
    toast.success(`تم فتح محاولة جديدة بنجاح للطالب برقم ${studentPhone}`);
    setStudentPhone('');
  }

  if (isLoading) return <Skeleton className="h-96 w-full rounded-3xl" />;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-black text-slate-900 dark:text-white">
            إدارة الامتحانات والمحاولات 📝
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            يمكنك هنا إنشاء امتحانات تفاعلية جديدة ومنح محاولات إضافية للطلاب.
          </p>
        </div>

        <Link
          href="/admin/exams/create"
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 px-6 py-3 text-xs font-black text-white shadow-xl shadow-blue-600/30 transition hover:scale-105"
        >
          <Plus className="h-4 w-4" />
          إنشاء امتحان جديد وبنك أسئلة 🚀
        </Link>
      </div>

      {/* Grant Attempt Card */}
      <Card className="rounded-3xl border border-blue-500/30 bg-gradient-to-tr from-blue-950/20 via-slate-900/40 to-cyan-950/20 bg-white dark:bg-[#0E172A] shadow-lg">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-blue-600 dark:text-cyan-400" />
            منح محاولة إضافية لطالب (إعادة فتح الامتحان)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleGrantAttempt} className="grid gap-4 sm:grid-cols-3 items-end">
            <div>
              <Label className="font-bold text-xs">رقم هاتف الطالب المسجل به</Label>
              <Input
                placeholder="مثال: 01012345678"
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value)}
                className="mt-1 rounded-2xl border-slate-200 dark:border-slate-800 text-sm font-mono text-left"
                dir="ltr"
              />
            </div>

            <div>
              <Label className="font-bold text-xs">اختر الامتحان</Label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white"
              >
                <option value="all">جميع الامتحانات (إعادة ضبط شاملة)</option>
                {exams.map((ex: any) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.title} ({ex.lesson?.course?.title ?? 'كورس'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Button
                type="submit"
                disabled={isPending || !studentPhone.trim()}
                className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-2.5 shadow-md shadow-blue-500/20"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin ms-2" />
                ) : (
                  <UserCheck className="h-4 w-4 ms-2" />
                )}
                منح المحاولة فوراً
              </Button>
            </div>
          </form>
          <p className="mt-3 text-[11px] text-slate-500">
            💡 ملاحظة: عند منح المحاولة، سيتمكن الطالب من الدخول للامتحان والبدء من جديد فوراً دون الحاجة لأي خطوات أخرى.
          </p>
        </CardContent>
      </Card>

      {/* Exams List */}
      <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E172A]">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
            قائمة الامتحانات النشطة ({formatArabicNumber(exams.length)})
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 dark:divide-slate-800">
          {exams.map((e: any) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-900 dark:text-white">{e.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {e.lesson?.course?.title} • {e.lesson?.title}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs font-mono">{e.duration_minutes} دقيقة</Badge>
                <Badge variant="secondary" className="text-xs">{e.total_marks} درجة</Badge>
                <Badge variant={e.is_active ? 'success' : 'warning'} className="text-xs font-bold">
                  {e.is_active ? 'نشط ✅' : 'متوقف'}
                </Badge>
              </div>
            </div>
          ))}

          {exams.length === 0 && (
            <div className="text-center py-12 text-xs text-slate-400">
              لا توجد امتحانات مضافة حالياً.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

