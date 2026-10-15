'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Phone, Lock, User, Loader2, UserPlus, MapPin, School, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { registerWithPhone } from '@/lib/firebase/auth-service';
import { cn } from '@/lib/utils';

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
    fullName: '',
    phone: '',
    password: '',
    parentPhone: '',
    gender: 'male',
    governorate: 'القاهرة',
    school: '',
    grade: '2nd_bac',
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onChange(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.phone.length < 10) {
      setError('رقم الهاتف غير صحيح');
      return;
    }
    if (form.password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    startTransition(async () => {
      const result = await registerWithPhone({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        password: form.password,
        parentPhone: form.parentPhone.trim() || undefined,
        gender: form.gender,
        governorate: form.governorate,
        school: form.school.trim() || undefined,
        grade: form.grade,
      });

      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }

      // Set cookie for middleware auth check
      document.cookie = `token=${result.uid}; path=/; max-age=2592000`;
      document.cookie = `user_role=student; path=/; max-age=2592000`;

      toast.success('🎉 تم إنشاء الحساب وتسجيل الدخول بنجاح! مرحباً بك في المنصة.');
      window.location.href = '/dashboard';
    });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#070B14] px-4 py-8" dir="rtl">
      <div className="w-full max-w-2xl rounded-3xl border border-blue-500/30 bg-[#0B1324]/95 p-6 sm:p-8 shadow-2xl shadow-blue-500/10 backdrop-blur">

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
            <UserPlus className="h-7 w-7" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-white">حساب جديد</h1>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-400">ابدأ رحلتك التعليمية مع مستر عبدالرحمن الأسيوطي</p>
        </div>

        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">

          {/* Full Name */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="fullName" className="text-slate-200 font-bold text-xs sm:text-sm">الاسم بالكامل</Label>
            <div className="relative">
              <User className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => onChange('fullName', e.target.value)}
                className="ps-10 text-white font-bold bg-slate-900/80 border-slate-700 placeholder:text-slate-600 focus:border-blue-500"
                placeholder="اكتب اسمك الثلاثي أو الرباعي"
                required
              />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-slate-200 font-bold text-xs sm:text-sm">رقم الهاتف</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="phone"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => onChange('phone', e.target.value)}
                className="ps-10 text-white font-bold bg-slate-900/80 border-slate-700 placeholder:text-slate-600 focus:border-blue-500"
                placeholder="010xxxxxxxx"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-slate-200 font-bold text-xs sm:text-sm">كلمة المرور</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => onChange('password', e.target.value)}
                className="ps-10 pe-10 text-white font-bold bg-slate-900/80 border-slate-700 placeholder:text-slate-600 focus:border-blue-500"
                placeholder="6 أحرف على الأقل"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Parent Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="parentPhone" className="text-slate-200 font-bold text-xs sm:text-sm">رقم ولي الأمر (اختياري)</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="parentPhone"
                inputMode="tel"
                value={form.parentPhone}
                onChange={(e) => onChange('parentPhone', e.target.value)}
                className="ps-10 text-white font-bold bg-slate-900/80 border-slate-700 placeholder:text-slate-600 focus:border-blue-500"
                placeholder="01xxxxxxxxx"
              />
            </div>
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <Label className="text-slate-200 font-bold text-xs sm:text-sm">النوع (الجنس)</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChange('gender', 'male')}
                className={cn(
                  'h-10 rounded-xl font-bold text-sm border transition-all flex items-center justify-center gap-1.5',
                  form.gender === 'male'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/25'
                    : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                )}
              >
                <span>👨‍🎓 ذكر</span>
              </button>
              <button
                type="button"
                onClick={() => onChange('gender', 'female')}
                className={cn(
                  'h-10 rounded-xl font-bold text-sm border transition-all flex items-center justify-center gap-1.5',
                  form.gender === 'female'
                    ? 'bg-pink-600 text-white border-pink-600 shadow-md shadow-pink-500/25'
                    : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                )}
              >
                <span>👩‍🎓 أنثى</span>
              </button>
            </div>
          </div>

          {/* Grade */}
          <div className="space-y-1.5">
            <Label htmlFor="grade" className="text-slate-200 font-bold text-xs sm:text-sm">الصف الدراسي</Label>
            <select
              id="grade"
              value={form.grade}
              onChange={(e) => onChange('grade', e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3 text-sm font-bold text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="1st_bac">الصف الأول بكالوريا</option>
              <option value="2nd_bac">الصف الثاني بكالوريا</option>
            </select>
          </div>

          {/* Governorate */}
          <div className="space-y-1.5">
            <Label htmlFor="governorate" className="text-slate-200 font-bold text-xs sm:text-sm">المحافظة</Label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <select
                id="governorate"
                value={form.governorate}
                onChange={(e) => onChange('governorate', e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-700 bg-slate-900/80 ps-10 pe-3 text-sm font-bold text-white focus:border-blue-500 focus:outline-none"
              >
                {EGYPTIAN_GOVERNORATES.map((gov) => (
                  <option key={gov} value={gov}>{gov}</option>
                ))}
              </select>
            </div>
          </div>

          {/* School */}
          <div className="space-y-1.5">
            <Label htmlFor="school" className="text-slate-200 font-bold text-xs sm:text-sm">المدرسة (اختياري)</Label>
            <div className="relative">
              <School className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="school"
                value={form.school}
                onChange={(e) => onChange('school', e.target.value)}
                className="ps-10 text-white font-bold bg-slate-900/80 border-slate-700 placeholder:text-slate-600 focus:border-blue-500"
                placeholder="اسم مدرستك"
              />
            </div>
          </div>

          {error && (
            <p className="sm:col-span-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 text-center font-bold">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="sm:col-span-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-2xl shadow-lg shadow-blue-600/30"
            size="lg"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري إنشاء الحساب...
              </>
            ) : (
              'إنشاء الحساب 🚀'
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          عندك حساب بالفعل؟{' '}
          <Link href="/login" className="font-bold text-cyan-400 hover:underline">سجّل دخول</Link>
        </p>
      </div>
    </main>
  );
}
