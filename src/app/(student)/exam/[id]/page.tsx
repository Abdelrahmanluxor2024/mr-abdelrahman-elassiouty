'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Clock, ChevronLeft, ChevronRight, Loader2, AlertTriangle, Code, Terminal, Sparkles, CheckCircle2, ShieldAlert, Lock, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { startExam, submitExam } from '@/app/actions/exams';
import { useExam, useExamQuestions } from '@/lib/queries/useExams';
import { useStudent } from '@/lib/queries/useStudent';

export default function ExamRunnerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const examId = params.id;

  const { data: exam } = useExam(examId);
  const { data: questions = [] } = useExamQuestions(examId);
  const { data: student } = useStudent();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [isScreenBlurred, setIsScreenBlurred] = useState(false);
  const [isCheatingDetected, setIsCheatingDetected] = useState(false);
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
      const saved = sessionStorage.getItem(`exam_answers_${examId}`);
      if (saved) {
        setAnswers(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, [examId]);

  // Save answers to sessionStorage whenever they change
  function handleAnswerChange(questionId: string, value: string) {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: value };
      if (examId) {
        try {
          sessionStorage.setItem(`exam_answers_${examId}`, JSON.stringify(next));
        } catch {
          // ignore
        }
      }
      return next;
    });
  }

  // Start or resume attempt on mount
  useEffect(() => {
    if (attemptId || !examId) return;
    startExam(examId).then((res) => {
      if (!res.ok) {
        if (res.error?.includes('محاولات') || res.error?.includes('attempt')) {
          setExhausted(true);
        } else {
          toast.error(res.error);
          router.push('/courses');
        }
        return;
      }
      setAttemptId(res.attemptId);
      setSecondsLeft((res.durationMinutes || 30) * 60);
    });
  }, [examId, attemptId, router]);

  // Submit Handler
  const executeSubmission = useCallback(async (isForcedByViolation = false) => {
    const curAttemptId = attemptIdRef.current;
    const curExamId = examIdRef.current;
    if (submitting || !curAttemptId || !curExamId || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);

    if (isForcedByViolation) {
      setIsCheatingDetected(true);
      toast.error('⚠️ تم رصد مغادرة نافذة الامتحان أو محاولة غش! تم تسليم الامتحان تلقائياً فوراً.');
    }

    const formattedAnswers = Object.entries(answersRef.current).map(([questionId, answerText]) => ({
      questionId,
      answerText,
    }));

    const res = await submitExam({
      attemptId: curAttemptId,
      examId: curExamId,
      answers: formattedAnswers,
    });

    try {
      sessionStorage.removeItem(`exam_answers_${curExamId}`);
    } catch {
      // ignore
    }

    if (!res.ok) {
      toast.error(res.error);
      setSubmitting(false);
      submittedRef.current = false;
      return;
    }

    if (!isForcedByViolation) {
      toast.success('تم تسليم الامتحان وحساب النتيجة بنجاح 🎉');
    }
    router.push(`/exam/${curExamId}/result?attempt=${res.attemptId}`);
  }, [router, submitting]);

  // Anti-Cheat: Tab switch, window blur, leaving page auto-submits immediately
  useEffect(() => {
    if (!attemptId) return;

    let violationTriggered = false;

    const handleViolation = () => {
      if (violationTriggered || submittedRef.current) return;
      violationTriggered = true;
      setIsScreenBlurred(true);
      void executeSubmission(true);
    };

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        handleViolation();
      }
    };

    const handleWindowBlur = () => {
      setIsScreenBlurred(true);
      handleViolation();
    };

    const handleWindowFocus = () => {
      setIsScreenBlurred(false);
    };

    // Block keyboard shortcuts (Screenshot, PrintScreen, Snipping tool, Copy, Devtools)
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen / Snip
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        setIsScreenBlurred(true);
        navigator.clipboard?.writeText?.('');
        toast.error('🚫 ممنوع التقاط سكرين شوت أثناء الامتحان!');
        handleViolation();
        return false;
      }

      // Ctrl+P (Print), Ctrl+S (Save), Ctrl+U (Source), Ctrl+C (Copy), Ctrl+Shift+I/J/C (Devtools), F12
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (
        (isCtrlOrCmd && ['p', 's', 'u', 'c', 'v', 'a'].includes(e.key.toLowerCase())) ||
        (isCtrlOrCmd && e.shiftKey && ['i', 'j', 'c', 's'].includes(e.key.toLowerCase())) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        e.stopPropagation();
        toast.error('🚫 تم حظر هذا الاختصار لحماية الامتحان.');
        return false;
      }
    };

    // Block Right click (context menu)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.error('🚫 النقر بزر الفأرة الأيمن معطل لحماية الامتحان.');
      return false;
    };

    // Block copy / selectstart
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.error('🚫 النسخ معطل أثناء الامتحان.');
      return false;
    };

    // Before unload warning
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!submittedRef.current) {
        handleViolation();
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('copy', handleCopy, true);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('copy', handleCopy, true);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [attemptId, executeSubmission]);

  // Timer
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      void executeSubmission(false);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s === null ? s : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, executeSubmission]);

  const q = questions[current];
  const answered = useMemo(
    () => Object.values(answers).filter((a) => a && a.trim()).length,
    [answers]
  );

  async function onSubmit() {
    await executeSubmission(false);
  }

  if (exhausted) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center" dir="rtl">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E172A] p-8 shadow-sm space-y-5">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div>
            <h2 className="font-display text-xl font-black text-slate-900 dark:text-white">
              استنفدت كل المحاولات المتاحة
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              لقد قمت بأداء هذا الامتحان بالحد الأقصى للمحاولات المسموح بها ({exam?.max_attempts ?? 1} محاولة).
            </p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl py-2.5 font-bold shadow-md shadow-blue-600/30 text-white">
              <Link href={`/exam/${examId}/result`}>
                عرض نتيجتي في الامتحان
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full rounded-xl py-2.5 font-bold dark:border-slate-800 dark:bg-slate-900">
              <Link href="/courses">
                الرجوع للكورسات
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!exam || questions.length === 0 || !q || secondsLeft === null) {
    return (
      <div className="grid place-items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');

  const watermark = student ? `${student.full_name} • ${student.phone}` : 'منصة مستر عبدالرحمن الأسيوطي';

  return (
    <div className="relative select-none" dir="rtl" style={{ WebkitUserSelect: 'none', userSelect: 'none' }}>
      {/* ── Background Security Dynamic Watermark (Anti-Screenshot) ──────────── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-50 overflow-hidden select-none"
      >
        <div className="grid h-full w-full grid-cols-2 sm:grid-cols-3 grid-rows-4 gap-8 p-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center justify-center">
              <span className="-rotate-12 text-xs sm:text-sm font-black text-slate-500/20 dark:text-slate-300/15 tracking-wider">
                {watermark}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Anti-Cheat Blur Overlay on Window Blur / Attempted Capture ──────────── */}
      {isScreenBlurred && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-2xl p-6 text-center text-white">
          <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-3xl bg-red-600/20 text-red-500 border border-red-500/30 animate-pulse">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <h2 className="font-display text-2xl font-black text-white">
            ⚠️ تم رصد مغادرة نافذة الامتحان / محاولة تصوير الشاشة
          </h2>
          <p className="mt-2 text-sm text-slate-300 max-w-md">
            نظام الحماية والأمان قام بتسليم الامتحان تلقائياً لحفظ نزاهة التقييم.
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold text-red-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            جاري حفظ الإجابات والانتقال للنتيجة...
          </div>
        </div>
      )}

      {/* ── Security Alert Banner ──────────── */}
      <div className="mx-auto max-w-4xl mb-3 flex items-center justify-between gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-300 font-bold">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span>الامتحان مراقب ومؤمّن: مغادرة الصفحة أو التقاط سكرين شوت يؤدي لتسليم الامتحان فوراً!</span>
        </div>
        <span className="hidden sm:inline-block text-[11px] font-mono bg-amber-500/20 px-2 py-0.5 rounded-md">
          {watermark}
        </span>
      </div>

      <div className={`mx-auto max-w-4xl space-y-4 transition-all duration-300 ${isScreenBlurred ? 'blur-xl pointer-events-none' : ''}`}>
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0E172A] p-5 shadow-sm">
          <div>
            <h1 className="font-display text-xl font-black text-slate-900 dark:text-white">{exam.title}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">سؤال {current + 1} من {questions.length}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono rounded-xl border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs px-3 py-1 font-bold">
              {answered}/{questions.length} مُجابة
            </Badge>
            <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 px-3 py-1.5 font-mono text-red-600 dark:text-red-400 text-sm font-bold">
              <Clock className="h-4 w-4" />
              {minutes}:{seconds}
            </div>
          </div>
        </header>

        <Progress value={((current + 1) / questions.length) * 100} className="h-2 bg-blue-100 dark:bg-slate-800" />

        {/* Question Card */}
        <Card className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0E172A] shadow-sm overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/40 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-lg bg-blue-100 dark:bg-blue-950 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                {q.question_type === 'mcq' || (q.question_type as string) === 'multiple_choice' ? 'اختيار من متعدد' : '💻 سؤال كتابة كود برمجية'}
              </span>
              <span className="text-xs text-slate-400 font-medium">الدرجة: {q.marks}</span>
            </div>
            <CardTitle className="leading-relaxed text-base font-bold text-slate-900 dark:text-white">{q.question_text}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {q.question_type === 'mcq' || (q.question_type as string) === 'multiple_choice' ? (
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
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/80 shadow-md shadow-blue-500/10'
                          : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50/50 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      <span className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-black transition-colors ${
                        selected ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {opt.key.toUpperCase()}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Professional Code Editor UI */}
                <div className="rounded-2xl border border-slate-700/80 bg-[#0B0F19] overflow-hidden shadow-2xl">
                  {/* Editor Header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-[#131B2E] border-b border-slate-700/60 text-xs">
                    <div className="flex items-center gap-2 text-slate-300 font-mono">
                      <Code className="h-4 w-4 text-cyan-400" />
                      <span className="font-bold text-cyan-300">محرر كتابة الأكواد (Code Editor)</span>
                      <span className="text-slate-500">• index.html</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-red-500/80 inline-block" />
                      <span className="h-3 w-3 rounded-full bg-yellow-500/80 inline-block" />
                      <span className="h-3 w-3 rounded-full bg-green-500/80 inline-block" />
                    </div>
                  </div>

                  {/* Editor Textarea */}
                  <div className="relative p-3">
                    <Textarea
                      value={answers[q.id] ?? ''}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder={`<!-- اكتب كود الـ HTML هنا -->\n<!DOCTYPE html>\n<html lang="ar">\n<head>\n  <title>صفحتي</title>\n</head>\n<body>\n  \n</body>\n</html>`}
                      className="min-h-[260px] font-mono text-sm leading-relaxed border-0 bg-transparent text-emerald-400 placeholder:text-slate-600 focus-visible:ring-0 focus-visible:ring-offset-0"
                      dir="ltr"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  💡 نصيحة: اكتب الكود البرمجي بالكامل مع فتح وغلق الوسوم بدقة.
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
              onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
              className="rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-5 font-bold shadow-md shadow-blue-600/30"
            >
              التالي
              <ChevronLeft className="h-4 w-4 me-1" />
            </Button>
          ) : (
            <Button 
              onClick={onSubmit} 
              disabled={submitting} 
              className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-6 font-bold text-white shadow-lg shadow-emerald-600/30"
            >
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin ms-2" /> جاري التسليم...</> : 'تسليم الامتحان'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
