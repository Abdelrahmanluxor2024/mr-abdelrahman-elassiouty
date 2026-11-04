import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center theme-inverse bg-brand-gradient px-4 text-center text-ink">
      <div>
        <p className="text-sm uppercase tracking-widest text-muted">404</p>
        <h1 className="mt-2 font-display text-4xl font-black">الصفحة مش موجودة</h1>
        <p className="mt-2 max-w-md text-muted">ممكن الرابط غلط أو الصفحة اتنقلت.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild className="theme-panel bg-white dark:bg-slate-900 text-brand-700 hover:bg-white/90">
            <Link href="/">الرجوع للرئيسية</Link>
          </Button>
          <Button asChild variant="outline" className="border-white/40 bg-white/10 text-ink hover:bg-white/20">
            <Link href="/dashboard">لوحة التحكم</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
