"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Code,
  Terminal,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  Lock,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { startExam, submitExam, saveExamDraft } from "@/app/actions/exams";
import { useExam, useExamQuestions } from "@/lib/queries/useExams";
import { useCurrentStudent } from "@/lib/firebase/use-student-auth";
import { auth } from "@/lib/firebase/config";

export default function ExamRunnerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const examId = params.id;

  const { data: exam, isLoading: loadingExam } = useExam(examId);
  const { data: questions = [], isLoading: loadingQuestions } =
    useExamQuestions(examId);
  const { student } = useCurrentStudent();

  const [ready, setReady] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [locked, setLocked] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const reasonRef = useRef<
    "manual" | "tab_hidden" | "window_blur" | "capture_shortcut" | "timeout"
  >("manual");
  const frozenAnswersRef = useRef<Record<string, string> | null>(null);
  const startRequested = useRef(false);
  const restorePendingRef = useRef(false);
  const [exhausted, setExhausted] = useState(false);
  const submittedRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const attemptIdRef = useRef(attemptId);
  attemptIdRef.current = attemptId;
  const examIdRef = useRef(examId);
  examIdRef.current = examId;

  // Restore saved answers from sessionStorage if student refreshed
  useEffect(() => {
    if (!examId) return;
    try {
      const saved = sessionStorage.getItem(
        `exam_answers_${student.id}_${examId}`,
      );
      if (saved) {
        setAnswers(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, [examId, student.id]);

  // Save answers to sessionStorage whenever they change
  function handleAnswerChange(questionId: string, value: string) {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: value };
      if (examId) {
        try {
          sessionStorage.setItem(
            `exam_answers_${student.id}_${examId}`,
            JSON.stringify(next),
          );
        } catch {
          // ignore
        }
      }
      return next;
    });
  }

  // Start or resume attempt on mount
  useEffect(() => {
    if (
      attemptId ||
      !examId ||
      !ready ||
      !exam ||
      !questions.length ||
      startRequested.current
    )
      return;
    startRequested.current = true;
    try {
      const pending = JSON.parse(
        sessionStorage.getItem(`exam_pending_${student.id}_${examId}`) ||
          "null",
      );
      if (pending?.attemptId && pending?.answers) {
        restorePendingRef.current = true;
        reasonRef.current = pending.reason || "manual";
        frozenAnswersRef.current = pending.answers;
        setAnswers(pending.answers);
        setAttemptId(pending.attemptId);
        setLocked(true);
        setSecondsLeft(0);
        return;
      }
    } catch {
      /* The server still enforces the one-attempt limit. */
    }
    auth
      .authStateReady()
      .then(async () => startExam(examId, await auth.currentUser?.getIdToken()))
      .then((res) => {
        if (!res.ok) {
          if (res.error?.includes("محاول") || res.error?.includes("attempt")) {
            setExhausted(true);
          } else {
            toast.error(res.error);
            router.push("/courses");
          }
          return;
        }
        if (res.locked) {
          setLocked(true);
          restorePendingRef.current = true;
        }
        if (res.fresh) {
          setAnswers({});
          try {
            sessionStorage.removeItem(`exam_answers_${student.id}_${examId}`);
          } catch {}
        }
        setAttemptId(res.attemptId);
        setSecondsLeft(Math.ceil(res.durationMinutes * 60));
      })
      .catch(() => {
        startRequested.current = false;
        setReady(false);
        toast.error("تعذر بدء الامتحان. تحقق من الاتصال وحاول مرة أخرى");
      });
  }, [examId, attemptId, router, ready, exam, questions.length, student.id]);

  // Submit Handler
  const executeSubmission = useCallback(
    async (
      reason:
        | "manual"
        | "tab_hidden"
        | "window_blur"
        | "capture_shortcut"
        | "timeout" = "manual",
    ) => {
      const curAttemptId = attemptIdRef.current;
      const curExamId = examIdRef.current;
      if (submitting || !curAttemptId || !curExamId || submittedRef.current)
        return;
      submittedRef.current = true;
      reasonRef.current = frozenAnswersRef.current ? reasonRef.current : reason;
      frozenAnswersRef.current ||= { ...answersRef.current };
      setLocked(true);
      setSubmitting(true);
      try {
        sessionStorage.setItem(
          `exam_pending_${student.id}_${curExamId}`,
          JSON.stringify({
            attemptId: curAttemptId,
            reason: reasonRef.current,
            answers: frozenAnswersRef.current,
          }),
        );
      } catch {}

      const formattedAnswers = Object.entries(frozenAnswersRef.current).map(
        ([questionId, answerText]) => ({
          questionId,
          answerText,
        }),
      );

      try {
        const res = await submitExam({
          attemptId: curAttemptId,
          examId: curExamId,
          answers: formattedAnswers,
          reason: reasonRef.current,
          idToken: await auth.currentUser?.getIdToken(),
        });

        if (!res.ok) {
          toast.error(res.error);
          setSubmitting(false);
          submittedRef.current = false;
          return;
        }

        try {
          sessionStorage.removeItem(`exam_pending_${student.id}_${curExamId}`);
          sessionStorage.removeItem(`exam_answers_${student.id}_${curExamId}`);
        } catch {
          // ignore
        }

        toast.success("تم حفظ وتسليم إجاباتك بنجاح 🎉");
        router.push(`/exam/${curExamId}/result?attempt=${res.attemptId}`);
      } catch {
        toast.error(
          "تعذر الاتصال. المحاولة مقفولة وإجاباتك محفوظة؛ اضغط إعادة التسليم عند عودة الاتصال",
        );
        setSubmitting(false);
        submittedRef.current = false;
      }
    },
    [router, submitting, student.id],
  );

  // Save drafts during the attempt; server time, not the browser timer, sets the deadline.
  useEffect(() => {
    if (!attemptId || locked) return;
    const timer = setTimeout(async () => {
      try {
        const result = await saveExamDraft({
          attemptId,
          examId,
          revision: Date.now(),
          answers: Object.entries(answers).map(([questionId, answerText]) => ({
            questionId,
            answerText,
          })),
          idToken: await auth.currentUser?.getIdToken(),
        });
        setSaveStatus(
          result.ok
            ? "تم حفظ إجاباتك"
            : "تعذر الحفظ على الخادم — تحقق من الاتصال",
        );
        if (result.locked) void executeSubmission("timeout");
      } catch {
        setSaveStatus("انقطع الاتصال — إجاباتك محفوظة على الجهاز");
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [attemptId, examId, answers, locked, executeSubmission]);

  // Best-effort browser deterrents, never a guarantee against OS/camera capture.
  useEffect(() => {
    if (!attemptId || locked || !exam?.antiCheat) return;
    const violation = (
      reason: "tab_hidden" | "window_blur" | "capture_shortcut",
    ) => {
      void executeSubmission(reason);
    };
    const visibility = () => {
      if (document.hidden) violation("tab_hidden");
    };
    const blur = () => violation("window_blur");
    const key = (event: KeyboardEvent) => {
      if (
        event.key === "PrintScreen" ||
        ((event.metaKey || event.ctrlKey) &&
          event.shiftKey &&
          event.key.toLowerCase() === "s")
      ) {
        event.preventDefault();
        violation("capture_shortcut");
      }
      if (
        (event.metaKey || event.ctrlKey) &&
        ["p", "s", "c"].includes(event.key.toLowerCase())
      )
        event.preventDefault();
    };
    const block = (event: Event) => event.preventDefault();
    const unload = () => violation("tab_hidden");
    if (document.hidden) violation("tab_hidden");
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", blur);
    window.addEventListener("pagehide", unload);
    window.addEventListener("keydown", key);
    window.addEventListener("keyup", key);
    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", blur);
      window.removeEventListener("pagehide", unload);
      window.removeEventListener("keydown", key);
      window.removeEventListener("keyup", key);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
    };
  }, [attemptId, locked, executeSubmission, exam?.antiCheat]);

  useEffect(() => {
    if (attemptId && restorePendingRef.current) {
      restorePendingRef.current = false;
      void executeSubmission(reasonRef.current);
    }
  }, [attemptId, executeSubmission]);

  // Timer
  useEffect(() => {
    if (secondsLeft === null || locked) return;
    if (secondsLeft <= 0) {
      void executeSubmission(
        reasonRef.current === "manual" ? "timeout" : reasonRef.current,
      );
      return;
    }
    const t = setTimeout(
      () => setSecondsLeft((s) => (s === null ? s : s - 1)),
      1000,
    );
    return () => clearTimeout(t);
  }, [secondsLeft, executeSubmission, locked]);

  const q = questions[current];
  const answered = useMemo(
    () => Object.values(answers).filter((a) => a && a.trim()).length,
    [answers],
  );

  async function onSubmit() {
    if (answered < questions.length) {
      setConfirmSubmit(true);
      return;
    }
    await executeSubmission();
  }

  if (exhausted) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center" dir="rtl">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E172A] p-8 shadow-sm space-y-5">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div>
            <h2 className="font-display text-xl font-black text-ink dark:text-white">
              انتهت المحاولة المتاحة
            </h2>
            <p className="mt-2 text-sm text-muted dark:text-slate-400 leading-relaxed">
              لا توجد محاولة متاحة حالياً. يمكنك مراجعة المسؤول لمنحك محاولة
              إضافية لهذا الدرس.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <Button
              asChild
              className="w-full theme-inverse bg-blue-600 hover:bg-blue-700 rounded-xl py-2.5 font-bold shadow-md shadow-blue-600/30 text-ink"
            >
              <Link href={`/exam/${examId}/result`}>
                عرض نتيجتي في الامتحان
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="w-full rounded-xl py-2.5 font-bold dark:border-slate-800 dark:bg-slate-900"
            >
              <Link href="/courses">الرجوع للكورسات</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!loadingExam && !loadingQuestions && (!exam || !questions.length))
    return (
      <div className="p-10 text-center space-y-4">
        <h1 className="font-black text-xl">
          الامتحان غير متاح أو لم تكتمل أسئلته بعد
        </h1>
        <Link className="text-blue-500 underline" href="/courses">
          العودة للكورسات
        </Link>
      </div>
    );
  if (exam && questions.length && !ready)
    return (
      <div
        dir="rtl"
        className="max-w-xl mx-auto rounded-3xl border border-blue-500/30 p-8 space-y-5"
      >
        <h1 className="text-2xl font-black">{exam.title}</h1>
        <p className="text-muted">
          {questions.length} سؤال · {exam.duration_minutes} دقيقة · إجمالي
          الدرجات:{" "}
          {questions.reduce(
            (n, q) => n + (q.question_type === "essay" ? 2 : 1),
            0,
          )}
        </p>
        <p className="text-sm leading-7">
          {exam.antiCheat
            ? "قيود تقليل الغش مفعلة: مغادرة النافذة تسلّم المحاولة، والنسخ محظور. لا يمكن ضمان منع تصوير الشاشة."
            : "يمكنك التنقل بين النوافذ والنسخ بشكل عادي بدون إنهاء الامتحان."}{" "}
          يبدأ الوقت عند الضغط على ابدأ، والتسليم يتم باختيارك أو عند انتهاء
          الوقت. المحاولات:{" "}
          {exam.max_attempts === 0 ? "غير محدودة" : exam.max_attempts}.
        </p>
        <Button onClick={() => setReady(true)}>ابدأ الامتحان</Button>
        <Link className="block text-blue-500 underline text-sm" href="/courses">
          الرجوع للكورسات
        </Link>
      </div>
    );
  if (locked)
    return (
      <div
        dir="rtl"
        role="status"
        className="mx-auto max-w-xl rounded-3xl border border-amber-500/30 p-8 text-center space-y-5"
      >
        <ShieldAlert className="mx-auto h-12 w-12 text-amber-500" />
        <h1 className="font-black text-xl">
          {reasonRef.current === "manual"
            ? "جاري تسليم إجاباتك"
            : "تم قفل المحاولة"}
        </h1>
        <p className="text-sm leading-7 text-muted">
          {reasonRef.current === "manual"
            ? "تم تثبيت الإجابات ولا يمكن تعديلها بعد التسليم."
            : "انتهى وقت الامتحان أو سبق تثبيت هذه المحاولة. لن تُفتح محاولة جديدة تلقائياً؛ الإعادة بإذن المسؤول فقط."}
        </p>
        {submitting ? (
          <p className="flex justify-center items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            جاري الحفظ والتصحيح…
          </p>
        ) : (
          <>
            <p className="text-sm text-amber-600">
              لو الاتصال انقطع، إعادة التسليم ترسل نفس الإجابات ولا تعيد فتح
              الامتحان.
            </p>
            <Button onClick={() => void executeSubmission(reasonRef.current)}>
              إعادة التسليم
            </Button>
          </>
        )}
      </div>
    );
  if (!exam || questions.length === 0 || !q || secondsLeft === null) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const minutes = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");

  return (
    <div className="relative" dir="rtl">
      {exam?.antiCheat && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-40 grid select-none grid-cols-2 grid-rows-3 overflow-hidden"
        >
          {Array.from({ length: 6 }, (_, i) => (
            <span
              key={i}
              className="flex -rotate-12 items-center justify-center text-xs text-slate-500/15 dark:text-slate-300/10"
            >
              {student.fullName} · {student.phone}
            </span>
          ))}
        </div>
      )}
      {confirmSubmit && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/70 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-submit-title"
            className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl dark:bg-slate-900"
          >
            <h2 id="confirm-submit-title" className="text-xl font-black">
              لسه فيه أسئلة ناقصة
            </h2>
            <p className="mt-3 text-sm text-muted">
              باقي {questions.length - answered} سؤال بدون إجابة. التسليم ينهي
              المحاولة الحالية.
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                onClick={() => {
                  setConfirmSubmit(false);
                  void executeSubmission();
                }}
              >
                سلّم الإجابات
              </Button>
              <Button
                variant="outline"
                autoFocus
                onClick={() => setConfirmSubmit(false)}
              >
                أكمل الحل
              </Button>
            </div>
          </div>
        </div>
      )}

      <p className="mx-auto mb-3 max-w-4xl rounded-2xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-sm">
        {exam?.antiCheat
          ? "قيود تقليل الغش مفعلة — مغادرة التبويب تؤدي للتسليم التلقائي."
          : "يمكنك مغادرة التبويب والعودة بدون تسليم تلقائي. يستمر الوقت أثناء غيابك."}
      </p>

      <div className="mx-auto max-w-4xl space-y-4">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0E172A] p-5 shadow-sm">
          <div>
            <h1 className="font-display text-xl font-black text-ink dark:text-white">
              {exam.title}
            </h1>
            <p className="text-xs text-muted dark:text-slate-400 mt-0.5">
              سؤال {current + 1} من {questions.length}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="font-mono rounded-xl border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs px-3 py-1 font-bold"
            >
              {answered}/{questions.length} مُجابة
            </Badge>
            <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 px-3 py-1.5 font-mono text-red-600 dark:text-red-400 text-sm font-bold">
              <Clock className="h-4 w-4" />
              {minutes}:{seconds}
            </div>
          </div>
        </header>

        <p className="text-xs text-muted" aria-live="polite">
          {saveStatus || "يجري حفظ إجاباتك أثناء الحل"}
        </p>
        <Progress
          value={((current + 1) / questions.length) * 100}
          className="h-2 bg-blue-100 dark:bg-slate-800"
        />

        {/* Question Card */}
        <Card className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0E172A] shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/40 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-lg bg-blue-100 dark:bg-blue-950 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                {q.question_type === "mcq" ||
                (q.question_type as string) === "multiple_choice"
                  ? "اختيار من متعدد"
                  : "سؤال مقالي"}
              </span>
              <span className="text-xs text-muted font-medium">
                الدرجة: {q.question_type === "essay" ? 2 : 1}
              </span>
            </div>
            <CardTitle className="leading-relaxed text-base font-bold text-ink dark:text-white">
              {q.question_text}
            </CardTitle>
            {((q as any).image_url || (q as any).imageUrl) && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 theme-inverse bg-black/40 max-h-80 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={(q as any).image_url || (q as any).imageUrl}
                  alt="صورة السؤال"
                  className="max-h-80 w-auto object-contain"
                />
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            {q.question_type === "mcq" ||
            (q.question_type as string) === "multiple_choice" ? (
              <div className="space-y-3">
                {(q.options ?? []).map((opt) => {
                  const selected = answers[q.id] === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleAnswerChange(q.id, opt.key)}
                      className={`flex w-full items-center gap-3.5 rounded-2xl border p-4 text-right transition-all ${
                        selected
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-950/80 shadow-md shadow-blue-500/10"
                          : "border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
                      }`}
                    >
                      <span
                        className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-black transition-colors ${
                          selected
                            ? "theme-inverse bg-blue-600 text-ink"
                            : "bg-slate-100 dark:bg-slate-800 text-ink dark:text-slate-300"
                        }`}
                      >
                        {opt.key.toUpperCase()}
                      </span>
                      <span className="font-semibold text-ink dark:text-slate-200 text-sm">
                        {opt.text}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <label
                  htmlFor={`essay-${q.id}`}
                  className="block text-sm font-bold text-ink dark:text-slate-200"
                >
                  إجابتك المقالية
                </label>
                <Textarea
                  id={`essay-${q.id}`}
                  value={answers[q.id] ?? ""}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  placeholder="اكتب إجابتك هنا بأسلوبك، مع توضيح الأفكار والأمثلة…"
                  dir="auto"
                  className="min-h-[240px] text-base leading-8 text-right font-sans bg-white dark:bg-slate-900 text-ink dark:text-white"
                />
                <p className="text-xs text-muted">
                  سؤال مقالي عادي؛ لا يتطلب كتابة كود. تُراجع الإجابة بواسطة
                  المعلم.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="rounded-2xl px-5 font-bold dark:border-slate-800"
          >
            <ChevronRight className="h-4 w-4 ms-1" />
            السابق
          </Button>
          {current < questions.length - 1 ? (
            <Button
              onClick={() =>
                setCurrent((c) => Math.min(questions.length - 1, c + 1))
              }
              className="rounded-2xl theme-inverse bg-blue-600 hover:bg-blue-700 text-ink px-5 font-bold shadow-md shadow-blue-600/30"
            >
              التالي
              <ChevronLeft className="h-4 w-4 me-1" />
            </Button>
          ) : (
            <Button
              onClick={onSubmit}
              disabled={submitting}
              className="rounded-2xl theme-inverse bg-emerald-600 hover:bg-emerald-700 px-6 font-bold text-ink shadow-lg shadow-emerald-600/30"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ms-2" /> جاري
                  التسليم...
                </>
              ) : (
                "تسليم الامتحان"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
