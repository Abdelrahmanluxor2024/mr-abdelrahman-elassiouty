import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, Trophy, Wallet } from 'lucide-react';
import { formatArabicNumber, formatCurrencyEGP } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const admin = createAdminClient();
  const [students, courses, attempts, txns] = await Promise.all([
    admin.from('students').select('id', { count: 'exact', head: true }),
    admin.from('courses').select('id', { count: 'exact', head: true }),
    admin.from('exam_attempts').select('id', { count: 'exact', head: true }),
    admin.from('wallet_transactions').select('amount').eq('status', 'completed'),
  ]);

  const totalRevenue = (txns.data ?? []).reduce((s, t) => s + Number(t.amount), 0);

  const stats = [
    { label: 'الطلاب', value: formatArabicNumber(students.count ?? 0), icon: Users },
    { label: 'الكورسات', value: formatArabicNumber(courses.count ?? 0), icon: BookOpen },
    { label: 'محاولات الامتحانات', value: formatArabicNumber(attempts.count ?? 0), icon: Trophy },
    { label: 'إجمالي الإيرادات', value: formatCurrencyEGP(totalRevenue), icon: Wallet },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-black text-brand-900">الإحصائيات</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient text-white shadow-blue-soft">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="font-display text-2xl font-black text-slate-900">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
