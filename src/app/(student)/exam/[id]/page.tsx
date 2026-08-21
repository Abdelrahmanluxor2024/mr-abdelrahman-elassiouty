'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Clock, ChevronLeft, ChevronRight, Loader2, AlertTriangle, MessageCircle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { startExam, submitExam } from '@/app/actions/exams';
import { useExam, useExamQuestions } from '@/lib/queries/useExams';

export default function ExamRunnerPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const examId = params.id;

  const { data: exam } = useExam(examId);
  const { data: questions = [] } = useExamQuestions(examId);

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [exhausted, setExhausted] = useState(false);
  const [cheatTerminated, setCheatTerminated] = useState(false);
  const startedAt = useRef<number>(0);
  const submittedRef = useRef(false);

  // Start attempt on mount
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
      setSecondsLeft(res.durationMinutes * 60);
      startedAt.current = Date.now();
    });
  }, [examId, attemptId, router]);

  // Timer
  useEffect(() => {
    if (secondsLeft === null || cheatTerminated) return;
    if (secondsLeft <= 0) {
      void onSubmit();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s === null ? s : s - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, cheatTerminated]);

  // Strict Anti-cheat: tab visibility + window blur
  useEffect(() => {
    if (!attemptId || submittedRef.current || cheatTerminated) return;

    function handleTabLeave() {
      if (submittedRef.current || cheatTerminated) return;
      submittedRef.current = true;
      setCheatTerminated(true);
      
      // Auto-submit current state immediately
      void submitExam({
        attemptId: attemptId!,
        examId: examId!,
        answers: Object.entries(answers).map(([questionId, answerText]) => ({
          questionId,
          answerText,
        })),
      });
    }

    function onVisibility() {
      if (document.hidden) {
        handleTabLeave();
      }
    }

    function onBlur() {
      handleTabLeave();
    }

    function onContext(e: MouseEvent) {
      e.preventDefault();
      setWarning('النسخ/القائمة معطلة أثناء الامتحان للحفاظ على الأمان.');
    }

    function onCopy(e: ClipboardEvent) {
      e.preventDefault();
      setWarning('النسخ والقص معطل أثناء الامتحان.');
    }

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('contextmenu', onContext);
    document.addEventListener('copy', onCopy);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('contextmenu', onContext);
      document.removeEventListener('copy', onCopy);
    };
  }, [attemptId, examId, answers, cheatTerminated]);

  const q = questions[current];
  const answered = useMemo(
    () => Object.values(answers).filter((a) => a && a.trim()).length,
    [answers]
  );

  async function onSubmit() {
    if (submitting || !attemptId || !examId || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    const res = await submitExam({
      attemptId,
      examId,
      answers: Object.entries(answers).map(([questionId, answerText]) => ({
        questionId,
        answerText,
      })),
    });
    if (!res.ok) {
      toast.error(res.error);
      setSubmitting(false);
      submittedRef.current = false;
      return;
    }
    toast.success('تم تسليم الامتحان بنجاح');
    router.push(`/exam/${examId}/result?attempt=${res.attemptId}`);
  }

  // Terminated for leaving window
  if (cheatTerminated) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center" dir="rtl">
        <div className="rounded-3xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-[#0E172A] p-8 shadow-2xl space-y-6">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-red-100 dark:bg-red-950/70 text-red-600 dark:text-red-400">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-black text-slate-900 dark:text-white">
              تم إيقاف وتسليم الامتحان تلقائياً! ⚠️
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              تم رصد مغادرة نافذة الامتحان. وفقاً لتعليمات منصة مستر عبدالرحمن الأسيوطي لمكافحة الغش، يتم إيقاف الامتحان وتسليم الإجابات مباشرة ولا يمكن استئناف المحاولة.
            </p>
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 font-bold">
              إذا حدث هذا عن طريق الخطأ، يرجى التواصل فوراً مع الدعم الفني لطلب محاولة إضافية.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <a
              href="https://wa.me/201064106070?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D8%AA%D9%85%20%D8%A5%D9%8A%D9%82%D8%A7%D9%81%20%D8%A7%D9%84%D8%A7%D9%85%D8%AA%D8%AD%D8%A7%D9%86%20%D8%A8%D8%B3%D8%A8%D8%A8%20%D8%A7%D9%84%D8%AE%D8%B1%D9%88%D8%AC%20%D9%85%D9%86%20%D8%A7%D9%84%D9%86%D8%A7%D9%81%D8%B0%D8%A9%20%D8%B9%D9%86%20%D8%B7%D8%B1%D9%8A%D9%82%20%D8%A7%D9%84%D8%AE%D8%B7%D8%A3%D8%8C%20%D8%A3%D8%B1%D8%AC%D9%88%20%D9%85%D9%86%D8%AD%D9%8A%20%D9%85%D8%AD%D8%A7%D9%88%D9%84%D8%A9."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 transition"
            >
              <MessageCircle className="h-5 w-5" />
              <span>تواصل مع الدعم الفني (واتساب)</span>
            </a>
            <Button asChild variant="outline" className="w-full rounded-2xl py-3 font-bold dark:border-slate-800 dark:bg-slate-900">
              <Link href={`/exam/${examId}/result`}>
                عرض نتيجة هذه المحاولة
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
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

  return (
    <div className="no-select mx-auto max-w-4xl space-y-4" dir="rtl">
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

      {warning && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 px-4 py-2.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {warning}
        </div>
      )}

      {/* Question Card */}
      <Card className="rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#0E172A] shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-slate-900/40 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-lg bg-blue-100 dark:bg-blue-950 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
              {q.question_type === 'mcq' ? 'اختيار من متعدد' : 'سؤال مقالي'}
            </span>
            <span className="text-xs text-slate-400 font-medium">الدرجة: {q.marks}</span>
          </div>
          <CardTitle className="leading-relaxed text-base font-bold text-slate-900 dark:text-white">{q.question_text}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {q.question_type === 'mcq' ? (
            <div className="space-y-3">
              {(q.options ?? []).map((opt) => {
                const selected = answers[q.id] === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setAnswers((p) => ({ ...p, [q.id]: opt.key }))}
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
            <Textarea
              value={answers[q.id] ?? ''}
              onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
              placeholder="اكتب إجابتك هنا..."
              className="min-h-[180px] text-sm leading-relaxed rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
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
  );
}


