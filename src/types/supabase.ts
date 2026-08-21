/**
 * Supabase Database types — compatible with @supabase/supabase-js v2.
 * Hand-written to match db/schema.sql.
 * Regenerate with: supabase gen types typescript --project-id tkrygfflhrvgveiolhsl
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [k: string]: Json | undefined }
  | Json[];

// ─── Enums ────────────────────────────────────────────────────────────────────
export type GradeLevel = '1st_secondary' | '2nd_secondary' | '3rd_secondary';
export type ExamStatus = 'in_progress' | 'submitted' | 'graded';
export type AnswerStatus = 'pending' | 'auto_graded' | 'manually_graded';
export type QuestionType = 'mcq' | 'essay';
export type TxnType = 'topup' | 'purchase' | 'refund' | 'reward';
export type PaymentMethod = 'fawry' | 'code' | 'admin';
export type CodeStatus = 'available' | 'used' | 'expired';

// ─── Relationship helper ───────────────────────────────────────────────────────
type Rel = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

// ─── Row types ────────────────────────────────────────────────────────────────
export interface Student {
  id: string;
  phone: string;
  password_hash: string;
  full_name: string;
  parent_phone: string | null;
  grade: GradeLevel;
  governorate: string | null;
  school: string | null;
  wallet_balance: number;
  device_id_1: string | null;
  device_id_2: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export type StudentInsert = Partial<Student> & {
  phone: string;
  password_hash: string;
  full_name: string;
};
export type StudentUpdate = Partial<Student>;

export interface Admin {
  id: string;
  username: string;
  password_hash: string;
  full_name: string;
  role: 'admin' | 'grader';
  created_at: string;
}
export type AdminInsert = Omit<Admin, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type AdminUpdate = Partial<Admin>;

export interface Course {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  price: number;
  is_free: boolean;
  duration_hours: number;
  lessons_count: number;
  order_index: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}
export type CourseInsert = Omit<Course, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};
export type CourseUpdate = Partial<Course>;

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  video_duration: number | null;
  has_exam: boolean;
  has_homework: boolean;
  pdf_url: string | null;
  order_index: number;
  is_free_preview: boolean;
  created_at: string;
}
export type LessonInsert = Omit<Lesson, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type LessonUpdate = Partial<Lesson>;

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  progress_percentage: number;
  completed_lessons: number;
}
export type EnrollmentInsert = Omit<Enrollment, 'id' | 'enrolled_at'> & {
  id?: string;
  enrolled_at?: string;
};
export type EnrollmentUpdate = Partial<Enrollment>;

export interface Exam {
  id: string;
  lesson_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  total_marks: number;
  passing_marks: number;
  max_attempts: number;
  is_active: boolean;
  created_at: string;
}
export type ExamInsert = Omit<Exam, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type ExamUpdate = Partial<Exam>;

export interface QuestionOption {
  key: string;
  text: string;
}

export interface Question {
  id: string;
  exam_id: string;
  question_text: string;
  question_type: QuestionType;
  marks: number;
  branch: string | null;
  options: QuestionOption[] | null;
  correct_answer: string | null;
  explanation: string | null;
  order_index: number;
  created_at: string;
}
export type QuestionInsert = Omit<Question, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type QuestionUpdate = Partial<Question>;

export interface ExamAttempt {
  id: string;
  student_id: string;
  exam_id: string;
  started_at: string;
  submitted_at: string | null;
  score: number;
  percentage: number;
  correct_count: number;
  wrong_count: number;
  unanswered_count: number;
  status: ExamStatus;
  performance_by_branch: Record<string, { correct: number; total: number }> | null;
  created_at: string;
}
export type ExamAttemptInsert = Omit<ExamAttempt, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type ExamAttemptUpdate = Partial<ExamAttempt>;

export interface StudentAnswer {
  id: string;
  attempt_id: string;
  question_id: string;
  answer_text: string | null;
  is_correct: boolean | null;
  marks_obtained: number;
  graded_by: string | null;
  grader_feedback: string | null;
  graded_at: string | null;
  status: AnswerStatus;
  created_at: string;
}
export type StudentAnswerInsert = Omit<StudentAnswer, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type StudentAnswerUpdate = Partial<StudentAnswer>;

export interface WalletTransaction {
  id: string;
  student_id: string;
  amount: number;
  transaction_type: TxnType;
  payment_method: PaymentMethod | null;
  reference_code: string | null;
  description: string | null;
  balance_before: number | null;
  balance_after: number | null;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
}
export type WalletTransactionInsert = Omit<
  WalletTransaction,
  'id' | 'created_at'
> & { id?: string; created_at?: string };
export type WalletTransactionUpdate = Partial<WalletTransaction>;

export interface ChargeCode {
  id: string;
  code: string;
  amount: number;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_by: string | null;
  created_at: string;
}
export type ChargeCodeInsert = Omit<ChargeCode, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type ChargeCodeUpdate = Partial<ChargeCode>;

export interface ForumPost {
  id: string;
  student_id: string;
  lesson_id: string | null;
  title: string;
  content: string;
  likes_count: number;
  replies_count: number;
  is_answered: boolean;
  created_at: string;
}
export type ForumPostInsert = Omit<ForumPost, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type ForumPostUpdate = Partial<ForumPost>;

export interface ForumReply {
  id: string;
  post_id: string;
  student_id: string | null;
  admin_id: string | null;
  content: string;
  is_admin_reply: boolean;
  created_at: string;
}
export type ForumReplyInsert = Omit<ForumReply, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type ForumReplyUpdate = Partial<ForumReply>;

export interface Notification {
  id: string;
  student_id: string;
  title: string;
  message: string;
  type: string | null;
  is_read: boolean;
  link: string | null;
  created_at: string;
}
export type NotificationInsert = Omit<Notification, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type NotificationUpdate = Partial<Notification>;

export interface LiveSession {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  stream_url: string | null;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  created_at: string;
}
export type LiveSessionInsert = Omit<LiveSession, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};
export type LiveSessionUpdate = Partial<LiveSession>;

export interface VideoView {
  id: string;
  student_id: string;
  lesson_id: string;
  watched_seconds: number;
  completed: boolean;
  last_watched_at: string;
}
export type VideoViewInsert = Omit<VideoView, 'id' | 'last_watched_at'> & {
  id?: string;
  last_watched_at?: string;
};
export type VideoViewUpdate = Partial<VideoView>;

// ─── Database schema type ──────────────────────────────────────────────────────
export type Database = {
  public: {
    Tables: {
      students: {
        Row: Student;
        Insert: StudentInsert;
        Update: StudentUpdate;
        Relationships: Rel[];
      };
      admins: {
        Row: Admin;
        Insert: AdminInsert;
        Update: AdminUpdate;
        Relationships: Rel[];
      };
      courses: {
        Row: Course;
        Insert: CourseInsert;
        Update: CourseUpdate;
        Relationships: Rel[];
      };
      lessons: {
        Row: Lesson;
        Insert: LessonInsert;
        Update: LessonUpdate;
        Relationships: Rel[];
      };
      enrollments: {
        Row: Enrollment;
        Insert: EnrollmentInsert;
        Update: EnrollmentUpdate;
        Relationships: Rel[];
      };
      exams: {
        Row: Exam;
        Insert: ExamInsert;
        Update: ExamUpdate;
        Relationships: Rel[];
      };
      questions: {
        Row: Question;
        Insert: QuestionInsert;
        Update: QuestionUpdate;
        Relationships: Rel[];
      };
      exam_attempts: {
        Row: ExamAttempt;
        Insert: ExamAttemptInsert;
        Update: ExamAttemptUpdate;
        Relationships: Rel[];
      };
      student_answers: {
        Row: StudentAnswer;
        Insert: StudentAnswerInsert;
        Update: StudentAnswerUpdate;
        Relationships: Rel[];
      };
      wallet_transactions: {
        Row: WalletTransaction;
        Insert: WalletTransactionInsert;
        Update: WalletTransactionUpdate;
        Relationships: Rel[];
      };
      charge_codes: {
        Row: ChargeCode;
        Insert: ChargeCodeInsert;
        Update: ChargeCodeUpdate;
        Relationships: Rel[];
      };
      forum_posts: {
        Row: ForumPost;
        Insert: ForumPostInsert;
        Update: ForumPostUpdate;
        Relationships: Rel[];
      };
      forum_replies: {
        Row: ForumReply;
        Insert: ForumReplyInsert;
        Update: ForumReplyUpdate;
        Relationships: Rel[];
      };
      notifications: {
        Row: Notification;
        Insert: NotificationInsert;
        Update: NotificationUpdate;
        Relationships: Rel[];
      };
      live_sessions: {
        Row: LiveSession;
        Insert: LiveSessionInsert;
        Update: LiveSessionUpdate;
        Relationships: Rel[];
      };
      video_views: {
        Row: VideoView;
        Insert: VideoViewInsert;
        Update: VideoViewUpdate;
        Relationships: Rel[];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      redeem_charge_code: {
        Args: {
          p_code: string;
          p_student_id: string;
        };
        Returns: {
          amount: number;
          new_balance: number;
        }[];
      };
      enroll_in_course: {
        Args: {
          p_student_id: string;
          p_course_id: string;
        };
        Returns: {
          success: boolean;
          message: string;
        }[];
      };
    };
    Enums: {
      grade_level: GradeLevel;
      exam_status: ExamStatus;
      answer_status: AnswerStatus;
      question_type: QuestionType;
      txn_type: TxnType;
      payment_method: PaymentMethod;
      code_status: CodeStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

