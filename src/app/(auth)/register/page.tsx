'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Phone, Lock, User, Loader2, UserPlus, MapPin, School } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerStudent } from '@/app/actions/auth';
import { getDeviceFingerprint } from '@/lib/device';

import { createClient } from '@/lib/supabase/client';
import { phoneToEmail } from '@/lib/utils';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    password: '',
    parent_phone: '',
    governorate: '',
    school: '',
    grade: '3rd_secondary' as '1st_secondary' | '2nd_secondary' | '3rd_secondary',
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
    <main className="grid min-h-screen place-items-center bg-brand-gradient px-4 py-8">
      <div className="w-full max-w-2xl rounded-3xl border border-white/15 bg-white/95 p-8 shadow-blue-glow backdrop-blur">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-blue-soft">
            <UserPlus className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-black text-brand-900">حساب جديد</h1>
          <p className="mt-1 text-sm text-slate-500">ابدأ رحلتك مع مستر عبدالرحمن الأسيوطي</p>
        </div>

        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="full_name">الاسم بالكامل</Label>
            <div className="relative">
              <User className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input id="full_name" value={form.full_name} onChange={(e) => onChange('full_name', e.target.value)} className="ps-10" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">رقم الهاتف</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input id="phone" inputMode="tel" value={form.phone} onChange={(e) => onChange('phone', e.target.value)} className="ps-10" placeholder="01xxxxxxxxx" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">كلمة المرور</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input id="password" type="password" value={form.password} onChange={(e) => onChange('password', e.target.value)} className="ps-10" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="parent_phone">رقم ولي الأمر (اختياري)</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input id="parent_phone" inputMode="tel" value={form.parent_phone} onChange={(e) => onChange('parent_phone', e.target.value)} className="ps-10" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="grade">الصف الدراسي</Label>
            <select
              id="grade"
              value={form.grade}
              onChange={(e) => onChange('grade', e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="1st_secondary">أولى ثانوي</option>
              <option value="2nd_secondary">تانية ثانوي</option>
              <option value="3rd_secondary">تالتة ثانوي</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="governorate">المحافظة</Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input id="governorate" value={form.governorate} onChange={(e) => onChange('governorate', e.target.value)} className="ps-10" placeholder="القاهرة" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="school">المدرسة</Label>
            <div className="relative">
              <School className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input id="school" value={form.school} onChange={(e) => onChange('school', e.target.value)} className="ps-10" />
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
