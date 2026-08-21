'use client';

import { Suspense, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Phone, Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginWithPhone } from '@/app/actions/auth';
import { getDeviceFingerprint } from '@/lib/device';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-brand-gradient text-white">جاري التحميل...</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = search.get('next') ?? '/dashboard';

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const urlError = search.get('error');
  const displayError = error ?? urlError;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await loginWithPhone({
        phone,
        password,
        device_fingerprint: getDeviceFingerprint(),
      });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: result.email,
        password: password,
      });

      if (signInError) {
        setError(signInError.message);
        toast.error(signInError.message);
        return;
      }

      toast.success('تم تسجيل الدخول بنجاح');
      window.location.href = nextPath;
    });
  }

  return (
    <main className="relative grid min-h-screen place-items-center px-4 overflow-hidden bg-[#070B14]">
      {/* Background Image aaa.png with Cyber Overlay */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/images/auth-bg.png"
          alt="خلفية المنصة"
          fill
          priority
          className="object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#070B14]/80 via-[#070B14]/70 to-[#070B14]" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-blue-500/30 bg-[#0B1324]/90 p-8 shadow-2xl shadow-blue-500/20 backdrop-blur-xl">
        <div className="mb-6 text-center">
          <div className="relative mx-auto mb-3 h-16 w-20">
            <Image
              src="/images/logo.png"
              alt="شعار مستر عبدالرحمن الأسيوطي"
              fill
              className="object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="font-display text-2xl font-black text-white">تسجيل الدخول</h1>
          <p className="mt-1 text-sm text-slate-400">أهلاً بيك تاني، يلا نكمل المشوار 👋</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5 text-right">
            <Label htmlFor="phone" className="text-slate-200">رقم الهاتف</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="phone"
                inputMode="tel"
                placeholder="01xxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="ps-10 bg-slate-900/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5 text-right">
            <Label htmlFor="password" className="text-slate-200">كلمة المرور</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ps-10 bg-slate-900/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {displayError && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {displayError}
            </p>
          )}

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-2xl shadow-lg shadow-blue-600/30" size="lg" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الدخول...
              </>
            ) : (
              <>
                دخول
                <ArrowLeft className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          مش معاك حساب؟{' '}
          <Link href="/register" className="font-bold text-cyan-400 hover:underline">
            أنشئ حساب
          </Link>
        </p>
      </div>
    </main>
  );
}
