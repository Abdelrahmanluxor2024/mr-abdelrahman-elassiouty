import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Student } from '@/types/supabase';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';

/** Server-only helpers — safe to import from RSC, server actions, route handlers. */

/**
 * Returns the current authenticated student. Redirects to /login if not logged in.
 */
export async function getCurrentStudent(): Promise<Student> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Query using service role to bypass any RLS latency/mismatch
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('students')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    redirect('/login');
  }
  return data;
}

export async function getStudentById(id: string): Promise<Student | null> {
  const supabase = createClient();
  const { data } = await supabase.from('students').select('*').eq('id', id).maybeSingle();
  return data;
}
