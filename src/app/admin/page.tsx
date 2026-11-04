'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent } from '@/components/ui/card';
import { Users, BookOpen, Trophy, Wallet } from 'lucide-react';
import { formatArabicNumber, formatCurrencyEGP } from '@/lib/utils';

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [stats, setStats] = useState({
    students: 0,
    courses: 0,
    attempts: 0,
    revenue: 0,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const [usersSnap, coursesSnap, attemptsSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'courses')),
          getDocs(collection(db, 'exam_attempts')),
        ]);

        setStats({
          students: usersSnap.docs.filter(d => d.data().role !== 'admin').length,
          courses: coursesSnap?.size ?? 0,
          attempts: attemptsSnap?.size ?? 0,
          revenue: 0,
        });
      } catch (err) {
        setFailed(true);
        console.warn('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const statCards = [
    { label: 'الطلاب المسجلين', value: formatArabicNumber(stats.students), icon: Users },
    { label: 'الكورسات المتاحة', value: formatArabicNumber(stats.courses), icon: BookOpen },
    { label: 'محاولات الامتحانات', value: formatArabicNumber(stats.attempts), icon: Trophy },
    { label: 'الإيرادات', value: 'غير متاحة', icon: Wallet },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-black text-ink dark:text-white">لوحة تحكم مستر عبدالرحمن الأسيوطي</h1>
        <p className="mt-1 text-xs sm:text-sm text-muted">إحصائيات المنصة ونشاط الطلاب والامتحانات.</p>
      </div>

      <div className="rounded-3xl theme-inverse bg-gradient-to-l from-blue-700 to-indigo-950 p-6 sm:p-8 text-ink space-y-5"><div><p className="text-blue-200 text-sm">تجربة تعليمية أبسط، من البداية للنهاية</p><h2 className="text-2xl font-black mt-2">جهّز محتواك. والباقي خطوة بخطوة.</h2><p className="text-sm text-blue-100 mt-3">ابدأ بكورس تجريبي متكامل، أو أضف محتواك ثم اختر مكان ظهور الامتحان.</p></div><div className="flex flex-wrap gap-3"><Link href="/admin/courses" className="rounded-xl theme-panel bg-white dark:bg-slate-900 text-blue-900 font-bold px-5 py-3">١. إدارة الكورسات والدروس</Link><Link href="/admin/exams/create" className="rounded-xl bg-white/10 border border-white/20 font-bold px-5 py-3">٢. إنشاء وربط امتحان</Link><Link href="/courses" className="rounded-xl px-5 py-3 font-bold">عرض المنصة كطالب ←</Link></div></div>
      {failed && <p role="alert" className="text-amber-600">تعذر تحديث الإحصائيات. تحقق من الاتصال وأعد تحميل الصفحة.</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E172A] shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-2xl theme-inverse bg-gradient-to-tr from-blue-600 to-indigo-600 text-ink shadow-md">
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted dark:text-slate-400 font-semibold">{s.label}</p>
                <p className="font-display text-2xl font-black text-ink dark:text-white">{loading ? '…' : failed ? '—' : s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
