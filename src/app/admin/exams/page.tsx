import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatArabicNumber } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminExamsPage() {
  const admin = createAdminClient();
  const { data: exams } = await admin
    .from('exams')
    .select('*, lesson:lessons(title, course:courses(title))')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-black text-brand-900">إدارة الامتحانات</h1>
      <Card>
        <CardHeader>
          <CardTitle>الامتحانات ({formatArabicNumber(exams?.length ?? 0)})</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100">
          {(exams ?? []).map((e: any) => (
            <div key={e.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{e.title}</p>
                <p className="text-xs text-slate-500">
                  {e.lesson?.course?.title} • {e.lesson?.title}
                </p>
              </div>
              <Badge variant="outline">{e.duration_minutes} د</Badge>
              <Badge variant="secondary">{e.total_marks} درجة</Badge>
              <Badge variant={e.is_active ? 'success' : 'warning'}>
                {e.is_active ? 'نشط' : 'متوقف'}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
