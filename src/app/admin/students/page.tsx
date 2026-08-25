'use client';

import { useState, useTransition } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getAdminStudents, manualChargeStudent, grantStudentExamAttempt } from '@/app/actions/admin';
import { formatArabicNumber, formatCurrencyEGP } from '@/lib/utils';
import { toast } from 'sonner';
import { Search, Phone, MessageCircle, Wallet, Award, CheckCircle2, User, Sparkles, RefreshCw } from 'lucide-react';

export default function AdminStudentsPage() {
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState(50);
  const [pending, startTransition] = useTransition();

  const { data: students = [], isLoading, refetch } = useQuery({
    queryKey: ['admin', 'students'],
    queryFn: async () => {
      const data = await getAdminStudents();
      return data;
    },
  });

  const filtered = students.filter((s: any) => {
    const matchesSearch = 
      !search || 
      s.full_name?.toLowerCase().includes(search.toLowerCase()) || 
      s.phone?.includes(search) || 
      s.parent_phone?.includes(search);
    const matchesGrade = gradeFilter === 'all' || s.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  function handleRecharge(phone: string, name: string) {
    if (rechargeAmount <= 0) {
      toast.error('يرجى إدخال مبلغ صالح للشحن');
      return;
    }
    startTransition(async () => {
      const res = await manualChargeStudent({
        studentPhone: phone,
        amount: rechargeAmount,
        reason: 'شحن يدوي من لوحة تحكم المستر',
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`تم شحن ${rechargeAmount} ج.م بنجاح للطالب ${name} 🎉`);
      setSelectedStudent(null);
      refetch();
    });
  }

  function handleGrantAttempt(phone: string, name: string) {
    startTransition(async () => {
      const res = await grantStudentExamAttempt({
        studentPhone: phone,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`تم فتح وإعادة محاولات الامتحانات للطالب ${name} بنجاح ✅`);
    });
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-black text-brand-900 dark:text-white">إدارة الطلاب والمشتركين</h1>
          <p className="text-xs text-slate-500 mt-1">عرض بيانات الطلاب، الشحن المباشر، وتعديل المحاولات والتواصل</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs">
            {formatArabicNumber(students.length)} طالب مسجل
          </Badge>
        </div>
      </div>

      {/* Recharge Modal Popup */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md rounded-3xl border-2 border-blue-500 bg-white dark:bg-[#0E172A] shadow-2xl p-6 space-y-4">
            <h3 className="font-display text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Wallet className="h-5 w-5 text-blue-600 dark:text-cyan-400" />
              شحن رصيد مباشر للطالب
            </h3>
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-sm space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">{selectedStudent.full_name}</p>
              <p className="text-xs text-slate-500 font-mono" dir="ltr">{selectedStudent.phone}</p>
              <p className="text-xs text-blue-600 dark:text-cyan-400 font-bold">الرصيد الحالي: {formatCurrencyEGP(selectedStudent.wallet_balance)}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">المبلغ المراد إضافته (ج.م)</label>
              <Input 
                type="number" 
                min={5} 
                value={rechargeAmount} 
                onChange={(e) => setRechargeAmount(Number(e.target.value))} 
                className="text-lg font-bold text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setSelectedStudent(null)} className="rounded-xl text-xs">إلغاء</Button>
              <Button 
                onClick={() => handleRecharge(selectedStudent.phone, selectedStudent.full_name)} 
                disabled={pending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs"
              >
                {pending ? 'جاري الشحن...' : `تأكيد شحن ${rechargeAmount} ج.م`}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Search & Filter Bar */}
      <Card className="rounded-3xl border border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="🔍 ابحث بالاسم، رقم هاتف الطالب، أو رقم ولي الأمر..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="ps-10 text-xs bg-slate-50 dark:bg-slate-900 rounded-2xl"
            />
          </div>
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="h-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-3 text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            <option value="all">جميع الصفوف</option>
            <option value="1st_secondary">أولى ثانوي</option>
            <option value="2nd_secondary">تانية ثانوي</option>
            <option value="3rd_secondary">تالتة ثانوي</option>
          </select>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card className="rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <CardTitle className="text-base font-bold">قائمة الطلاب ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-6">
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
          ) : (
            <table className="w-full min-w-[750px] text-sm">
              <thead className="text-right text-xs text-slate-500 bg-slate-50/75 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="p-3">الطالب</th>
                  <th className="p-3">الهاتف وولي الأمر</th>
                  <th className="p-3">الصف والمحافظة</th>
                  <th className="p-3">رصيد المحفظة</th>
                  <th className="p-3">إجراءات المستر والدعم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                    <td className="p-3 min-w-[160px]">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 shrink-0 rounded-xl overflow-hidden bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-cyan-300 grid place-items-center font-black text-xs border border-blue-500/20">
                          {s.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.avatar_url} alt={s.full_name ?? 'طالب'} className="h-full w-full object-cover" />
                          ) : (
                            <span>{s.full_name?.[0]?.toUpperCase() ?? 'ط'}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white text-sm break-words leading-snug">{s.full_name ?? '—'}</p>
                          <p className="text-[11px] text-slate-400">{new Date(s.created_at).toLocaleDateString('ar-EG')}</p>
                        </div>
                      </div>
                    </td>


                    <td className="p-3 text-xs space-y-0.5">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-blue-600 dark:text-cyan-400" dir="ltr">
                        <Phone className="h-3 w-3" />
                        {s.phone}
                      </div>
                      {s.parent_phone && (
                        <p className="text-[11px] text-slate-400 font-mono" dir="ltr">ولي الأمر: {s.parent_phone}</p>
                      )}
                    </td>

                    <td className="p-3 text-xs space-y-1 min-w-[130px]">
                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                        {s.grade?.replace(/_/g, ' ') || 'عام'}
                      </Badge>
                      <p className="text-slate-500 text-[11px]">
                        {s.governorate || 'محافظة غير محددة'}
                        {s.school ? ` • ${s.school}` : ''}
                      </p>
                    </td>


                    <td className="p-3">
                      <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400 font-mono">
                        {formatCurrencyEGP(s.wallet_balance)}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {/* Direct Recharge */}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setSelectedStudent(s)}
                          className="h-8 rounded-xl border-blue-300 text-blue-600 hover:bg-blue-50 text-xs px-2.5"
                          title="شحن رصيد مباشر"
                        >
                          <Wallet className="h-3.5 w-3.5 ms-1 text-blue-600" />
                          شحن
                        </Button>

                        {/* Grant Exam Attempt */}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleGrantAttempt(s.phone, s.full_name)}
                          disabled={pending}
                          className="h-8 rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50 text-xs px-2.5"
                          title="إعادة فتح محاولة الامتحان"
                        >
                          <RefreshCw className="h-3.5 w-3.5 ms-1 text-amber-600" />
                          محاولة
                        </Button>

                        {/* WhatsApp */}
                        <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-xl text-emerald-600 hover:bg-emerald-50">
                          <a 
                            href={`https://wa.me/20${s.phone.replace(/^0/, '')}?text=مرحباً%20${encodeURIComponent(s.full_name)}،%20منصة%20مستر%20عبدالرحمن%20الأسيوطي`} 
                            target="_blank" 
                            rel="noreferrer"
                            title="مراسلة واتساب"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
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

