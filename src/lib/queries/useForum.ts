'use client';

import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@supabase/ssr';
import type { ForumPost, ForumReply, LiveSession } from '@/types/supabase';

function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function useForumPosts() {
  return useQuery({
    queryKey: ['forum', 'posts'],
    queryFn: async (): Promise<ForumPost[]> => {
      const supabase = browserClient();
      const { data, error } = await supabase
        .from('forum_posts')
        .select('*, student:students(full_name, phone)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as (ForumPost & { student?: { full_name: string; phone: string } })[];
    },
  });
}

export function useForumReplies(postId: string) {
  return useQuery({
    queryKey: ['forum', 'replies', postId],
    enabled: !!postId,
    queryFn: async (): Promise<ForumReply[]> => {
      const supabase = browserClient();
      const { data, error } = await supabase
        .from('forum_replies')
        .select('*, student:students(full_name, phone)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as (ForumReply & { student?: { full_name: string; phone: string } })[];
    },
  });
}

export function useLiveSessions() {
  return useQuery({
    queryKey: ['live', 'all'],
    queryFn: async (): Promise<LiveSession[]> => {
      const supabase = browserClient();
      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .order('scheduled_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as LiveSession[];
    },
  });
}
