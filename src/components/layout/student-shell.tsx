'use client';

import { Sidebar } from './sidebar';
import { Navbar } from './navbar';
import { useCurrentStudent } from '@/lib/firebase/use-student-auth';

export function StudentShell({ children }: { children: React.ReactNode }) {
  const { student } = useCurrentStudent();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#070B14] text-slate-900 dark:text-slate-100 transition-colors duration-200" dir="rtl">
      <Sidebar studentName={student.fullName} avatarUrl={student.avatarUrl} role={student.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar studentName={student.fullName} balance={student.walletBalance} role={student.role} />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8 bg-slate-50/50 dark:bg-[#070B14] transition-colors">{children}</main>
      </div>
    </div>
  );
}
