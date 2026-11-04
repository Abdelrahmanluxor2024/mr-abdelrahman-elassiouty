"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useCurrentStudent } from "@/lib/firebase/use-student-auth";
import { ThemeToggle } from "./theme-toggle";
import { LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_NAV = [
  { href: "/admin", label: "الإحصائيات" },
  { href: "/admin/students", label: "الطلاب" },
  { href: "/admin/courses", label: "الكورسات" },
  { href: "/admin/exams", label: "الامتحانات" },
  { href: "/admin/grading", label: "تصحيح مقالي" },
  { href: "/admin/community", label: "📢 جروب المنصة والمنشورات" },
  { href: "/admin/notifications", label: "🔔 إرسال الإشعارات" },
  { href: "/admin/forum", label: "المنتدى والرد على الأسئلة" },
  { href: "/admin/charge-codes", label: "أكواد الشحن" },
];

export function AdminShell({
  children,
  name,
}: {
  children: React.ReactNode;
  name: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { logout } = useCurrentStudent();
  return (
    <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
      <aside className="border-l border-slate-200 theme-inverse bg-brand-900 text-ink">
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 font-display font-black">
            A
          </div>
          <div>
            <p className="text-xs text-muted">لوحة التحكم</p>
            <p className="text-sm font-semibold">{name}</p>
          </div>
        </div>
        <button
          type="button"
          className="absolute left-4 top-4 rounded-lg border border-white/20 p-2 lg:hidden"
          aria-label="قائمة الإدارة"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
        <nav
          className={cn(
            "space-y-1 p-3",
            menuOpen ? "block" : "hidden lg:block",
          )}
        >
          {ADMIN_NAV.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                onClick={() => setMenuOpen(false)}
                href={item.href}
                className={cn(
                  "block rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "theme-panel bg-white dark:bg-slate-900 text-brand-900"
                    : "text-muted hover:bg-white/10",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="pt-4">
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 text-sm font-semibold text-muted hover:bg-white/10"
            >
              <LogOut className="h-4 w-4" />
              خروج
            </button>
          </div>
        </nav>
      </aside>
      <main className="min-w-0 theme-panel bg-slate-50 dark:bg-[#070B14] p-4 sm:p-6 lg:p-8">
        <header className="mb-6 flex items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
          <p className="text-sm font-bold text-ink">مساحة إدارة المنصة</p>
          <ThemeToggle />
        </header>
        {children}
      </main>
    </div>
  );
}
