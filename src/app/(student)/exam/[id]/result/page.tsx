'use client';

import Link from 'next/link';
import { useSearchParams, useParams } from 'next/navigation';
import { useLatestAttemptForExam, useAttemptAnswers, useExamQuestions, useExam } from '@/lib/queries/useExams';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, HelpCircle, ArrowLeft, Trophy, AlertCircle, BookOpen } from 'lucide-react';
import { formatArabicNumber } from '@/lib/utils';

export default function ExamResultPage() {
  const params = useParams<{ id: string }>();
  const examId = params.id;
  const search = useSearchParams();
  const explicitAttemptId = search.get('attempt') ?? undefined;

  const { data: exam, isLoading: loadingExam } = useExam(examId);
  const { data: attempt, isLoading: loadingAttempt } = useLatestAttemptForExam(examId, explicitAttemptId);
  const { data: questions = [] } = useExamQuestions(examId);
  const { data: answers = [] } = useAttemptAnswers(attempt?.id ?? '');

  if (loadingExam || loadingAttempt) {
    return (
      <div className="mx-auto max-w-4xl space-y-6" dir="rtl">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <div className="grid gap-6 sm:grid-cols-3">
          <Skeleton className="h-28 w-full rounded-3xl" />
          <Skeleton className="h-28 w-full rounded-3xl" />
          <Skeleton className="h-28 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center" dir="rtl">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
          <p className="mt-3 font-bold text-slate-700">الامتحان غير موجود.</p>
          <Button asChild className="mt-4 rounded-xl bg-purple-700">
            <Link href="/courses">الرجوع للكورسات</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center" dir="rtl">
        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm space-y-4">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-purple-50 text-purple-700">
            <Trophy className="h-7 w-7" />
          </div>
          <h2 className="font-display text-xl font-black text-slate-900">
            لم تقم بأداء هذا الامتحان بعد
          </h2>
          <p className="text-xs text-slate-500">
            يمكنك بدء الامتحان الآن لقياس مستواك وتحديد نقاط قوتك.
          </p>
          <div className="pt-2">
            <Button asChild className="w-full rounded-xl bg-purple-700 hover:bg-purple-800 font-bold">
              <Link href={`/exam/${examId}`}>ابدأ الامتحان الآن</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const total = exam.total_marks;
  const percentage = Math.round(Number(attempt.percentage));
  const passed = percentage >= (exam.passing_marks / total) * 100;

  const answerByQ = new Map(answers.map((a) => [a.question_id, a]));

  return (
    <div className="mx-auto max-w-4xl space-y-6" dir="rtl">
      {/* Hero Result Banner */}
      <div className={`rounded-3xl p-8 text-white shadow-xl ${
        passed
          ? 'bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 shadow-purple-500/20'
          : 'bg-gradient-to-r from-rose-600 to-red-600 shadow-red-500/20'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="rounded-full bg-white/20 px-3.5 py-1 text-xs font-bold backdrop-blur-md">
            {passed ? '🎉 مبروك، اجتزت الامتحان بنجاح' : '⚠️ محاولة جيدة، راجع أخطاءك'}
          </span>
          <span className="text-xs text-white/80 font-mono">
            {new Date(attempt.created_at).toLocaleDateString('ar-EG')}
          </span>
        </div>

        <h1 className="mt-3 font-display text-2xl font-black">{exam.title}</h1>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="الدرجة الكلية" value={`${attempt.score} / ${total}`} />
          <Stat label="النسبة المئوية" value={`%${formatArabicNumber(percentage)}`} />
          <Stat label="إجابات صحيحة" value={formatArabicNumber(attempt.correct_count)} />
          <Stat label="إجابات خاطئة" value={formatArabicNumber(attempt.wrong_count)} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500 text-white shadow-sm">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold">إجابات صحيحة</p>
            <p className="font-display text-xl font-black text-emerald-700">{formatArabicNumber(attempt.correct_count)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-rose-500 text-white shadow-sm">
            <XCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold">إجابات خاطئة</p>
            <p className="font-display text-xl font-black text-rose-700">{formatArabicNumber(attempt.wrong_count)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-600 shadow-sm">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-semibold">بدون إجابة</p>
            <p className="font-display text-xl font-black text-slate-700">{formatArabicNumber(attempt.unanswered_count)}</p>
          </div>
        </div>
      </div>

      {/* Detailed Questions Review */}
      <Card className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-lg font-bold text-slate-900">مراجعة الأسئلة والإجابة النموذجية</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 pt-2">
          {questions.map((q, i) => {
            const a = answerByQ.get(q.id);
            const isCorrect = a?.is_correct;
            return (
              <div key={q.id} className="py-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-purple-700">سؤال {i + 1} • {q.branch ?? 'عام'}</span>
                  <span className={`rounded-lg px-2.5 py-0.5 text-xs font-bold ${
                    isCorrect
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {isCorrect ? 'إجابة صحيحة (+1)' : 'إجابة خاطئة (0)'}
                  </span>
                </div>

                <p className="font-bold text-slate-900 text-sm leading-relaxed">{q.question_text}</p>

                {q.question_type === 'mcq' || (q.question_type as string) === 'multiple_choice' ? (
                  <div className="rounded-2xl bg-slate-50 p-3.5 text-xs space-y-1.5 border border-slate-100">
                    <p className="text-slate-600">
                      إجابتك: <span className={`font-bold ${isCorrect ? 'text-emerald-700' : 'text-rose-600'}`}>{a?.answer_text ?? 'لم يتم الإجابة'}</span>
                    </p>
                    <p className="text-slate-600">
                      الإجابة النموذجية الصحيحة: <span className="font-bold text-emerald-700">{q.correct_answer?.toUpperCase()}</span>
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-3.5 text-xs space-y-1 border border-slate-100">
                    <p className="text-slate-700">{a?.answer_text ?? 'لم تجب على هذا السؤال'}</p>
                    <p className="font-bold text-purple-700">الدرجة: {a?.marks_obtained}/{q.marks}</p>
                  </div>
                )}

                {q.explanation && (
                  <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-3 text-xs leading-relaxed text-purple-900">
                    💡 <strong>الشرح:</strong> {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-2">
        <Button asChild variant="outline" className="rounded-xl font-bold">
          <Link href="/courses">الرجوع للكورسات</Link>
        </Button>
        <Button asChild className="rounded-xl bg-purple-700 hover:bg-purple-800 font-bold text-white">
          <Link href="/dashboard">الانتقال للرئيسية</Link>
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3.5 text-center backdrop-blur-md">
      <p className="text-[11px] text-white/80 font-medium">{label}</p>
      <p className="font-display text-xl font-black text-white mt-0.5">{value}</p>
    </div>
  );
}

