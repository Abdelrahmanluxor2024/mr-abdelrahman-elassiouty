'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCurrentStudent } from '@/lib/firebase/use-student-auth';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StudentAvatarUploader } from '@/components/student/student-avatar-uploader';
import { formatArabicNumber, formatCurrencyEGP } from '@/lib/utils';
import { LogOut, Wallet, Trophy, Sparkles, GraduationCap, MapPin, School } from 'lucide-react';

export default function ProfilePage() {
  const { student, logout } = useCurrentStudent();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  useEffect(() => {
    async function loadAttempts() {
      if (!student.id || student.id === 'current-student') return;
      setLoadingAttempts(true);
      try {
        const q = query(
          collection(db, 'exam_attempts'),
          where('studentId', '==', student.id)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setAttempts(list);
        }
      } catch (err) {
        console.warn('Could not load attempts for student:', err);
      } finally {
        setLoadingAttempts(false);
      }
    }
    loadAttempts();
  }, [student.id]);

  const passedCount = attempts.filter((a) => Number(a.percentage || 0) >= 50).length;
  const successRate = attempts.length > 0 ? Math.round((passedCount / attempts.length) * 100) : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir="rtl">
      {/* Student Profile Card */}
      <Card className="overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md">
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 p-6 text-white relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10 text-center sm:text-right">
            <StudentAvatarUploader currentAvatar={student.avatarUrl} studentName={student.fullName} />
            <div className="text-white space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="font-display text-2xl font-black">{student.fullName}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold backdrop-blur-md">
                  <Sparkles className="h-3 w-3 text-cyan-300" />
                  طالب مميز
                </span>
              </div>
              <p className="text-xs sm:text-sm text-cyan-200 font-mono" dir="ltr">{student.phone}</p>
              <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                <Badge variant="secondary" className="bg-white/15 text-white border-0">
                  {student.grade === '1st_bac' ? 'الصف الأول الثانوي' : 'الصف الثاني الثانوي'}
                </Badge>
                {student.governorate && (
                  <Badge variant="secondary" className="bg-white/15 text-white border-0 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {student.governorate}
                  </Badge>
                )}
                {student.school && (
                  <Badge variant="secondary" className="bg-white/15 text-white border-0 flex items-center gap-1">
                    <School className="h-3 w-3" /> {student.school}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <CardContent className="grid gap-3 p-5 sm:grid-cols-3 bg-white dark:bg-[#0E172A]">
          <Stat icon={Wallet} label="رصيدك الحالي" value={formatCurrencyEGP(student.walletBalance || 0)} />
          <Stat icon={Trophy} label="عدد الامتحانات" value={formatArabicNumber(attempts.length)} />
          <Stat
            label="نسبة النجاح العامة"
            value={attempts.length > 0 ? `${formatArabicNumber(successRate)}%` : '—'}
            icon={Trophy}
          />
        </CardContent>
      </Card>

      {/* Exam Results List */}
      <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0E172A]">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white">نتائج الامتحانات</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 dark:divide-slate-800">
          {attempts.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">لا توجد نتائج اختبارات حتى الآن.</p>
          ) : (
            attempts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-cyan-400">
                  <Trophy className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900 dark:text-white">{a.examTitle || 'اختبار تقييم الدرس'}</p>
                  <p className="text-xs text-slate-500">{new Date(a.createdAt || Date.now()).toLocaleDateString('ar-EG')}</p>
                </div>
                <Badge variant={Number(a.percentage || 0) >= 50 ? 'success' : 'error'}>
                  %{formatArabicNumber(Math.round(Number(a.percentage || 0)))}
                </Badge>
                <Button asChild size="sm" variant="ghost" className="text-blue-600 dark:text-cyan-400">
                  <Link href={`/exam/${a.examId || 'exam-1'}`}>عرض</Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Logout Button */}
      <Button
        variant="outline"
        onClick={logout}
        className="w-full rounded-2xl border-red-500/30 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold py-3"
      >
        <LogOut className="h-4 w-4 ms-2" />
        تسجيل الخروج من الحساب
      </Button>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/50">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <Icon className="h-4 w-4" />
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-1 font-display text-xl font-black text-slate-900 dark:text-white">{value}</p>
    </div>
  );
}
