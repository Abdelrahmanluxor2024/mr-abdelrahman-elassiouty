'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Phone, Lock, User, Loader2, UserPlus, MapPin, School, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerStudent } from '@/app/actions/auth';
import { getDeviceFingerprint } from '@/lib/device';
import { createClient } from '@/lib/supabase/client';
import { phoneToEmail } from '@/lib/utils';

const EGYPTIAN_GOVERNORATES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'الأقصر', 'أسوان', 'قنا', 'سوهاج', 'أسيوط',
  'المنيا', 'بني سويف', 'الفيوم', 'القليوبية', 'الشرقية', 'الدقهلية', 'الغربية',
  'المنوفية', 'كفر الشيخ', 'دمياط', 'بورسعيد', 'الإسماعيلية', 'السويس',
  'البحر الأحمر', 'شمال سيناء', 'جنوب سيناء', 'مطروح', 'الوادي الجديد', 'البحيرة'
];

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    password: '',
    parent_phone: '',
    governorate: 'القاهرة',
    school: '',
    grade: '1st_bac' as string,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onChange(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await registerStudent({
        ...form,
        device_fingerprint: getDeviceFingerprint(),
      });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(form.phone),
        password: form.password,
      });

      if (signInError) {
        toast.success('تم إنشاء الحساب، يرجى تسجيل الدخول');
        router.push('/login');
        return;
      }

      toast.success('تم إنشاء الحساب وتسجيل الدخول بنجاح');
      window.location.href = '/dashboard';
    });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-brand-gradient px-4 py-8" dir="rtl">
      <div className="w-full max-w-2xl rounded-3xl border border-white/15 bg-white p-6 sm:p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
            <UserPlus className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-slate-900">حساب جديد</h1>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-500">ابدأ رحلتك التعليمية مع مستر عبدالرحمن الأسيوطي</p>
        </div>

        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="full_name" className="text-slate-800 font-bold text-xs sm:text-sm">الاسم بالكامل</Label>
            <div className="relative">
              <User className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input 
                id="full_name" 
                value={form.full_name} 
                onChange={(e) => onChange('full_name', e.target.value)} 
                className="ps-10 text-slate-900 font-bold bg-slate-50 border-slate-300 placeholder:text-slate-400 focus:bg-white" 
                placeholder="اكتب اسمك الثلاثي أو الرباعي"
                required 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-slate-800 font-bold text-xs sm:text-sm">رقم الهاتف</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input 
                id="phone" 
                inputMode="tel" 
                value={form.phone} 
                onChange={(e) => onChange('phone', e.target.value)} 
                className="ps-10 text-slate-900 font-bold bg-slate-50 border-slate-300 placeholder:text-slate-400 focus:bg-white" 
                placeholder="010xxxxxxxx" 
                required 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-slate-800 font-bold text-xs sm:text-sm">كلمة المرور</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input 
                id="password" 
                type={showPassword ? 'text' : 'password'} 
                value={form.password} 
                onChange={(e) => onChange('password', e.target.value)} 
                className="ps-10 pe-10 text-slate-900 font-bold bg-slate-50 border-slate-300 placeholder:text-slate-400 focus:bg-white" 
                placeholder="••••••••" 
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="parent_phone" className="text-slate-800 font-bold text-xs sm:text-sm">رقم ولي الأمر (اختياري)</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input 
                id="parent_phone" 
                inputMode="tel" 
                value={form.parent_phone} 
                onChange={(e) => onChange('parent_phone', e.target.value)} 
                className="ps-10 text-slate-900 font-bold bg-slate-50 border-slate-300 placeholder:text-slate-400 focus:bg-white" 
                placeholder="01xxxxxxxxx" 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="grade" className="text-slate-800 font-bold text-xs sm:text-sm">الصف الدراسي</Label>
            <select
              id="grade"
              value={form.grade}
              onChange={(e) => onChange('grade', e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="1st_bac">الصف الأول بكالوريا</option>
              <option value="2nd_bac">الصف الثاني بكالوريا</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="governorate" className="text-slate-800 font-bold text-xs sm:text-sm">المحافظة</Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <select
                id="governorate"
                value={form.governorate}
                onChange={(e) => onChange('governorate', e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 ps-10 pe-3 text-sm font-bold text-slate-900 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {EGYPTIAN_GOVERNORATES.map((gov) => (
                  <option key={gov} value={gov}>{gov}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="school" className="text-slate-800 font-bold text-xs sm:text-sm">المدرسة (اختياري)</Label>
            <div className="relative">
              <School className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input 
                id="school" 
                value={form.school} 
                onChange={(e) => onChange('school', e.target.value)} 
                className="ps-10 text-slate-900 font-bold bg-slate-50 border-slate-300 placeholder:text-slate-400 focus:bg-white" 
                placeholder="اسم مدرستك"
              />
            </div>
          </div>

          {error && (
            <p className="sm:col-span-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </p>
          )}

          <Button type="submit" className="sm:col-span-2 w-full" size="lg" disabled={isPending}>
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> جاري الإنشاء...</> : <>إنشاء الحساب</>}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          عندك حساب بالفعل؟{' '}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">سجّل دخول</Link>
        </p>
      </div>
    </main>
  );
}
