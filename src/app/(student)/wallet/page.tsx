'use client';

import { useState } from 'react';
import { useCurrentStudent } from '@/lib/firebase/use-student-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CreditCard, Hash, Wallet as WalletIcon, ArrowDownToLine, Sparkles } from 'lucide-react';
import { formatCurrencyEGP } from '@/lib/utils';
import { toast } from 'sonner';

export default function WalletPage() {
  const { student } = useCurrentStudent();
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState(100);
  const [loading, setLoading] = useState(false);

  function onRedeem() {
    if (!code.trim()) {
      toast.error('يرجى إدخال كود الشحن');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.error('كود الشحن غير صالح أو تم استخدامه مسبقاً');
    }, 800);
  }

  function onFawry() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.info('بوابة فوري بي قيد التجهيز من قبل الإدارة');
    }, 800);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto" dir="rtl">
      <header>
        <h1 className="font-display text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
          <span>المحفظة والشحن</span>
          <span>💳</span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          اشحن محفظتك بكود السنتر أو وسائل الدفع الإلكتروني للاشتراك في الكورسات.
        </p>
      </header>

      {/* Balance Card */}
      <Card className="overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md">
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 p-6 text-white relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 backdrop-blur-md">
              <WalletIcon className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <p className="text-xs text-blue-200 font-semibold">رصيد محفظتك الحالي</p>
              <p className="mt-1 font-display text-3xl sm:text-4xl font-black">
                {formatCurrencyEGP(student.walletBalance || 0)}
              </p>
            </div>
          </div>
          <div className="absolute -left-10 -bottom-10 h-36 w-36 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="code" className="space-y-4">
        <TabsList className="rounded-2xl bg-slate-100 dark:bg-[#0E172A] p-1 border border-slate-200/80 dark:border-slate-800">
          <TabsTrigger value="code" className="rounded-xl font-bold text-xs">كود السنتر</TabsTrigger>
          <TabsTrigger value="fawry" className="rounded-xl font-bold text-xs">Fawry Pay</TabsTrigger>
        </TabsList>

        <TabsContent value="code">
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0E172A]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <Hash className="h-5 w-5 text-blue-600 dark:text-cyan-400" />
                شحن بكود من السنتر
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-xs font-bold text-slate-700 dark:text-slate-300">كود الشحن</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="مثلاً: ABCD-1234-EFGH"
                  className="font-mono text-left rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                />
              </div>
              <Button
                onClick={onRedeem}
                disabled={loading || !code.trim()}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 shadow-md shadow-blue-600/20"
              >
                {loading ? 'جاري التحقق والشحن...' : 'شحن الرصيد ⚡'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fawry">
          <Card className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#0E172A]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <CreditCard className="h-5 w-5 text-blue-600 dark:text-cyan-400" />
                الشحن عن طريق Fawry Pay
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount" className="text-xs font-bold text-slate-700 dark:text-slate-300">قيمة الشحن (ج.م)</Label>
                <Input
                  id="amount"
                  type="number"
                  min={50}
                  step={50}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {[100, 200, 500].map((v) => (
                  <Button
                    key={v}
                    size="sm"
                    variant={amount === v ? 'default' : 'outline'}
                    onClick={() => setAmount(v)}
                    className="rounded-xl text-xs font-bold"
                  >
                    {formatCurrencyEGP(v)}
                  </Button>
                ))}
              </div>
              <Button
                onClick={onFawry}
                disabled={loading}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 shadow-md shadow-emerald-600/20"
              >
                {loading ? 'جاري التحويل...' : 'ادفع بـ Fawry'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
