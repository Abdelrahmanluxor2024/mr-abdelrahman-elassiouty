'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = (user?.app_metadata as { role?: string } | null)?.role;
  if (!user || role !== 'admin') {
    throw new Error('FORBIDDEN');
  }
  return user;
}

export async function createChargeCodes(input: { count: number; amount: number; prefix?: string }) {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: { user } } = await admin.auth.getUser();

  const rows = Array.from({ length: input.count }).map(() => ({
    code: `${(input.prefix ?? 'MR').toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    amount: input.amount,
    created_by: user?.id ?? null,
  }));

  const { data, error } = await admin.from('charge_codes').insert(rows).select('*');
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin/charge-codes');
  return { ok: true as const, codes: data };
}

export async function createCourse(input: {
  title: string;
  description: string;
  price: number;
  is_free: boolean;
  duration_hours: number;
  thumbnail_url?: string;
}) {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('courses')
    .insert({
      ...input,
      is_published: true,
    })
    .select('*')
    .single();
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin/courses');
  return { ok: true as const, course: data };
}

export async function publishCourse(courseId: string, isPublished: boolean) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('courses').update({ is_published: isPublished }).eq('id', courseId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin/courses');
  return { ok: true as const };
}

export async function gradeEssay(input: {
  answerId: string;
  marksObtained: number;
  feedback?: string;
}) {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: { user } } = await admin.auth.getUser();
  const { error } = await admin
    .from('student_answers')
    .update({
      marks_obtained: input.marksObtained,
      grader_feedback: input.feedback ?? null,
      graded_by: user?.id ?? null,
      graded_at: new Date().toISOString(),
      status: 'manually_graded',
      is_correct: input.marksObtained > 0,
    })
    .eq('id', input.answerId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin/grading');
  return { ok: true as const };
}

export async function adminReplyToPost(input: { postId: string; content: string }) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error: replyErr } = await admin.from('forum_replies').insert({
    post_id: input.postId,
    content: input.content,
    is_admin_reply: true,
  });

  if (replyErr) return { ok: false as const, error: replyErr.message };

  await admin.from('forum_posts').update({ is_answered: true }).eq('id', input.postId);

  revalidatePath('/admin/forum');
  revalidatePath('/forum');
  return { ok: true as const };
}

export async function deleteForumPost(postId: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('forum_posts').delete().eq('id', postId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin/forum');
  revalidatePath('/forum');
  return { ok: true as const };
}

