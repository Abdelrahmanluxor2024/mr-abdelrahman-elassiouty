'use client';

import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@supabase/ssr';
import type { Exam, ExamAttempt, Question, StudentAnswer } from '@/types/supabase';

function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function useExam(examId: string) {
  return useQuery({
    queryKey: ['exams', examId],
    enabled: !!examId,
    queryFn: async () => {
      const supabase = browserClient();
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();
      if (error) throw error;
      return data as Exam;
    },
  });
}

export function useExamQuestions(examId: string) {
  return useQuery({
    queryKey: ['exams', examId, 'questions'],
    enabled: !!examId,
    queryFn: async (): Promise<Question[]> => {
      const supabase = browserClient();
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Question[];
    },
  });
}

export function useAttempt(attemptId: string) {
  return useQuery({
    queryKey: ['attempts', attemptId],
    enabled: !!attemptId,
    queryFn: async (): Promise<ExamAttempt> => {
      const supabase = browserClient();
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('id', attemptId)
        .single();
      if (error) throw error;
      return data as ExamAttempt;
    },
  });
}

export function useLatestAttemptForExam(examId: string, explicitAttemptId?: string) {
  return useQuery({
    queryKey: ['attempts', 'latest', examId, explicitAttemptId],
    enabled: !!examId || !!explicitAttemptId,
    queryFn: async (): Promise<ExamAttempt | null> => {
      const supabase = browserClient();
      if (explicitAttemptId) {
        const { data, error } = await supabase
          .from('exam_attempts')
          .select('*')
          .eq('id', explicitAttemptId)
          .single();
        if (error) return null;
        return data as ExamAttempt;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as ExamAttempt | null;
    },
  });
}

export function useAttemptAnswers(attemptId: string) {
  return useQuery({
    queryKey: ['attempts', attemptId, 'answers'],
    enabled: !!attemptId,
    queryFn: async (): Promise<StudentAnswer[]> => {
      const supabase = browserClient();
      const { data, error } = await supabase
        .from('student_answers')
        .select('*')
        .eq('attempt_id', attemptId);
      if (error) throw error;
      return (data ?? []) as StudentAnswer[];
    },
  });
}

export function useMyAttempts() {
  return useQuery({
    queryKey: ['attempts', 'me'],
    queryFn: async (): Promise<(ExamAttempt & { exam: Exam })[]> => {
      const supabase = browserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('*, exam:exams(*)')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as (ExamAttempt & { exam: Exam })[];
    },
  });
}
