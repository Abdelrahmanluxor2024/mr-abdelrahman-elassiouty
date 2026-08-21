import { createClient } from '@/lib/supabase/server';
import { getCurrentStudent } from '@/lib/queries/useStudentServer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InstructorAvatar } from '@/components/student/instructor-avatar';
import { logout } from '@/app/actions/auth';
import { formatArabicNumber, formatCurrencyEGP } from '@/lib/utils';
import { LogOut, Wallet, Trophy } from 'lucide-react';
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
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-brand-gradient p-6">
          <div className="flex items-center gap-4">
            <InstructorAvatar src={student.avatar_url ?? '/images/instructor.png'} size="lg" rounded />
            <div className="text-white">
              <h1 className="font-display text-2xl font-black">{student.full_name}</h1>
              <p className="text-sm text-white/80">{student.phone}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="secondary">{student.grade.replace('_', ' ')}</Badge>
                {student.governorate && <Badge variant="secondary">{student.governorate}</Badge>}
                {student.school && <Badge variant="secondary">{student.school}</Badge>}
              </div>
            </div>
          </div>
        </div>
        <CardContent className="grid gap-3 p-5 sm:grid-cols-3">
          <Stat icon={Wallet} label="رصيدك" value={formatCurrencyEGP(student.wallet_balance)} />
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
