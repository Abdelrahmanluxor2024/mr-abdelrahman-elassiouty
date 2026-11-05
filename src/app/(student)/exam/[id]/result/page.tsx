"use client";
import Link from "next/link";
import { useSearchParams, useParams } from "next/navigation";
import {
  useLatestAttemptForExam,
  useAttemptAnswers,
  useExamQuestions,
  useExam,
} from "@/lib/queries/useExams";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, CheckCircle2, BookOpen, RefreshCw } from "lucide-react";
import {
  reviewSummary,
  isChoiceQuestion,
  optionLabel,
} from "@/lib/exam-review";
export default function ExamResultPage() {
  const { id: examId } = useParams<{ id: string }>();
  const search = useSearchParams();
  const examQuery = useExam(examId),
    attemptQuery = useLatestAttemptForExam(
      examId,
      search.get("attempt") || undefined,
    );
  const { data: exam } = examQuery,
    { data: attempt } = attemptQuery;
  const questionsQuery = useExamQuestions(examId),
    answersQuery = useAttemptAnswers(
      attempt?.id || "",
      attempt?.status === "pending",
    );
  const answers = answersQuery.data || [];
  const questions = (questionsQuery.data || []).map((q) => {
    const answer = answers.find((a) => a.question_id === q.id);
    return {
      ...q,
      marks: answer?.max_marks ?? q.marks,
      explanation: answer?.explanation || q.explanation,
    };
  });
  if (
    examQuery.isLoading ||
    attemptQuery.isLoading ||
    questionsQuery.isLoading ||
    (attempt && answersQuery.isLoading)
  )
    return <Skeleton className="mx-auto h-96 max-w-4xl rounded-3xl" />;
  const refresh = () => {
    examQuery.refetch();
    attemptQuery.refetch();
    questionsQuery.refetch();
    answersQuery.refetch();
  };
  if (
    examQuery.isError ||
    attemptQuery.isError ||
    answersQuery.isError ||
    questionsQuery.isError
  )
    return (
      <div className="p-10 text-center space-y-4" role="alert">
        <p>تعذر تحميل بيانات المراجعة. لم نعرض إجابات مفقودة كأنها خاطئة.</p>
        <Button onClick={refresh}>إعادة المحاولة</Button>
      </div>
    );
  if (!exam || !attempt)
    return (
      <div className="p-10 text-center space-y-4">
        <h1 className="text-xl font-black">
          {!exam ? "الامتحان غير موجود" : "لم تُسجّل محاولة لهذا الامتحان بعد"}
        </h1>
        <Link
          className="text-blue-600 dark:text-cyan-300 underline"
          href={!exam ? "/courses" : `/exam/${examId}`}
        >
          {!exam ? "العودة للكورسات" : "فتح الامتحان"}
        </Link>
      </div>
    );
  if (attempt.status === "in_progress")
    return (
      <div className="p-10 text-center space-y-4">
        <h1 className="text-xl font-black">لم يتم تسليم الامتحان بعد</h1>
        <Link
          href={`/exam/${examId}`}
          className="text-blue-600 dark:text-cyan-300 underline"
        >
          العودة للمحاولة الحالية
        </Link>
      </div>
    );
  const pending = attempt.status === "pending";
  const summary = reviewSummary(questions, answers),
    byQuestion = new Map(answers.map((a) => [a.question_id, a]));
  return (
    <div dir="rtl" className="mx-auto max-w-4xl space-y-6">
      {attempt.submission_reason &&
        ["tab_hidden", "window_blur", "capture_shortcut", "timeout"].includes(
          attempt.submission_reason,
        ) && (
          <div className="rounded-2xl border border-amber-400 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            {attempt.submission_reason === "timeout"
              ? "تم إنهاء المحاولة لانتهاء الوقت."
              : attempt.submission_reason === "capture_shortcut"
                ? "تم إنهاء المحاولة بعد رصد اختصار تصوير شاشة."
                : "تم إنهاء المحاولة بعد مغادرة تبويب أو نافذة الامتحان."}{" "}
            تُحتسب هذه المحاولة من المحاولات المتاحة لحسابك.
          </div>
        )}
      <section
        className={`rounded-3xl p-7 text-ink shadow-lg ${pending ? "theme-inverse bg-gradient-to-br from-slate-700 to-blue-800" : attempt.status === "passed" ? "theme-inverse bg-gradient-to-br from-emerald-700 to-teal-800" : "theme-inverse bg-gradient-to-br from-rose-700 to-red-800"}`}
      >
        <p className="flex items-center gap-2 text-sm font-bold">
          {pending ? (
            <Clock className="h-5 w-5" />
          ) : (
            <CheckCircle2 className="h-5 w-5" />
          )}
          {pending
            ? "تم التصحيح الآلي — في انتظار مراجعة المقالي"
            : attempt.status === "passed"
              ? "مبروك، اجتزت الامتحان"
              : "النتيجة النهائية — راجع إجاباتك بالأسفل"}
        </p>
        <h1 className="mt-4 text-2xl font-black">{exam.title}</h1>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/10 p-4">
            <p className="text-xs">
              {pending ? "درجة الاختيار من متعدد فقط" : "الدرجة النهائية"}
            </p>
            <strong className="mt-2 block text-2xl">
              {pending
                ? `${summary.mcqScore} / ${summary.mcqTotal}`
                : `${attempt.score} / ${attempt.total_marks ?? exam.total_marks}`}
            </strong>
          </div>
          <div className="rounded-2xl bg-white/10 p-4">
            <p className="text-xs">
              {pending ? "المقالي قيد المراجعة" : "النسبة النهائية"}
            </p>
            <strong className="mt-2 block text-2xl">
              {pending
                ? `${summary.pendingEssays} سؤال`
                : `${Math.round(attempt.percentage)}%`}
            </strong>
          </div>
          <div className="rounded-2xl bg-white/10 p-4">
            <p className="text-xs">حالة النتيجة</p>
            <strong className="mt-2 block text-lg">
              {pending ? "مؤقتة — ليست نجاحاً أو رسوباً" : "مكتملة"}
            </strong>
          </div>
        </div>
      </section>
      {pending && (
        <Card className="border-amber-300 dark:border-amber-700">
          <CardContent className="p-5 text-sm leading-8">
            <strong>تصحيح الاختيارات متاح الآن.</strong> إجاباتك الصحيحة
            والخاطئة والإجابات النموذجية ظاهرة بالأسفل. المقالي لم يُحتسب كخطأ؛
            المعلم سيضيف درجته وملاحظاته، ثم تظهر النتيجة النهائية.{" "}
            {summary.mcqTotal === 0 &&
              "هذا الامتحان مقالي بالكامل؛ لا توجد درجات آلية بعد."}
            <Button variant="outline" className="mt-3 flex" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
              تحديث التصحيح
            </Button>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>مراجعة الأسئلة والإجابات</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-200 dark:divide-slate-700">
          {!questions.length && (
            <p className="py-8 text-muted">
              لا توجد تفاصيل أسئلة متاحة لهذه المحاولة.
            </p>
          )}
          {questions.map((q, i) => {
            const a = byQuestion.get(q.id),
              choice = isChoiceQuestion(q),
              awaiting = !choice && (!a || a.status === "pending");
            return (
              <article key={q.id} className="space-y-4 py-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-bold text-blue-600 dark:text-cyan-300">
                    سؤال {i + 1} · {choice ? "اختيار من متعدد" : "مقالي"}
                  </span>
                  <span
                    className={`rounded-lg px-3 py-1 text-xs font-bold ${awaiting ? "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200" : "bg-slate-100 text-ink dark:bg-slate-800 dark:text-slate-200"}`}
                  >
                    {awaiting
                      ? "في انتظار تصحيح المعلم"
                      : a
                        ? `${choice ? (a.is_correct ? "إجابة صحيحة" : a.answer_text ? "إجابة خاطئة" : "بدون إجابة") : "تمت المراجعة"} · ${a.marks_obtained} / ${q.marks}`
                        : "تفاصيل التصحيح غير متاحة"}
                  </span>
                </div>
                <h2 className="font-bold leading-8 whitespace-pre-wrap">
                  {q.question_text}
                </h2>
                <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-8 dark:bg-slate-800">
                  <p className="font-bold text-muted">إجابتك</p>
                  <p className="whitespace-pre-wrap">
                    {choice
                      ? optionLabel(q, a?.answer_text)
                      : a?.answer_text || "لم تجب على هذا السؤال"}
                  </p>
                  {choice && (
                    <p className="mt-3 text-emerald-800 dark:text-emerald-300">
                      <strong>الإجابة الصحيحة: </strong>
                      {q.correct_answer
                        ? optionLabel(q, q.correct_answer)
                        : "الإجابة النموذجية غير متاحة"}
                    </p>
                  )}
                  {!choice && !awaiting && a && (
                    <p className="mt-3 font-bold">
                      الدرجة المعتمدة: {a.marks_obtained} / {q.marks}
                    </p>
                  )}
                  {a?.grader_feedback && (
                    <p className="mt-3 whitespace-pre-wrap">
                      <strong>ملاحظات المعلم: </strong>
                      {a.grader_feedback}
                    </p>
                  )}
                </div>
                {q.explanation && (choice || !awaiting) && (
                  <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-8 text-blue-900 dark:border-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                    <strong>الشرح: </strong>
                    {q.explanation}
                  </p>
                )}
              </article>
            );
          })}
        </CardContent>
      </Card>
      <Link
        className="inline-flex items-center gap-2 font-bold text-blue-600 dark:text-cyan-300"
        href="/courses"
      >
        <BookOpen className="h-5 w-5" />
        العودة للكورسات
      </Link>
    </div>
  );
}
