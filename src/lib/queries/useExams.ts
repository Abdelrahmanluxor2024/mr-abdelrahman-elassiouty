'use client';

import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@supabase/ssr';
import type { Exam, ExamAttempt, Question, StudentAnswer } from '@/types/supabase';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, getDocs, collection, query, where, orderBy, limit } from 'firebase/firestore';

function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  );
}

export function useExam(examId: string) {
  return useQuery({
    queryKey: ['exams', examId],
    enabled: !!examId,
    queryFn: async () => {
      // 1. Try Firebase first
      try {
        const snap = await getDoc(doc(db, 'exams', examId));
        if (snap.exists()) {
          const d = snap.data();
          return {
            id: snap.id,
            title: d.title || 'امتحان',
            description: d.description || '',
            duration_minutes: Number(d.durationMinutes || d.duration_minutes || 30),
            total_marks: Number(d.totalMarks || d.total_marks || 20),
            passing_marks: Number(d.passingMarks || d.passing_marks || 10),
            max_attempts: Number(d.maxAttempts || d.max_attempts || 3),
            created_at: d.createdAt || d.created_at || new Date().toISOString()
          } as Exam;
        }
      } catch (err) {
        console.warn('Firebase useExam error:', err);
      }

      // 2. Fallback to Supabase
      try {
        const supabase = browserClient();
        const { data, error } = await supabase
          .from('exams')
          .select('*')
          .eq('id', examId)
          .single();
        if (!error && data) return data as Exam;
      } catch (e) {
        // ignore
      }

      return null;
    },
  });
}

export function useExamQuestions(examId: string) {
  return useQuery({
    queryKey: ['exams', examId, 'questions'],
    enabled: !!examId,
    queryFn: async (): Promise<Question[]> => {
      // 1. Try Firebase first
      try {
        const qRef = collection(db, 'questions');
        const qQuery = query(qRef, where('examId', '==', examId), orderBy('orderIndex', 'asc'));
        const snap = await getDocs(qQuery).catch(async () => {
          // If compound query fails (no index), query without order
          return await getDocs(query(collection(db, 'questions'), where('examId', '==', examId)));
        });

        if (!snap.empty) {
          const questions = snap.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              exam_id: data.examId || examId,
              question_text: data.questionText || data.question_text || '',
              question_type: data.questionType || data.question_type || 'mcq',
              marks: Number(data.marks || 1),
              order_index: Number(data.orderIndex || data.order_index || 1),
              options: data.options || [],
              correct_answer: data.correctAnswer || data.correct_answer || '',
              explanation: data.explanation || '',
              branch: data.branch || 'عام'
            } as Question;
          });
          return questions.sort((a, b) => a.order_index - b.order_index);
        }
      } catch (err) {
        console.warn('Firebase useExamQuestions error:', err);
      }

      // 2. Fallback to Supabase
      try {
        const supabase = browserClient();
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .eq('exam_id', examId)
          .order('order_index', { ascending: true });
        if (!error && data) return (data ?? []) as Question[];
      } catch (e) {
        // ignore
      }

      return [];
    },
  });
}

export function useAttempt(attemptId: string) {
  return useQuery({
    queryKey: ['attempts', attemptId],
    enabled: !!attemptId,
    queryFn: async (): Promise<ExamAttempt | null> => {
      try {
        const snap = await getDoc(doc(db, 'exam_attempts', attemptId));
        if (snap.exists()) {
          const d = snap.data();
          return {
            id: snap.id,
            exam_id: d.examId || d.exam_id,
            student_id: d.studentId || d.student_id,
            score: Number(d.score || 0),
            percentage: Number(d.percentage || 0),
            correct_count: Number(d.correct_count || d.correctCount || 0),
            wrong_count: Number(d.wrong_count || d.wrongCount || 0),
            unanswered_count: Number(d.unanswered_count || d.unansweredCount || 0),
            status: d.status || 'passed',
            created_at: d.createdAt || d.created_at || new Date().toISOString()
          } as any as ExamAttempt;
        }
      } catch (err) {
        console.warn('Firebase useAttempt error:', err);
      }

      try {
        const supabase = browserClient();
        const { data, error } = await supabase
          .from('exam_attempts')
          .select('*')
          .eq('id', attemptId)
          .single();
        if (!error && data) return data as ExamAttempt;
      } catch (e) {
        // ignore
      }

      return null;
    },
  });
}

