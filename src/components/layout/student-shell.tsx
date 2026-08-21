import { Sidebar } from './sidebar';
import { Navbar } from './navbar';
import { getCurrentStudent } from '@/lib/queries/useStudentServer';
import { WhatsAppButton } from '@/components/common/whatsapp-button';

export async function StudentShell({ children }: { children: React.ReactNode }) {
  const student = await getCurrentStudent();

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#070B14] text-slate-900 dark:text-slate-100 transition-colors duration-200" dir="rtl">
      <Sidebar studentName={student.full_name} avatarUrl={student.avatar_url} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar studentName={student.full_name} />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8 bg-slate-50/50 dark:bg-[#070B14] transition-colors">{children}</main>
        <WhatsAppButton />
      </div>
    </div>
  );
}

