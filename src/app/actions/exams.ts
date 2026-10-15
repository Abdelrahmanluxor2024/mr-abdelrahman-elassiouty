'use server';

import { cookies } from 'next/headers';
import { getExamById, getQuestionsByExam, saveExamAttempt } from '@/lib/firebase/services';

export async function startExam(examId: string) {
  try {
    const exam = await getExamById(examId);
    if (!exam) return { ok: false as const, error: 'الامتحان غير موجود' };
    return { ok: true as const, attemptId: `attempt-${Date.now()}`, durationMinutes: exam.durationMinutes };
  } catch {
    return { ok: false as const, error: 'حدث خطأ أثناء بدء الامتحان' };
  }
}

export async function submitExam(input: {
  attemptId: string;
  examId: string;
  answers: { questionId: string; answerText: string }[];
}) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value || 'anonymous';

    const [exam, questions] = await Promise.all([
      getExamById(input.examId),
      getQuestionsByExam(input.examId)
    ]);

    if (!exam) return { ok: false as const, error: 'الامتحان غير موجود' };

    // Grade the exam
    let score = 0;
    const answersMap: Record<string, string> = {};
    input.answers.forEach(a => { answersMap[a.questionId] = a.answerText; });

    questions.forEach(q => {
      const given = answersMap[q.id];
      if (q.questionType === 'mcq' && given === q.correctAnswer) {
        score += q.marks || 5;
      }
    });

    const totalMarks = exam.totalMarks || questions.reduce((s, q) => s + (q.marks || 5), 0);
    const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
    const status = percentage >= (exam.passingMarks / totalMarks * 100) ? 'passed' : 'failed';

    const attemptId = await saveExamAttempt({
      examId: input.examId,
      studentId: token,
      score,
      totalMarks,
      percentage,
      status,
      answers: answersMap,
      createdAt: new Date().toISOString()
    });

    return { ok: true as const, attemptId, percentage, status };
  } catch (err: any) {
    return { ok: false as const, error: err.message || 'حدث خطأ أثناء تسليم الامتحان' };
  }
}
