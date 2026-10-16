import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/layout/admin-shell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies();
  const token = cookieStore.get('token')?.value;
  const userRole = cookieStore.get('user_role')?.value;

  // Only redirect if there is definitively no token and no admin cookie
  if (!token && userRole !== 'admin') {
    redirect('/login');
  }

  if (userRole && userRole !== 'admin') {
    redirect('/dashboard');
  }

  return <AdminShell name="مستر عبدالرحمن الأسيوطي">{children}</AdminShell>;
}
