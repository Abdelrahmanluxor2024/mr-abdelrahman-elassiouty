'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

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
  const [marks, setMarks] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [answers, setAnswers] = useState<PendingAnswer[]>([]);
  const [questionsById, setQuestionsById] = useState<Map<string, Question>>(new Map());
  const [studentsById, setStudentsById] = useState<Map<string, Student>>(new Map());
  const [attemptsById, setAttemptsById] = useState<Map<string, Attempt>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  async function loadData() {
    setIsLoading(true);
    try {
      // In Firebase mode, pending essays are loaded from firestore
      const snap = await getDocs(collection(db, 'student_answers')).catch(() => null);
      if (snap && !snap.empty) {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        const pendingList = list.filter(a => a.status === 'pending');
        setAnswers(pendingList);

        // Fetch questions
        const qSnap = await getDocs(collection(db, 'questions')).catch(() => null);
        if (qSnap && !qSnap.empty) {
          const qMap = new Map<string, Question>();
          qSnap.docs.forEach(d => {
            const data = d.data();
            qMap.set(d.id, {
              id: d.id,
              question_text: data.questionText || data.question_text || '',
              marks: Number(data.marks || 1),
              branch: data.branch || 'عام'
            });
          });
          setQuestionsById(qMap);
        }

        // Fetch students / users
        const uSnap = await getDocs(collection(db, 'users')).catch(() => null);
        if (uSnap && !uSnap.empty) {
          const uMap = new Map<string, Student>();
          uSnap.docs.forEach(d => {
            const data = d.data();
            uMap.set(d.id, {
              id: d.id,
              full_name: data.fullName || data.full_name || 'طالب',
              phone: data.phone || data.phoneNumber || ''
            });
          });
          setStudentsById(uMap);
        }

        // Fetch attempts
        const attSnap = await getDocs(collection(db, 'exam_attempts')).catch(() => null);
        if (attSnap && !attSnap.empty) {
          const attMap = new Map<string, Attempt>();
          attSnap.docs.forEach(d => {
            const data = d.data();
            attMap.set(d.id, {
              id: d.id,
              student_id: data.studentId || data.student_id || '',
              exam_id: data.examId || data.exam_id || ''
            });
          });
          setAttemptsById(attMap);
        }
      } else {
        setAnswers([]);
      }
    } catch (err) {
      console.warn('Error loading pending essays:', err);
      setAnswers([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function onGrade(answerId: string, maxMarks: number) {
    const m = Number(marks[answerId] ?? 0);
    if (Number.isNaN(m) || m < 0 || m > maxMarks) {
      toast.error(`الدرجة يجب أن تكون بين 0 و ${maxMarks}`);
      return;
    }
    setPending(true);
    try {
      await updateDoc(doc(db, 'student_answers', answerId), {
        marks_obtained: m,
        grader_feedback: feedback[answerId] || '',
        status: 'graded'
      });
      toast.success('تم التصحيح وحفظ الدرجة بنجاح ✅');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء التصحيح');
    } finally {
      setPending(false);
    }
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
