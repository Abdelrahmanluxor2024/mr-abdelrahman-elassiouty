'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './sidebar';
import { Navbar } from './navbar';

interface StudentInfo {
  full_name: string;
  avatar_url?: string;
}

export function StudentShell({ children }: { children: React.ReactNode }) {
  const [student, setStudent] = useState<StudentInfo>({ full_name: '' });

  useEffect(() => {
    async function loadStudent() {
      const token = document.cookie
        .split('; ')
        .find(r => r.startsWith('token='))
        ?.split('=')[1];

      if (!token) {
        window.location.href = '/login';
        return;
      }

      try {
        const { getUserProfile } = await import('@/lib/firebase/auth-service');
        const profile = await getUserProfile(token);
        if (profile) {
          setStudent({
            full_name: profile.fullName || profile.full_name || 'طالب',
            avatar_url: profile.avatarUrl || profile.avatar_url || '',
          });
        } else {
          setStudent({ full_name: 'طالب' });
        }
      } catch {
        setStudent({ full_name: 'طالب' });
      }
    }
    loadStudent();
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#070B14] text-slate-900 dark:text-slate-100 transition-colors duration-200" dir="rtl">
      <Sidebar studentName={student.full_name} avatarUrl={student.avatar_url} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar studentName={student.full_name} />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8 bg-slate-50/50 dark:bg-[#070B14] transition-colors">
          {children}
        </main>
      </div>
    </div>
  );
}
