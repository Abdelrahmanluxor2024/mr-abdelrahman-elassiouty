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

export async function getAdminChargeCodes() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('charge_codes')
    .select('*, used_by_student:students!used_by(full_name, phone)')
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) return [];
  return data ?? [];
}

export async function getAdminStudents() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('students')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) return [];
  return data ?? [];
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

export async function grantStudentExamAttempt(input: { studentPhone: string; examId?: string }) {
  await requireAdmin();
  const admin = createAdminClient();

  const cleanPhone = input.studentPhone.trim();
  if (!cleanPhone) {
    return { ok: false as const, error: 'يرجى إدخال رقم هاتف الطالب' };
  }

  // Find student by phone
  const { data: student, error: studentErr } = await admin
    .from('students')
    .select('id, full_name, phone')
    .eq('phone', cleanPhone)
    .maybeSingle();

  if (studentErr || !student) {
    return { ok: false as const, error: 'لم يتم العثور على طالب بهذا الرقم' };
  }

  // Delete previous failed / terminated attempts for this student on the exam
  let query = admin.from('exam_attempts').delete().eq('student_id', student.id);
  if (input.examId && input.examId !== 'all') {
    query = query.eq('exam_id', input.examId);
  }

  const { error: deleteErr } = await query;
  if (deleteErr) {
    return { ok: false as const, error: deleteErr.message };
  }

  revalidatePath('/admin/exams');
  return { 
    ok: true as const, 
    studentName: student.full_name,
    message: `تم فتح محاولة جديدة بنجاح للطالب ${student.full_name}` 
  };
}

export async function updateCourse(input: {
  id: string;
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
    .update({
      title: input.title,
      description: input.description,
      price: input.price,
      is_free: input.is_free,
      duration_hours: input.duration_hours,
      thumbnail_url: input.thumbnail_url,
    })
    .eq('id', input.id)
    .select('*')
    .single();

  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin/courses');
  revalidatePath('/courses');
  revalidatePath(`/course/${input.id}`);
  return { ok: true as const, course: data };
}

export async function deleteCourse(courseId: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from('courses').delete().eq('id', courseId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath('/admin/courses');
  revalidatePath('/courses');
  return { ok: true as const };
}

export async function manualChargeStudent(input: { studentPhone: string; amount: number; reason?: string }) {
  await requireAdmin();
  const admin = createAdminClient();
  const cleanPhone = input.studentPhone.trim();
  const { data: student, error: studentErr } = await admin
    .from('students')
    .select('id, full_name, wallet_balance')
    .eq('phone', cleanPhone)
    .maybeSingle();

  if (studentErr || !student) {
    return { ok: false as const, error: 'لم يتم العثور على طالب بهذا الرقم' };
  }

  const newBalance = Number(student.wallet_balance) + Number(input.amount);
  const { error } = await admin.from('students').update({ wallet_balance: newBalance }).eq('id', student.id);
  if (error) return { ok: false as const, error: error.message };

  await admin.from('wallet_transactions').insert({
    student_id: student.id,
    amount: input.amount,
    type: 'admin_adjustment',
    status: 'completed',
    description: input.reason || 'شحن يدوي مباشر من الإدارة',
  });

  revalidatePath('/admin/students');
  return { ok: true as const, studentName: student.full_name, newBalance };
}