export function useLatestAttemptForExam(examId: string, explicitAttemptId?: string) {
  return useQuery({
    queryKey: ['attempts', 'latest', examId, explicitAttemptId],
    enabled: !!examId || !!explicitAttemptId,
    queryFn: async (): Promise<ExamAttempt | null> => {
      if (explicitAttemptId) {
        try {
          const snap = await getDoc(doc(db, 'exam_attempts', explicitAttemptId));
          if (snap.exists()) {
            const d = snap.data();
            return {
              id: snap.id,
              exam_id: d.examId || d.exam_id,
              student_id: d.studentId || d.student_id,
              score: Number(d.score || 0),
              percentage: Number(d.percentage || 0),
              correct_count: Number(d.correct_count || d.correctCount || 0),
              wrong_count: Number(d.wrong_count || d.wrongCount || 0),
              unanswered_count: Number(d.unanswered_count || d.unansweredCount || 0),
              status: d.status || 'passed',
              created_at: d.createdAt || d.created_at || new Date().toISOString()
            } as any as ExamAttempt;
          }
        } catch (err) {
          console.warn('Firebase explicit attempt error:', err);
        }
      }

      // Try latest from Firebase
      try {
        const snap = await getDocs(
          query(
            collection(db, 'exam_attempts'),
            where('examId', '==', examId),
            orderBy('createdAt', 'desc'),
            limit(1)
          )
        ).catch(async () => {
          return await getDocs(query(collection(db, 'exam_attempts'), where('examId', '==', examId)));
        });

        if (!snap.empty) {
          const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
          sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          const d = sorted[0];
          return {
            id: d.id,
            exam_id: d.examId || d.exam_id,
            student_id: d.studentId || d.student_id,
            score: Number(d.score || 0),
            percentage: Number(d.percentage || 0),
            correct_count: Number(d.correct_count || d.correctCount || 0),
            wrong_count: Number(d.wrong_count || d.wrongCount || 0),
            unanswered_count: Number(d.unanswered_count || d.unansweredCount || 0),
            status: d.status || 'passed',
            created_at: d.createdAt || d.created_at || new Date().toISOString()
          } as any as ExamAttempt;
        }
      } catch (err) {
        console.warn('Firebase latest attempt error:', err);
      }

      return null;
    },
  });
}

export function useAttemptAnswers(attemptId: string) {
  return useQuery({
    queryKey: ['attempts', attemptId, 'answers'],
    enabled: !!attemptId,
    queryFn: async (): Promise<StudentAnswer[]> => {
      try {
        const snap = await getDocs(
          query(collection(db, 'student_answers'), where('attempt_id', '==', attemptId))
        );
        if (!snap.empty) {
          return snap.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              attempt_id: data.attempt_id,
              question_id: data.question_id,
              answer_text: data.answer_text,
              is_correct: data.is_correct,
              marks_obtained: data.marks_obtained,
              status: data.status,
              grader_feedback: data.grader_feedback
            } as StudentAnswer;
          });
        }
      } catch (err) {
        console.warn('Firebase attempt answers error:', err);
      }

      return [];
    },
  });
}

export function useMyAttempts() {
  return useQuery({
    queryKey: ['attempts', 'me'],
    queryFn: async (): Promise<(ExamAttempt & { exam: Exam })[]> => {
      try {
        const snap = await getDocs(collection(db, 'exam_attempts'));
        if (!snap.empty) {
          return snap.docs.map(d => ({ id: d.id, ...d.data() })) as any;
        }
      } catch (e) {
        // ignore
      }
      return [];
    },
  });
}

