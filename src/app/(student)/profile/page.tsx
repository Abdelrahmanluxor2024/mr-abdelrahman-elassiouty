import { createClient } from '@/lib/supabase/server';
import { getCurrentStudent } from '@/lib/queries/useStudentServer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StudentAvatarUploader } from '@/components/student/student-avatar-uploader';
import { logout } from '@/app/actions/auth';
import { formatArabicNumber, formatCurrencyEGP } from '@/lib/utils';
import { LogOut, Wallet, Trophy, Sparkles } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const student = await getCurrentStudent();
  const supabase = createClient();
  const { data: attempts } = await supabase
    .from('exam_attempts')
    .select('*, exam:exams(title)')
    .eq('student_id', student.id)
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir="rtl">
      <Card className="overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md">
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 p-6 text-white relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10 text-center sm:text-right">
            <StudentAvatarUploader currentAvatar={student.avatar_url} studentName={student.full_name} />
            <div className="text-white space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="font-display text-2xl font-black">{student.full_name}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold backdrop-blur-md">
                  <Sparkles className="h-3 w-3 text-cyan-300" />
                  طالب مميز
                </span>
              </div>
              <p className="text-xs sm:text-sm text-cyan-200 font-mono" dir="ltr">{student.phone}</p>
              <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                <Badge variant="secondary" className="bg-white/15 text-white border-0">{student.grade.replace('_', ' ')}</Badge>
                {student.governorate && <Badge variant="secondary" className="bg-white/15 text-white border-0">{student.governorate}</Badge>}
                {student.school && <Badge variant="secondary" className="bg-white/15 text-white border-0">{student.school}</Badge>}
              </div>
            </div>
          </div>
        </div>
        <CardContent className="grid gap-3 p-5 sm:grid-cols-3 bg-white dark:bg-[#0E172A]">
          <Stat icon={Wallet} label="رصيدك الحالي" value={formatCurrencyEGP(student.wallet_balance)} />
          <Stat icon={Trophy} label="عدد الامتحانات" value={formatArabicNumber(attempts?.length ?? 0)} />
          <Stat
            label="نسبة النجاح العامة"
            value={
              attempts && attempts.length
                ? `${formatArabicNumber(
                    Math.round(
                      (attempts.filter((a) => Number(a.percentage) >= 50).length / attempts.length) * 100
                    )
                  )}%`
                : '—'
            }
            icon={Trophy}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>نتائج الامتحانات</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100">
          {!attempts || attempts.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">مفيش نتائج لسه.</p>
          ) : (
            attempts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 py-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700">
                  <Trophy className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900">{(a as any).exam?.title}</p>
                  <p className="text-xs text-slate-500">{new Date(a.created_at).toLocaleString('ar-EG')}</p>
                </div>
                <Badge variant={Number(a.percentage) >= 50 ? 'success' : 'error'}>
                  {formatArabicNumber(Math.round(Number(a.percentage)))}%
                </Badge>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/exam/${a.exam_id}/result?attempt=${a.id}`}>عرض</Link>
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <form action={logout}>
        <Button variant="outline" className="w-full">
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </Button>
      </form>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-2xl border border-slate-100 p-3">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4" />
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-1 font-display text-xl font-black text-slate-900">{value}</p>
    </div>
  );
}
