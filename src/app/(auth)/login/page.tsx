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
    <main className="grid min-h-screen place-items-center bg-brand-gradient px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/95 p-8 shadow-blue-glow backdrop-blur">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-blue-soft">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-black text-brand-900">تسجيل الدخول</h1>
          <p className="mt-1 text-sm text-slate-500">أهلاً بيك تاني، يلا نكمل المشوار 👋</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone">رقم الهاتف</Label>
            <div className="relative">
              <Phone className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="phone"
                inputMode="tel"
                placeholder="01xxxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="ps-10"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">كلمة المرور</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="ps-10"
                required
              />
            </div>
          </div>

          {displayError && (
            <p className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
              {displayError}
            </p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isPending}>
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

        <p className="mt-6 text-center text-sm text-slate-600">
          مش معاك حساب؟{' '}
          <Link href="/register" className="font-semibold text-brand-700 hover:underline">
            أنشئ حساب
          </Link>
        </p>
      </div>
    </main>
  );
}
