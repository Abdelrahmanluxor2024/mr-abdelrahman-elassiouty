'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent } from '@/components/ui/card';
import { Users, BookOpen, Trophy, Wallet } from 'lucide-react';
import { formatArabicNumber, formatCurrencyEGP } from '@/lib/utils';

export default function AdminDashboardPage() {
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
          getDocs(collection(db, 'users')).catch(() => null),
          getDocs(collection(db, 'courses')).catch(() => null),
          getDocs(collection(db, 'exam_attempts')).catch(() => null),
        ]);

        setStats({
          students: usersSnap?.size ?? 0,
          courses: coursesSnap?.size ?? 0,
          attempts: attemptsSnap?.size ?? 0,
          revenue: 0,
        });
      } catch (err) {
        console.warn('Failed to load admin stats:', err);
      }
    }
    loadStats();
  }, []);

  const statCards = [
    { label: 'الطلاب المسجلين', value: formatArabicNumber(stats.students), icon: Users },
    { label: 'الكورسات المتاحة', value: formatArabicNumber(stats.courses), icon: BookOpen },
    { label: 'محاولات الامتحانات', value: formatArabicNumber(stats.attempts), icon: Trophy },
    { label: 'إجمالي الإيرادات', value: formatCurrencyEGP(stats.revenue), icon: Wallet },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">لوحة تحكم مستر عبدالرحمن الأسيوطي</h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">إحصائيات المنصة ونشاط الطلاب والامتحانات.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E172A] shadow-sm">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md">
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">{s.label}</p>
                <p className="font-display text-2xl font-black text-slate-900 dark:text-white">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
