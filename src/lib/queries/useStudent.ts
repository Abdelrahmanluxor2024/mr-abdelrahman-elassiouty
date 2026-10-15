'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Student } from '@/types/supabase';
import { useQuery } from '@tanstack/react-query';

function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/* -------- client hooks (browser only) -------- */
export function useStudent() {
  return useQuery({
    queryKey: ['student', 'me'],
    queryFn: async () => {
      const supabase = browserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('UNAUTHORIZED');
      const { data } = await supabase
        .from('students')
        .select('*')
        .eq('id', user.id)
        .single();
      return data as Student;
    },
  });
}

export function useStudentResults() {
  return useQuery({
    queryKey: ['student', 'results'],
    queryFn: async () => {
      const supabase = browserClient();
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('*, exam:exams(title)')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });
}

export async function fetchWalletBalance(): Promise<number> {
  const supabase = browserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data } = await supabase
    .from('students')
    .select('wallet_balance')
    .eq('id', user.id)
    .maybeSingle();
  return Number(data?.wallet_balance ?? 0);
}

export async function fetchUnreadCount(): Promise<number> {
  const supabase = browserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', user.id)
    .eq('is_read', false);
  return count ?? 0;
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: async () => {
      const supabase = browserClient();
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}
