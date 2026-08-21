import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatArabicNumber, formatCurrencyEGP } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminStudentsPage() {
  const admin = createAdminClient();
  const { data: students } = await admin
    .from('students')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-black text-brand-900">إدارة الطلاب</h1>
      <Card>
        <CardHeader>
          <CardTitle>الطلاب ({formatArabicNumber(students?.length ?? 0)})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-right text-xs text-slate-500">
              <tr>
                <th className="p-2">الاسم</th>
                <th className="p-2">الهاتف</th>
                <th className="p-2">المحافظة</th>
                <th className="p-2">الرصيد</th>
                <th className="p-2">الحالة</th>
                <th className="p-2">تاريخ التسجيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(students ?? []).map((s) => (
                <tr key={s.id}>
                  <td className="p-2 font-semibold">{s.full_name}</td>
                  <td className="p-2 font-mono">{s.phone}</td>
                  <td className="p-2">{s.governorate ?? '—'}</td>
                  <td className="p-2">{formatCurrencyEGP(s.wallet_balance)}</td>
                  <td className="p-2">
                    <Badge variant={s.is_active ? 'success' : 'error'}>{s.is_active ? 'نشط' : 'معطل'}</Badge>
                  </td>
                  <td className="p-2 text-xs text-slate-500">
                    {new Date(s.created_at).toLocaleDateString('ar-EG')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
