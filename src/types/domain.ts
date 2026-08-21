import type { Question } from './supabase';

/** MCQ options normalized shape used inside the exam player. */
export type { Question };

export type BranchScore = { branch: string; correct: number; total: number; pct: number };

export type ExamResult = {
  attemptId: string;
  score: number;
  total: number;
  percentage: number;
  correct: number;
  wrong: number;
  unanswered: number;
  status: 'in_progress' | 'submitted' | 'graded';
  branchScores: BranchScore[];
};

export type DeviceInfo = {
  fingerprint: string;
  userAgent: string;
  platform: string;
};
