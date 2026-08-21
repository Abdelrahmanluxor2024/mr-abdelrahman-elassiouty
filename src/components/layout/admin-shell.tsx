'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logout } from '@/app/actions/auth';

const ADMIN_NAV = [
  { href: '/admin', label: 'الإحصائيات' },
  { href: '/admin/students', label: 'الطلاب' },
  { href: '/admin/courses', label: 'الكورسات' },
  { href: '/admin/exams', label: 'الامتحانات' },
  { href: '/admin/grading', label: 'تصحيح مقالي' },
  { href: '/admin/forum', label: 'المنتدى والرد على الأسئلة' },
  { href: '/admin/charge-codes', label: 'أكواد الشحن' },
];

export function AdminShell({ children, name }: { children: React.ReactNode; name: string }) {
  const pathname = usePathname();
  return (
    <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
      <aside className="border-l border-slate-200 bg-brand-900 text-white">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 font-display font-black">
            A
          </div>
          <div>
            <p className="text-xs text-white/60">لوحة التحكم</p>
            <p className="text-sm font-semibold">{name}</p>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {ADMIN_NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'block rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                  active ? 'bg-white text-brand-900' : 'text-white/80 hover:bg-white/10'
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <form action={logout} className="pt-4">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              خروج
            </button>
          </form>
        </nav>
      </aside>
      <main className="bg-soft p-6 lg:p-8">{children}</main>
    </div>
  );
}
