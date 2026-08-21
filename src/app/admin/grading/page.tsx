'use client';

import { useState, useTransition } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createBrowserClient } from '@supabase/ssr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { gradeEssay } from '@/app/actions/admin';
import { toast } from 'sonner';

type PendingAnswer = {
  id: string;
  attempt_id: string;
  question_id: string;
  answer_text: string | null;
  marks_obtained: number;
  status: string;
  created_at: string;
};

type Question = { id: string; question_text: string; marks: number; branch: string | null };
type Attempt = { id: string; student_id: string; exam_id: string };
type Student = { id: string; full_name: string; phone: string };

export default function AdminGradingPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const qc = useQueryClient();
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const { data: answers = [], isLoading } = useQuery({
    queryKey: ['admin', 'pending-essays'],
    queryFn: async (): Promise<PendingAnswer[]> => {
      const { data, error } = await supabase
        .from('student_answers')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as PendingAnswer[];
    },
  });

  const { data: questionsById = new Map<string, Question>() } = useQuery({
    queryKey: ['admin', 'essay-questions', answers.map((a) => a.question_id).join(',')],
    enabled: answers.length > 0,
    queryFn: async () => {
      const ids = Array.from(new Set(answers.map((a) => a.question_id)));
      const { data } = await supabase.from('questions').select('id, question_text, marks, branch').in('id', ids);
      return new Map((data ?? []).map((q) => [q.id, q as Question]));
    },
  });

  const { data: studentsById = new Map<string, Student>() } = useQuery({
    queryKey: ['admin', 'students-map'],
    queryFn: async () => {
      const { data } = await supabase.from('students').select('id, full_name, phone');
      return new Map((data ?? []).map((s) => [s.id, s as Student]));
    },
  });

  const { data: attemptsById = new Map<string, Attempt>() } = useQuery({
    queryKey: ['admin', 'attempts-map', answers.map((a) => a.attempt_id).join(',')],
    enabled: answers.length > 0,
    queryFn: async () => {
      const ids = Array.from(new Set(answers.map((a) => a.attempt_id)));
      const { data } = await supabase.from('exam_attempts').select('id, student_id, exam_id').in('id', ids);
      return new Map((data ?? []).map((a) => [a.id, a as Attempt]));
    },
  });

  function onGrade(answerId: string, maxMarks: number) {
    const m = Number(marks[answerId] ?? 0);
    if (Number.isNaN(m) || m < 0 || m > maxMarks) {
      toast.error(`الدرجة يجب أن تكون بين 0 و ${maxMarks}`);
      return;
    }
    start(async () => {
      const res = await gradeEssay({ answerId, marksObtained: m, feedback: feedback[answerId] });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success('تم التصحيح');
      qc.invalidateQueries({ queryKey: ['admin', 'pending-essays'] });
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-black text-brand-900">تصحيح الأسئلة المقالية</h1>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : answers.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-slate-500">
            🎉 مفيش إجابات مقالية مستنية التصحيح.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {answers.map((a) => {
            const q = questionsById.get(a.question_id);
            const att = attemptsById.get(a.attempt_id);
            const stu = att ? studentsById.get(att.student_id) : undefined;
            return (
              <Card key={a.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">سؤال: {q?.question_text ?? '—'}</CardTitle>
                    <Badge variant="outline">{q?.branch ?? '—'}</Badge>
                    <Badge variant="secondary">درجة كاملة: {q?.marks ?? '?'}</Badge>
                  </div>
                  <p className="text-sm text-slate-500">
                    الطالب: <strong>{stu?.full_name ?? '—'}</strong> • {stu?.phone}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-xl bg-slate-50 p-3 text-sm leading-7">{a.answer_text ?? '—'}</div>
                  <div className="grid gap-2 sm:grid-cols-[120px_1fr_auto]">
                    <div>
                      <label className="text-xs text-slate-500">الدرجة</label>
                      <Input
                        type="number"
                        min={0}
                        max={q?.marks ?? 100}
                        value={marks[a.id] ?? ''}
                        onChange={(e) => setMarks((p) => ({ ...p, [a.id]: Number(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">تعليق المصحح (اختياري)</label>
                      <Textarea
                        value={feedback[a.id] ?? ''}
                        onChange={(e) => setFeedback((p) => ({ ...p, [a.id]: e.target.value }))}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={() => onGrade(a.id, q?.marks ?? 100)} disabled={pending}>
                        تصحيح
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
