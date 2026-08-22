'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Clock, ChevronLeft, ChevronRight, Loader2, AlertTriangle, Code, Terminal, Sparkles, CheckCircle2 } from 'lucide-react';
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
  const [exhausted, setExhausted] = useState(false);
  const submittedRef = useRef(false);

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

  // Timer
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      void onSubmit();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s === null ? s : s - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const q = questions[current];
  const answered = useMemo(
    () => Object.values(answers).filter((a) => a && a.trim()).length,
    [answers]
  );

  async function onSubmit() {
    if (submitting || !attemptId || !examId || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    
    const formattedAnswers = Object.entries(answers).map(([questionId, answerText]) => ({
      questionId,
      answerText,
    }));

    const res = await submitExam({
      attemptId,
      examId,
      answers: formattedAnswers,
    });

    if (!res.ok) {
      toast.error(res.error);
      setSubmitting(false);
      submittedRef.current = false;
      return;
    }

    try {
      sessionStorage.removeItem(`exam_answers_${examId}`);
    } catch {
      // ignore
    }

    toast.success('تم تسليم الامتحان وحساب النتيجة بنجاح 🎉');
    router.push(`/exam/${examId}/result?attempt=${res.attemptId}`);
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
    <div className="mx-auto max-w-4xl space-y-4" dir="rtl">
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
  );
}
