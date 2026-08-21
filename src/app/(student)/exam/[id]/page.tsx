'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Clock, ChevronLeft, ChevronRight, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { startExam, submitExam } from '@/app/actions/exams';
import { useExam, useExamQuestions } from '@/lib/queries/useExams';
import type { Question } from '@/types/supabase';

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
  const startedAt = useRef<number>(0);

  // Start attempt on mount
  useEffect(() => {
    if (attemptId || !examId) return;
    startExam(examId).then((res) => {
      if (!res.ok) {
        // Check if it's an "attempts exhausted" error
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
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      void onSubmit();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s === null ? s : s - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  // Anti-cheat: tab visibility + right click
  useEffect(() => {
    function onVisibility() {
      if (document.hidden) {
        setWarning('تنبيه: تم رصد خروج من نافذة الامتحان. ده ممكن يتسجل ضدك.');
      }
    }
    function onContext(e: MouseEvent) {
      e.preventDefault();
      setWarning('النسخ/اللصق معطّل أثناء الامتحان.');
    }
    function onCopy(e: ClipboardEvent) {
      e.preventDefault();
      setWarning('النسخ/اللصق معطّل أثناء الامتحان.');
    }
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('contextmenu', onContext);
    document.addEventListener('copy', onCopy);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('contextmenu', onContext);
      document.removeEventListener('copy', onCopy);
    };
  }, []);

  const q = questions[current];
  const answered = useMemo(
    () => Object.values(answers).filter((a) => a && a.trim()).length,
    [answers]
  );

  async function onSubmit() {
    if (submitting || !attemptId || !examId) return;
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
      return;
    }
    toast.success('تم تسليم الامتحان بنجاح');
    router.push(`/exam/${examId}/result?attempt=${res.attemptId}`);
  }

  if (exhausted) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center" dir="rtl">
        <div className="rounded-3xl border border-purple-100 bg-white p-8 shadow-sm space-y-5">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-purple-50 text-purple-700">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <div>
            <h2 className="font-display text-xl font-black text-slate-900">
              استنفدت كل المحاولات المتاحة
            </h2>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              لقد قمت بأداء هذا الامتحان بالحد الأقصى للمحاولات المسموح بها ({exam?.max_attempts ?? 1} محاولة).
            </p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <Button asChild className="w-full bg-purple-700 hover:bg-purple-800 rounded-xl py-2.5 font-bold">
              <Link href={`/exam/${examId}/result`}>
                عرض نتيجتي في الامتحان
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full rounded-xl py-2.5 font-bold">
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
        <Loader2 className="h-8 w-8 animate-spin text-purple-700" />
      </div>
    );
  }

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const seconds = (secondsLeft % 60).toString().padStart(2, '0');

  return (
    <div className="no-select mx-auto max-w-4xl space-y-4" dir="rtl">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div>
          <h1 className="font-display text-xl font-black text-slate-900">{exam.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">سؤال {current + 1} من {questions.length}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-mono rounded-xl border-purple-200 bg-purple-50 text-purple-800 text-xs px-3 py-1 font-bold">
            {answered}/{questions.length} مُجابة
          </Badge>
          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-1.5 font-mono text-red-600 text-sm font-bold">
            <Clock className="h-4 w-4" />
            {minutes}:{seconds}
          </div>
        </div>
      </header>

      <Progress value={((current + 1) / questions.length) * 100} className="h-2 bg-purple-50" />

      {warning && (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-semibold text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {warning}
        </div>
      )}

      {/* Question Card */}
      <Card className="rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/50 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-lg bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800">
              {q.question_type === 'mcq' ? 'اختيار من متعدد' : 'سؤال مقالي'}
            </span>
            <span className="text-xs text-slate-400 font-medium">الدرجة: {q.marks}</span>
          </div>
          <CardTitle className="leading-relaxed text-base font-bold text-slate-900">{q.question_text}</CardTitle>
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
                        ? 'border-purple-600 bg-purple-50/80 shadow-sm shadow-purple-500/10'
                        : 'border-slate-200 hover:border-purple-200 hover:bg-slate-50/50'
                    }`}
                  >
                    <span className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-black transition-colors ${
                      selected ? 'bg-purple-700 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {opt.key.toUpperCase()}
                    </span>
                    <span className="font-semibold text-slate-800 text-sm">{opt.text}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <Textarea
              value={answers[q.id] ?? ''}
              onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
              placeholder="اكتب إجابتك هنا..."
              className="min-h-[180px] text-sm leading-relaxed rounded-2xl border-slate-200"
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
          className="rounded-2xl px-5 font-bold"
        >
          <ChevronRight className="h-4 w-4 ms-1" />
          السابق
        </Button>
        {current < questions.length - 1 ? (
          <Button 
            onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
            className="rounded-2xl bg-purple-700 hover:bg-purple-800 px-5 font-bold"
          >
            التالي
            <ChevronLeft className="h-4 w-4 me-1" />
          </Button>
        ) : (
          <Button 
            onClick={onSubmit} 
            disabled={submitting} 
            className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-6 font-bold text-white shadow-md shadow-emerald-600/20"
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin ms-2" /> جاري التسليم...</> : 'تسليم الامتحان'}
          </Button>
        )}
      </div>
    </div>
  );
}

