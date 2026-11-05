"use server";

import { initializeServerApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  runTransaction,
} from "firebase/firestore";
import { headers } from "next/headers";
import { hasCourseAccess } from "@/lib/firebase/course-payment";
import { examPolicy, questionMarks } from "@/lib/exam-policy";
import { firebaseConfig } from "@/lib/firebase/config";

// Authenticate the Firestore request with the student's real Firebase ID token.
// No service key, client-supplied UID, shared student ID, or cookie-role trust.
async function studentDatabase(idToken?: string) {
  if (!idToken) throw new Error("سجّل الدخول أولاً لبدء الامتحان");
  const app = initializeServerApp(firebaseConfig, {
    authIdToken: idToken,
    releaseOnDeref: headers(),
  });
  const auth = getAuth(app);
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error("انتهت الجلسة. سجّل الدخول مرة أخرى");
  return { db: getFirestore(app), uid: auth.currentUser.uid };
}

type StartResult =
  | {
      ok: true;
      attemptId: string;
      examId: string;
      durationMinutes: number;
      locked?: boolean;
      fresh?: boolean;
    }
  | { ok: false; error: string };
export async function startExam(
  examId: string,
  idToken?: string,
): Promise<StartResult> {
  try {
    const { db, uid } = await studentDatabase(idToken);
    const exam = await getDoc(doc(db, "exams", examId));
    if (!exam.exists() || !exam.data().isActive)
      return { ok: false, error: "الامتحان غير متاح حالياً" };
    const data = exam.data();
    if (data.courseId) {
      if (!(await hasCourseAccess(db, uid, data.courseId)))
        return { ok: false, error: "اشترك في الكورس وأكمل الدفع أولاً" };
    }
    // Historical attempts count toward configured limits; active attempts resume unchanged.
    const history = await getDocs(
      query(
        collection(db, "exam_attempts"),
        where("studentId", "==", uid),
        where("examId", "==", examId),
      ),
    );
    const policy = examPolicy(data);
    if (policy.maxAttempts !== 1) {
      return await runTransaction(db, async (tx) => {
        const counterRef = doc(db, "exam_attempt_counters", `${uid}_${examId}`);
        const counter = await tx.get(counterRef);
        const n = Math.max(
          Number(counter.data()?.count || 0),
          history.docs.length,
        );
        if (!Number.isSafeInteger(n) || n < 0)
          throw new Error("invalid attempt counter");
        const activeId =
          counter.data()?.activeId ||
          history.docs.find((d) => d.data().status === "in_progress")?.id;
        const active = activeId
          ? await tx.get(doc(db, "exam_attempts", activeId))
          : null;
        const duration = Math.max(1, Number(data.durationMinutes) || 20);
        if (active?.exists() && active.data().status === "in_progress") {
          const a = active.data();
          if (a.studentId !== uid || a.examId !== examId)
            throw new Error("invalid owner");
          return {
            ok: true as const,
            attemptId: activeId,
            examId,
            durationMinutes: a.lockedAt
              ? 0
              : Math.max(
                  0,
                  ((Date.parse(a.expiresAt) ||
                    Date.parse(a.createdAt) + duration * 60000) -
                    Date.now()) /
                    60000,
                ),
            locked: !!a.lockedAt,
          };
        }
        let generation = 0;
        const grantRef = doc(db, "exam_attempt_grants", `${uid}_${examId}`);
        if (policy.maxAttempts && n >= policy.maxAttempts) {
          const grant = await tx.get(grantRef),
            g = grant.data();
          if (
            !g ||
            g.studentId !== uid ||
            g.examId !== examId ||
            !Number.isSafeInteger(g.generation) ||
            g.generation < 1 ||
            Number(g.usedGeneration || 0) >= g.generation
          )
            return {
              ok: false as const,
              error: "اكتملت المحاولات المتاحة لهذا الامتحان",
            };
          generation = g.generation;
        }
        const attemptId = generation
          ? `${uid}_${examId}_grant_${generation}`
          : `${uid}_${examId}_practice_${n + 1}`;
        const ref = doc(db, "exam_attempts", attemptId);
        const collision = await tx.get(ref);
        if (collision.exists()) throw new Error("attempt collision");
        const now = Date.now();
        if (generation)
          tx.update(grantRef, {
            usedGeneration: generation,
            consumedAt: new Date(now).toISOString(),
          });
        tx.set(ref, {
          studentId: uid,
          examId,
          courseId: data.courseId || "",
          status: "in_progress",
          createdAt: new Date(now).toISOString(),
          expiresAt: new Date(now + duration * 60000).toISOString(),
          draftAnswers: {},
          antiCheat: policy.antiCheat,
          scoringVersion: 2,
        });
        tx.set(counterRef, {
          studentId: uid,
          examId,
          count: n + 1,
          activeId: attemptId,
        });
        return {
          ok: true as const,
          attemptId,
          examId,
          durationMinutes: duration,
          fresh: true,
        };
      });
    }
    const completed = history.docs.some(
      (row) => row.data().status !== "in_progress",
    );
    const legacy = history.docs.find(
      (row) => row.data().status === "in_progress",
    );
    const result = await runTransaction(db, async (transaction) => {
      let generation = 0;
      const grantRef = doc(db, "exam_attempt_grants", `${uid}_${examId}`);
      let grant: Record<string, any> | undefined;
      if (completed && !legacy) {
        const permit = await transaction.get(grantRef);
        grant = permit.data();
        if (
          !permit.exists() ||
          grant?.studentId !== uid ||
          grant?.examId !== examId ||
          !Number.isSafeInteger(grant?.generation) ||
          grant!.generation < 1
        )
          return null;
        generation = grant!.generation;
      }
      const ref = doc(
        db,
        "exam_attempts",
        generation
          ? `${uid}_${examId}_grant_${generation}`
          : legacy?.id || `${uid}_${examId}_1`,
      );
      const existing = await transaction.get(ref);
      const duration = Math.max(1, Number(data.durationMinutes) || 20);
      if (existing.exists()) {
        const attempt = existing.data();
        if (
          attempt.studentId !== uid ||
          attempt.examId !== examId ||
          attempt.status !== "in_progress"
        )
          return null;
        if (generation && grant?.usedGeneration !== generation) return null;
        if (attempt.lockedAt)
          return {
            ok: true as const,
            attemptId: ref.id,
            examId,
            durationMinutes: 0,
            locked: true,
          };
        const deadline =
          Date.parse(attempt.expiresAt || "") ||
          Date.parse(attempt.createdAt) + duration * 60000;
        return {
          ok: true as const,
          attemptId: ref.id,
          examId,
          durationMinutes: Math.max(0, (deadline - Date.now()) / 60000),
        };
      }
      if (generation && Number(grant?.usedGeneration || 0) >= generation)
        return null;
      const now = Date.now();
      if (generation)
        transaction.update(grantRef, {
          usedGeneration: generation,
          consumedAt: new Date(now).toISOString(),
        });
      transaction.set(ref, {
        examId,
        studentId: uid,
        status: "in_progress",
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + duration * 60000).toISOString(),
        maxAttempts: 1,
        antiCheat: policy.antiCheat,
        scoringVersion: 2,
        draftAnswers: {},
        ...(generation
          ? { grantGeneration: generation, grantedBy: grant?.grantedBy || "" }
          : {}),
      });
      return {
        ok: true as const,
        attemptId: ref.id,
        examId,
        durationMinutes: duration,
        fresh: true,
      };
    });
    if (result) return result;
    return {
      ok: false,
      error: "لا توجد محاولة متاحة حالياً؛ راجع المسؤول لمنح محاولة إضافية",
    };
  } catch {
    return {
      ok: false,
      error: "تعذر بدء الامتحان. تحقق من تسجيل الدخول والاتصال وصلاحيات الوصول",
    };
  }
}

