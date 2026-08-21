import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/layout/admin-shell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin');

  const role = (user.app_metadata as { role?: string } | null)?.role;
  if (role !== 'admin') redirect('/dashboard');

  return <AdminShell name={(user.user_metadata?.full_name as string) ?? user.email ?? 'Admin'}>{children}</AdminShell>;
}
