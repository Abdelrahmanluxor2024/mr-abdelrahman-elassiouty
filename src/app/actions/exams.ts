'use server';

import { initializeServerApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, getDocs, collection, query, where, runTransaction } from 'firebase/firestore';
import { headers } from 'next/headers';
import { hasCourseAccess } from '@/lib/firebase/course-payment';
import { firebaseConfig } from '@/lib/firebase/config';

// Authenticate the Firestore request with the student's real Firebase ID token.
// No service key, client-supplied UID, shared student ID, or cookie-role trust.
async function studentDatabase(idToken?: string) {
  if (!idToken) throw new Error('سجّل الدخول أولاً لبدء الامتحان');
  const app = initializeServerApp(firebaseConfig, {authIdToken: idToken, releaseOnDeref: headers()});
  const auth = getAuth(app);
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error('انتهت الجلسة. سجّل الدخول مرة أخرى');
  return { db: getFirestore(app), uid: auth.currentUser.uid };
}

type StartResult = { ok: true; attemptId: string; examId: string; durationMinutes: number } | {ok: false; error: string};
export async function startExam(examId: string, idToken?: string): Promise<StartResult> {
  try {
    const {db, uid} = await studentDatabase(idToken);
    const exam = await getDoc(doc(db, 'exams', examId));
    if (!exam.exists() || !exam.data().isActive) return {ok: false, error: 'الامتحان غير متاح حالياً'};
    const data = exam.data();
    if (data.courseId) {
      if (!(await hasCourseAccess(db, uid, data.courseId))) return {ok: false, error: 'اشترك في الكورس وأكمل الدفع أولاً'};
    }
    // Stable slots and a transaction prevent double attempts on StrictMode or rapid clicks.
    const max = Math.max(1, Number(data.maxAttempts) || 2);
    for (let slot = 1; slot <= max; slot++) {
      const ref = doc(db, 'exam_attempts', `${uid}_${examId}_${slot}`);
      const result = await runTransaction(db, async transaction => {
        const existing = await transaction.get(ref);
        if (existing.exists()) {
          const attempt = existing.data();
          if (attempt.status !== 'in_progress') return null;
          const remaining = Math.max(0, (Number(data.durationMinutes) || 20) - (Date.now() - Date.parse(attempt.createdAt)) / 60000);
          return {ok: true as const, attemptId: ref.id, examId, durationMinutes: remaining};
        }
        transaction.set(ref, {examId, studentId: uid, status: 'in_progress', createdAt: new Date().toISOString()});
        return {ok: true as const, attemptId: ref.id, examId, durationMinutes: Number(data.durationMinutes) || 20};
      });
      if (result) return result;
    }
    return {ok: false, error: 'استهلكت جميع محاولات هذا الامتحان'};
  } catch { return {ok: false, error: 'تعذر بدء الامتحان. تحقق من تسجيل الدخول والاتصال وصلاحيات الوصول'}; }
}

type SubmitResult = {ok: true; attemptId: string; score: number; percentage: number; correct: number; wrong: number; unanswered: number; branchScores: Record<string, {correct: number; total: number}>} | {ok: false; error: string};
export async function submitExam(input: {attemptId: string; examId: string; answers: Array<{questionId: string; answerText: string}>; idToken?: string}): Promise<SubmitResult> {
  try {
    const {db, uid} = await studentDatabase(input.idToken);
    const [exam, questionSnap] = await Promise.all([
      getDoc(doc(db, 'exams', input.examId)),
      getDocs(query(collection(db, 'questions'), where('examId', '==', input.examId)))
    ]);
    if (!exam.exists() || questionSnap.empty) return {ok: false, error: 'لا يمكن تصحيح امتحان بدون أسئلة'};
    const answers = new Map(input.answers.map(a => [a.questionId, a.answerText.trim()]));
    let score = 0, correct = 0, wrong = 0, unanswered = 0, totalMarks = 0;
    const branchScores: Record<string, {correct: number; total: number}> = {};
    const rows = questionSnap.docs.map(question => {
      const q = question.data();
      const text = answers.get(question.id) || '';
      const choice = q.questionType === 'mcq';
      const isCorrect = choice && !!text && text === q.correctAnswer;
      const marks = isCorrect ? Number(q.marks) : 0;
      totalMarks += Number(q.marks);
      score += marks;
      if (!text) unanswered++; else if (isCorrect) correct++; else if (choice) wrong++;
      const branch = q.branch || 'عام';
      branchScores[branch] ||= {correct: 0, total: 0};
      branchScores[branch].total++;
      if (isCorrect) branchScores[branch].correct++;
      return {id: `${input.attemptId}_${question.id}`, data: {attempt_id: input.attemptId, studentId: uid, question_id: question.id, answer_text: text || null, is_correct: choice ? isCorrect : null, marks_obtained: marks, status: choice ? 'auto_graded' : 'pending', created_at: new Date().toISOString()}};
    });
    const percentage = totalMarks ? Math.round(score / totalMarks * 100) : 0;
    const hasEssay = questionSnap.docs.some(q => q.data().questionType === 'essay');
    const attemptRef = doc(db, 'exam_attempts', input.attemptId);
    await runTransaction(db, async transaction => {
      const attempt = await transaction.get(attemptRef);
      if (!attempt.exists() || attempt.data().studentId !== uid || attempt.data().examId !== input.examId) throw new Error('invalid attempt');
      if (attempt.data().status !== 'in_progress') return; // Idempotent submission.
      rows.forEach(row => transaction.set(doc(db, 'student_answers', row.id), row.data));
      transaction.update(attemptRef, {score, totalMarks, percentage, correct_count: correct, wrong_count: wrong, unanswered_count: unanswered, status: hasEssay ? 'pending' : score >= Number(exam.data().passingMarks) ? 'passed' : 'failed', submittedAt: new Date().toISOString()});
    });
    return {ok: true, attemptId: input.attemptId, score, percentage, correct, wrong, unanswered, branchScores};
  } catch { return {ok: false, error: 'لم يتم حفظ الإجابات. تحقق من الاتصال ثم أعد التسليم؛ إجاباتك ما زالت محفوظة على جهازك'}; }
}