type ViolationReason =
  | "tab_hidden"
  | "window_blur"
  | "capture_shortcut"
  | "timeout"
  | "manual";
type DraftInput = {
  attemptId: string;
  examId: string;
  answers: Array<{ questionId: string; answerText: string }>;
  idToken?: string;
  reason?: ViolationReason;
  revision?: number;
};

// Freeze the first submission snapshot BEFORE grading. A failed grading request
// can be retried, but neither a violation nor a late request can change answers.
async function checkpoint(
  db: ReturnType<typeof getFirestore>,
  uid: string,
  input: DraftInput,
) {
  if (!Array.isArray(input.answers) || input.answers.length > 450)
    throw new Error("invalid answers");
  const clean: Record<string, string> = {};
  input.answers.forEach((a) => {
    if (
      typeof a.questionId !== "string" ||
      typeof a.answerText !== "string" ||
      a.answerText.length > 20000
    )
      throw new Error("invalid answer");
    clean[a.questionId] = a.answerText;
  });
  return runTransaction(db, async (transaction) => {
    const ref = doc(db, "exam_attempts", input.attemptId);
    const [attempt, exam] = await Promise.all([
      transaction.get(ref),
      transaction.get(doc(db, "exams", input.examId)),
    ]);
    if (
      !attempt.exists() ||
      !exam.exists() ||
      attempt.data().studentId !== uid ||
      attempt.data().examId !== input.examId
    )
      throw new Error("invalid attempt");
    const data = attempt.data();
    if (data.lockedAt || data.status !== "in_progress")
      return {
        answers: data.lockedAnswers || data.draftAnswers || {},
        locked: true,
      };
    const now = Date.now();
    const deadline =
      Date.parse(data.expiresAt || "") ||
      Date.parse(data.createdAt) +
        (Number(exam.data().durationMinutes) || 20) * 60000;
    if (!Number.isFinite(deadline)) throw new Error("invalid deadline");
    const expired = now >= deadline;
    const violation = [
      "tab_hidden",
      "window_blur",
      "capture_shortcut",
    ].includes(input.reason || "");
    const allowedReason =
      violation && !(data.antiCheat ?? examPolicy(exam.data()).antiCheat)
        ? undefined
        : input.reason;
    if (allowedReason || expired) {
      const answers = expired ? data.draftAnswers || {} : clean;
      const reasons = [
        "tab_hidden",
        "window_blur",
        "capture_shortcut",
        "timeout",
        "manual",
      ];
      const reason = expired
        ? "timeout"
        : reasons.includes(allowedReason || "")
          ? allowedReason!
          : "manual";
      transaction.update(ref, {
        lockedAt: new Date(now).toISOString(),
        lockedAnswers: answers,
        submissionReason: reason,
        draftAnswers: answers,
      });
      return { answers, locked: true };
    }
    if (
      input.revision !== undefined &&
      (!Number.isFinite(input.revision) ||
        input.revision <= (data.draftRevision || 0))
    )
      return { answers: data.draftAnswers || {}, locked: false };
    transaction.update(ref, {
      draftAnswers: clean,
      draftRevision: input.revision || now,
      lastSavedAt: new Date(now).toISOString(),
    });
    return { answers: clean, locked: false };
  });
}

