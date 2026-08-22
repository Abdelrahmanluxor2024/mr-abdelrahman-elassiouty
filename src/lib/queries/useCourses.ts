'use client';

import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@supabase/ssr';
import type { Course, Lesson, Enrollment } from '@/types/supabase';

function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function useCourses() {
  return useQuery({
    queryKey: ['courses', 'all'],
    queryFn: async (): Promise<Course[]> => {
      const supabase = browserClient();
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Course[];
    },
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: ['courses', id],
    enabled: !!id,
    queryFn: async () => {
      const supabase = browserClient();
      const { data, error } = await supabase
        .from('courses')
        .select('*, lessons:lessons(*, exams(*), exam:exams(*))')
        .eq('id', id)
        .order('order_index', { referencedTable: 'lessons', ascending: true })
        .single();
      if (error) throw error;
      return data as Course & { lessons: (Lesson & { exams?: { id: string; title: string; passing_marks?: number; total_marks?: number }[]; exam?: { id: string; title: string }[] })[] };
    },
  });
}

export function useLesson(id: string) {
  return useQuery({
    queryKey: ['lessons', id],
    enabled: !!id,
    queryFn: async () => {
      const supabase = browserClient();
      const { data, error } = await supabase
        .from('lessons')
        .select('*, course:courses(*), exams(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Lesson & { course: Course; exams?: { id: string; title: string; duration_minutes: number; total_marks: number }[]; exam?: { id: string; title: string; duration_minutes: number; total_marks: number }[] };
    },
  });
}

export function useEnrollments() {
  return useQuery({
    queryKey: ['enrollments', 'me'],
    queryFn: async (): Promise<(Enrollment & { course: Course })[]> => {
      const supabase = browserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, course:courses(*)')
        .eq('student_id', user.user_metadata.student_id ?? user.id)
        .order('enrolled_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as (Enrollment & { course: Course })[];
    },
  });
}

export function useCourseEnrollment(courseId: string) {
  return useQuery({
    queryKey: ['enrollment', courseId],
    enabled: !!courseId,
    queryFn: async () => {
      const supabase = browserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();
      return data as Enrollment | null;
    },
  });
}

export function useStudentPassedExams() {
  return useQuery({
    queryKey: ['student', 'passed_exams'],
    staleTime: 0,
    refetchOnMount: 'always',
    queryFn: async () => {
      const supabase = browserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return new Set<string>();
      
      // Also get student id from students table if different
      const { data: studentRecord } = await supabase
        .from('students')
        .select('id')
        .or(`id.eq.${user.id},phone.eq.${user.phone || user.email?.split('@')[0]}`)
        .maybeSingle();

      const studentIds = Array.from(new Set([user.id, user.user_metadata?.student_id, studentRecord?.id].filter(Boolean)));
      
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('exam_id, percentage, score, status')
        .in('student_id', studentIds);

      if (error) {
        console.error('Error fetching passed exams:', error);
        return new Set<string>();
      }
      
      const passed = new Set<string>();
      (data ?? []).forEach((att: any) => {
        const pct = Number(att.percentage ?? 0);
        const score = Number(att.score ?? 0);
        if (pct >= 50 || score > 0 || att.status === 'graded') {
          passed.add(att.exam_id);
        }
      });
      return passed;
    },
  });
}



