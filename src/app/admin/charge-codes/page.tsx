'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@supabase/ssr';
import { createChargeCodes } from '@/app/actions/admin';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';

export default function AdminChargeCodesPage() {
  const [count, setCount] = useState(10);
  const [amount, setAmount] = useState(100);
  const [prefix, setPrefix] = useState('MR');
  const [pending, start] = useTransition();
  const [lastBatch, setLastBatch] = useState<string[]>([]);

  const { data: codes, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'charge-codes'],
    queryFn: async () => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data } = await supabase
        .from('charge_codes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  function onCreate() {
    start(async () => {
      const res = await createChargeCodes({ count, amount, prefix });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setLastBatch(res.codes.map((c: { code: string }) => c.code));
      toast.success(`تم إنشاء ${count} كود`);
      refetch();
    });
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('تم النسخ');
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-black text-brand-900">أكواد الشحن</h1>

      <Card>
        <CardHeader>
          <CardTitle>إنشاء دفعة جديدة</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label>عدد الأكواد</Label>
            <Input type="number" min={1} max={500} value={count} onChange={(e) => setCount(Number(e.target.value))} />
          </div>
          <div>
            <Label>قيمة الكود (ج.م)</Label>
            <Input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          </div>
          <div>
            <Label>السابقة</Label>
            <Input value={prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} />
          </div>
          <div className="flex items-end">
            <Button onClick={onCreate} disabled={pending} className="w-full">
              {pending ? 'جاري الإنشاء...' : 'إنشاء'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {lastBatch.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>الأكواد اللي اتولدت دلوقتي ({lastBatch.length})</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {lastBatch.map((c) => (
              <div key={c} className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2 font-mono text-sm">
                <span className="flex-1">{c}</span>
                <Button size="icon" variant="ghost" onClick={() => copy(c)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>سجل الأكواد</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <table className="w-full min-w-[480px] text-sm">
              <thead className="text-right text-xs text-slate-500">
                <tr>
                  <th className="p-2">الكود</th>
                  <th className="p-2">القيمة</th>
                  <th className="p-2">الحالة</th>
                  <th className="p-2">تاريخ الاستخدام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(codes ?? []).map((c) => (
                  <tr key={c.id}>
                    <td className="p-2 font-mono">{c.code}</td>
                    <td className="p-2">{c.amount} ج.م</td>
                    <td className="p-2">
                      <span className={c.is_used ? 'text-error' : 'text-success'}>
                        {c.is_used ? 'مستخدم' : 'متاح'}
                      </span>
                    </td>
                    <td className="p-2 text-xs text-slate-500">
                      {c.used_at ? new Date(c.used_at).toLocaleString('ar-EG') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
