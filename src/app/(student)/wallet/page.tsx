'use client';

import { useState, useTransition } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWalletTransactions } from '@/lib/queries/useWallet';
import { fetchWalletBalance } from '@/lib/queries/useStudent';
import { redeemChargeCode } from '@/app/actions/wallet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CreditCard, Hash, Wallet as WalletIcon, ArrowDownToLine, ArrowUpToLine } from 'lucide-react';
import { formatCurrencyEGP, formatArabicNumber } from '@/lib/utils';
import { startFawryCheckout } from '@/app/actions/wallet';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function WalletPage() {
  const router = useRouter();
  const { data: balance = 0, refetch: refetchBalance } = useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: fetchWalletBalance,
  });
  const { data: txns = [], isLoading: l1 } = useWalletTransactions();
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState(100);
  const [redeeming, startRedeem] = useTransition();
  const [paying, startPay] = useTransition();

  function onRedeem() {
    if (!code) return;
    startRedeem(async () => {
      const res = await redeemChargeCode(code);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`تم شحن ${formatCurrencyEGP(res.amount)} بنجاح!`);
      setCode('');
      refetchBalance();
      router.refresh();
    });
  }

  function onFawry() {
    startPay(async () => {
      const res = await startFawryCheckout(amount);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.push(res.paymentUrl);
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-black text-brand-900">المحفظة</h1>
        <p className="mt-1 text-slate-600">اشحن محفظتك بكود السنتر أو عن طريق Fawry Pay.</p>
      </header>

      <Card className="overflow-hidden">
        <div className="bg-brand-gradient p-6 text-white">
          <div className="flex items-center gap-3">
            <WalletIcon className="h-6 w-6" />
            <p className="text-sm text-white/80">رصيدك الحالي</p>
          </div>
          <p className="mt-2 font-display text-4xl font-black">{formatCurrencyEGP(balance)}</p>
        </div>
      </Card>

      <Tabs defaultValue="code">
        <TabsList>
          <TabsTrigger value="code">كود السنتر</TabsTrigger>
          <TabsTrigger value="fawry">Fawry Pay</TabsTrigger>
        </TabsList>
        <TabsContent value="code">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-brand-600" />
                شحن بكود من السنتر
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="code">كود الشحن</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="مثلاً: ABCD-1234-EFGH"
                className="font-mono"
              />
              <Button onClick={onRedeem} disabled={redeeming || !code} className="w-full">
                {redeeming ? 'جاري الشحن...' : 'شحن الرصيد'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="fawry">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-brand-600" />
                الشحن عن طريق Fawry
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="amount">قيمة الشحن (ج.م)</Label>
              <Input
                id="amount"
                type="number"
                min={50}
                step={50}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
              <div className="flex flex-wrap gap-2">
                {[100, 200, 500, 1000].map((v) => (
                  <Button key={v} size="sm" variant={amount === v ? 'default' : 'outline'} onClick={() => setAmount(v)}>
                    {formatCurrencyEGP(v)}
                  </Button>
                ))}
              </div>
              <Button onClick={onFawry} disabled={paying} className="w-full">
                {paying ? 'جاري التحويل...' : 'ادفع بـ Fawry'}
              </Button>
              <p className="text-xs text-slate-500">
                هينقلك على بوابة Fawry الآمنة لإكمال الدفع.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>سجل المعاملات</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100">
          {l1 ? (
            <Skeleton className="h-20 w-full" />
          ) : txns.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">مفيش معاملات لسه.</p>
          ) : (
            txns.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-3">
                <div
                  className={`grid h-10 w-10 place-items-center rounded-xl ${
                    t.amount >= 0 ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                  }`}
                >
                  {t.amount >= 0 ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpToLine className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{t.description ?? 'معاملة'}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(t.created_at).toLocaleString('ar-EG')} • {t.payment_method ?? '—'}
                  </p>
                </div>
                <p className={`font-bold ${t.amount >= 0 ? 'text-success' : 'text-error'}`}>
                  {t.amount >= 0 ? '+' : '−'}
                  {formatCurrencyEGP(Math.abs(t.amount))}
                </p>
                <Badge variant={t.status === 'completed' ? 'success' : 'warning'}>{t.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