export async function saveExamDraft(
  input: DraftInput,
): Promise<{ ok: boolean; locked?: boolean }> {
  try {
    const { db, uid } = await studentDatabase(input.idToken);
    const result = await checkpoint(db, uid, input);
    return { ok: true, locked: result.locked };
  } catch {
    return { ok: false };
  }
}

type SubmitResult =
  | {
      ok: true;
      attemptId: string;
      score: number;
      percentage: number;
      correct: number;
      wrong: number;
      unanswered: number;
      branchScores: Record<string, { correct: number; total: number }>;
    }
  | { ok: false; error: string };
export async function submitExam(input: DraftInput): Promise<SubmitResult> {
  try {
    const { db, uid } = await studentDatabase(input.idToken);
    const frozen = await checkpoint(db, uid, {
      ...input,
      reason: input.reason || "manual",
    });
    const [exam, questionSnap] = await Promise.all([
      getDoc(doc(db, "exams", input.examId)),
      getDocs(
        query(collection(db, "questions"), where("examId", "==", input.examId)),
      ),
    ]);
    if (!exam.exists() || questionSnap.empty)
      return { ok: false, error: "لا يمكن تصحيح امتحان بدون أسئلة" };
    const answers = new Map<string, string>(
      Object.entries(frozen.answers as Record<string, string>).map(
        ([key, value]) => [key, value.trim()],
      ),
    );
    const attemptBefore = await getDoc(
      doc(db, "exam_attempts", input.attemptId),
    );
    const modern = attemptBefore.data()?.scoringVersion === 2;
    let score = 0,
      correct = 0,
      wrong = 0,
      unanswered = 0,
      totalMarks = 0;
    const branchScores: Record<string, { correct: number; total: number }> = {};
    const rows = questionSnap.docs.map((question) => {
      const q = question.data();
      const text = answers.get(question.id) || "";
      const choice = q.questionType === "mcq";
      const isCorrect = choice && !!text && text === q.correctAnswer;
      const maxMarks = modern ? questionMarks(q.questionType) : Number(q.marks);
      const marks = isCorrect ? maxMarks : 0;
      totalMarks += maxMarks;
      score += marks;
      if (!text) unanswered++;
      else if (isCorrect) correct++;
      else if (choice) wrong++;
      const branch = q.branch || "عام";
      branchScores[branch] ||= { correct: 0, total: 0 };
      branchScores[branch].total++;
      if (isCorrect) branchScores[branch].correct++;
      return {
        id: `${input.attemptId}_${question.id}`,
        data: {
          attempt_id: input.attemptId,
          studentId: uid,
          question_id: question.id,
          answer_text: text || null,
          is_correct: choice ? isCorrect : null,
          maxMarks,
          explanation: q.explanation || "",
          marks_obtained: marks,
          status: choice ? "auto_graded" : "pending",
          created_at: new Date().toISOString(),
        },
      };
    });
    const percentage = totalMarks ? Math.round((score / totalMarks) * 100) : 0;
    const hasEssay = questionSnap.docs.some(
      (q) => q.data().questionType === "essay",
    );
    const attemptRef = doc(db, "exam_attempts", input.attemptId);
    await runTransaction(db, async (transaction) => {
      const attempt = await transaction.get(attemptRef);
      if (
        !attempt.exists() ||
        attempt.data().studentId !== uid ||
        attempt.data().examId !== input.examId
      )
        throw new Error("invalid attempt");
      if (attempt.data().status !== "in_progress") return; // Idempotent submission.
      rows.forEach((row) =>
        transaction.set(doc(db, "student_answers", row.id), row.data),
      );
      transaction.update(attemptRef, {
        score,
        totalMarks,
        percentage,
        correct_count: correct,
        wrong_count: wrong,
        unanswered_count: unanswered,
        status: hasEssay
          ? "pending"
          : score >=
              (modern
                ? totalMarks *
                  (Number(exam.data().passingMarks) /
                    Number(exam.data().totalMarks) || 0.5)
                : Number(exam.data().passingMarks))
            ? "passed"
            : "failed",
        submittedAt: new Date().toISOString(),
      });
    });
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
  } catch {
    return {
      ok: false,
      error:
        "لم يتم حفظ الإجابات. تحقق من الاتصال ثم أعد التسليم؛ إجاباتك ما زالت محفوظة على جهازك",
    };
  }
}
