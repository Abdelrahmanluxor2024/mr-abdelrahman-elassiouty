'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function addCommunityComment(input: { postId: string; commentText: string }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'يرجى تسجيل الدخول أولاً لتتمكن من التعليق' };

  const studentId = (user.user_metadata?.student_id as string) ?? user.id;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from('forum_replies')
    .insert({
      post_id: input.postId,
      student_id: studentId,
      content: input.commentText.trim(),
      is_admin_reply: false,
    })
    .select('*')
    .single();

  if (error) return { ok: false as const, error: error.message };


  // Increment replies count (best effort — ignore errors)
  try {
    await admin.from('forum_posts').update({ replies_count: 1 }).eq('id', input.postId).eq('replies_count', -999); // no-op placeholder
    const { data: fp } = await admin.from('forum_posts').select('replies_count').eq('id', input.postId).single();
    if (fp) {
      await admin.from('forum_posts').update({ replies_count: (fp.replies_count ?? 0) + 1 }).eq('id', input.postId);
    }
  } catch {
    // ignore
  }

  revalidatePath('/');
  revalidatePath('/dashboard');
  return { ok: true as const, reply: data };
}

export async function likeCommunityPost(postId: string) {
  const admin = createAdminClient();
  const { data: post } = await admin.from('forum_posts').select('likes_count').eq('id', postId).single();
  const newLikes = (post?.likes_count ?? 0) + 1;
  await admin.from('forum_posts').update({ likes_count: newLikes }).eq('id', postId);
  revalidatePath('/');
  revalidatePath('/dashboard');
  return { ok: true as const, likes: newLikes };
}
