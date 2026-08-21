'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ExamAttempt, Question, StudentAnswer } from '@/types/supabase';
import { revalidatePath } from 'next/cache';

type StartResult =
  | { ok: true; attemptId: string; examId: string; durationMinutes: number }
  | { ok: false; error: string };

export async function startExam(examId: string): Promise<StartResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'لازم تسجّل دخولك الأول.' };

  const studentId = (user.user_metadata?.student_id as string) ?? user.id;

  // Check attempts limit
  const { data: exam, error: examError } = await supabase
    .from('exams')
    .select('*')
    .eq('id', examId)
    .single();
  if (examError || !exam) return { ok: false, error: 'الامتحان غير موجود.' };

  const { count } = await supabase
    .from('exam_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('exam_id', examId);

  if ((count ?? 0) >= exam.max_attempts) {
    return { ok: false, error: 'استنفدت كل المحاولات المتاحة.' };
  }

  const { data: attempt, error } = await supabase
    .from('exam_attempts')
    .insert({
      student_id: studentId,
      exam_id: examId,
      status: 'in_progress',
    })
    .select('id, exam_id')
    .single();

  if (error || !attempt) {
    return { ok: false, error: error?.message ?? 'فشل بدء الامتحان.' };
  }

  return {
    ok: true,
    attemptId: attempt.id,
    examId: attempt.exam_id,
    durationMinutes: exam.duration_minutes,
  };
}

type SubmitResult =
  | { ok: true; attemptId: string; score: number; percentage: number; correct: number; wrong: number; unanswered: number; branchScores: Record<string, { correct: number; total: number }> }
  | { ok: false; error: string };

/**
 * Server-side grading. Always grades on the server so the client can never
 * see `correct_answer` until we deliberately return it through the result
 * page (where it's already known to the student as feedback).
 *
 * For essay questions we DO NOT grade them — we mark them as `pending`
 * and a human grader handles them later via /admin/grading.
 */
export async function submitExam(input: {
  attemptId: string;
  examId: string;
  answers: Array<{ questionId: string; answerText: string }>;
}): Promise<SubmitResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'لازم تسجّل دخولك.' };

  const studentId = (user.user_metadata?.student_id as string) ?? user.id;

  // Verify ownership of the attempt
  const { data: attempt, error: attemptError } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('id', input.attemptId)
    .eq('student_id', studentId)
    .single();
  if (attemptError || !attempt) return { ok: false, error: 'محاولة غير صالحة.' };
  if (attempt.status !== 'in_progress') return { ok: false, error: 'المحاولة دي متسلّمة قبل كده.' };

  // Load questions
  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('*')
    .eq('exam_id', input.examId)
    .order('order_index', { ascending: true });
  if (qError || !questions) return { ok: false, error: 'فشل تحميل الأسئلة.' };

  const answersByQ = new Map(input.answers.map((a) => [a.questionId, a.answerText]));

  let correct = 0;
  let wrong = 0;
  let unanswered = 0;
  let score = 0;
  const branchScores: Record<string, { correct: number; total: number }> = {};

  const toInsert: Partial<StudentAnswer>[] = [];

  for (const q of questions as Question[]) {
    const studentAns = answersByQ.get(q.id) ?? '';
    const branch = q.branch ?? 'عام';
    if (!branchScores[branch]) branchScores[branch] = { correct: 0, total: 0 };
    branchScores[branch].total += 1;

    if (q.question_type === 'mcq') {
      if (!studentAns) {
        unanswered += 1;
        toInsert.push({ attempt_id: input.attemptId, question_id: q.id, answer_text: null, is_correct: null, marks_obtained: 0, status: 'auto_graded' });
      } else if (studentAns === q.correct_answer) {
        correct += 1;
        score += q.marks;
        branchScores[branch].correct += 1;
        toInsert.push({ attempt_id: input.attemptId, question_id: q.id, answer_text: studentAns, is_correct: true, marks_obtained: q.marks, status: 'auto_graded' });
      } else {
        wrong += 1;
        toInsert.push({ attempt_id: input.attemptId, question_id: q.id, answer_text: studentAns, is_correct: false, marks_obtained: 0, status: 'auto_graded' });
      }
    } else {
      // essay: pending until manual grading
      toInsert.push({
        attempt_id: input.attemptId,
        question_id: q.id,
        answer_text: studentAns || null,
        is_correct: null,
        marks_obtained: 0,
        status: 'pending',
      });
      unanswered += 1; // not counted in MCQ stats
    }
  }

  // Use admin client to bypass RLS for the insert (we already verified ownership).
  const admin = createAdminClient();
  const { error: insErr } = await admin.from('student_answers').insert(toInsert);
  if (insErr) return { ok: false, error: 'فشل حفظ الإجابات.' };

  const totalMarks = (questions as Question[]).reduce((s, q) => s + q.marks, 0);
  const percentage = totalMarks === 0 ? 0 : (score / totalMarks) * 100;

  const hasEssays = (questions as Question[]).some((q) => q.question_type === 'essay');
  const finalStatus: 'submitted' | 'graded' = hasEssays ? 'submitted' : 'graded';

  const { error: updateError } = await admin
    .from('exam_attempts')
    .update({
      submitted_at: new Date().toISOString(),
      score,
      percentage,
      correct_count: correct,
      wrong_count: wrong,
      unanswered_count: unanswered,
      status: finalStatus,
      performance_by_branch: branchScores,
    })
    .eq('id', input.attemptId);

  if (updateError) return { ok: false, error: 'فشل تحديث المحاولة.' };

  revalidatePath('/profile');
  revalidatePath('/dashboard');

  return {
    ok: true,
    attemptId: input.attemptId,
    score,
    percentage,
    correct,
    wrong,
    unanswered,
    branchScores,
  };
}
