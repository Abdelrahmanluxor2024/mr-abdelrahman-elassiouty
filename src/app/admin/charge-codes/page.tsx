'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { toast } from 'sonner';
import { Copy, Check, Search, Download } from 'lucide-react';

export default function AdminChargeCodesPage() {
  const [count, setCount] = useState(10);
  const [amount, setAmount] = useState(50);
  const [prefix, setPrefix] = useState('MR');
  const [searchQuery, setSearchQuery] = useState('');
  const [pending, setPending] = useState(false);
  const [lastBatch, setLastBatch] = useState<string[]>([]);
  const [codes, setCodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadCodes() {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'charge_codes'));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setCodes(list);
    } catch (err) {
      console.error('Error loading charge codes:', err);
      toast.error('حدث خطأ أثناء تحميل أكواد الشحن');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCodes();
  }, []);

  async function onCreate() {
    setPending(true);
    try {
      const generatedCodes: string[] = [];
      for (let i = 0; i < count; i++) {
        const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
        const codeStr = `${(prefix ?? 'MR').toUpperCase()}-${randomPart}`;
        generatedCodes.push(codeStr);
        await addDoc(collection(db, 'charge_codes'), {
          code: codeStr,
          amount: Number(amount) || 50,
          is_used: false,
          created_at: new Date().toISOString()
        });
      }
      setLastBatch(generatedCodes);
      toast.success(`تم إنشاء ${count} كود شحن بنجاح في Firebase 🎉`);
      await loadCodes();
    } catch (err: any) {
      console.error('Error creating charge codes:', err);
      toast.error(err.message || 'حدث خطأ أثناء إنشاء الأكواد');
    } finally {
      setPending(false);
    }
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

      <Card className="rounded-3xl">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <CardTitle>سجل الأكواد ({codes.length})</CardTitle>
            <p className="text-xs text-slate-500 mt-1">جميع كروت الشحن التي تم إنشاؤها وقيمتها وحالتها</p>
          </div>
          <div className="flex items-center gap-2">
            <Input 
              placeholder="🔍 ابحث برقم الكود..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="max-w-xs text-xs bg-slate-50 dark:bg-slate-900"
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-4">
          {isLoading ? (
            <Skeleton className="h-32 w-full rounded-2xl" />
          ) : (
            <table className="w-full min-w-[600px] text-sm">
              <thead className="text-right text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-3">الكود</th>
                  <th className="p-3">القيمة</th>
                  <th className="p-3">الحالة</th>
                  <th className="p-3">المستخدم</th>
                  <th className="p-3">تاريخ الاستخدام / الإنشاء</th>
                  <th className="p-3 text-center">نسخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(codes ?? [])
                  .filter((c: any) => !searchQuery || c.code.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition">
                    <td className="p-3 font-mono font-bold text-blue-600 dark:text-cyan-400">{c.code}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{c.amount} ج.م</td>
                    <td className="p-3">
                      <span className={c.is_used 
                        ? 'inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-950/60 px-2.5 py-0.5 text-xs font-bold text-red-600' 
                        : 'inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 text-xs font-bold text-emerald-600'
                      }>
                        {c.is_used ? 'مستخدم ❌' : 'متاح للشحن ✅'}
                      </span>
                    </td>
                    <td className="p-3 text-xs">
                      {c.used_by_student ? (
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{c.used_by_student.full_name}</p>
                          <p className="text-slate-400 font-mono" dir="ltr">{c.used_by_student.phone}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {c.used_at ? new Date(c.used_at).toLocaleString('ar-EG') : new Date(c.created_at).toLocaleDateString('ar-EG')}
                    </td>
                    <td className="p-3 text-center">
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950" onClick={() => copy(c.code)}>
                        <Copy className="h-4 w-4 text-slate-500" />
                      </Button>
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
