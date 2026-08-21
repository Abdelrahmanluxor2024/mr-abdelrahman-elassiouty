import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/components/layout/admin-shell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin');

  // Verify only authorized phone 01064106070 can access admin panel
  const adminClient = createAdminClient();
  const { data: student } = await adminClient
    .from('students')
    .select('phone, full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  const userPhone = student?.phone ?? user.phone ?? '';
  const isMasterAdmin = userPhone === '01064106070' || user.email === '01064106070@mrass.app';

  if (!isMasterAdmin && student?.role !== 'admin') {
    redirect('/dashboard');
  }

  const displayName = student?.full_name ?? 'مستر عبدالرحمن الأسيوطي';

  return <AdminShell name={displayName}>{children}</AdminShell>;
}
