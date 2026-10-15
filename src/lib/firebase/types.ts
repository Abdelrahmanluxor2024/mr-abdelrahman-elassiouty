export interface FirebaseUser {
  uid: string;
  phone?: string;
  fullName: string;
  role: 'student' | 'admin';
  grade?: string;
  governorate?: string;
  school?: string;
  walletBalance: number;
  avatarUrl?: string;
  createdAt: string;
}

export interface FirebaseCourse {
  id: string;
  title: string;
  description: string;
  price: number;
  isFree: boolean;
  durationHours: number;
  thumbnailUrl: string;
  isPublished: boolean;
  tag?: string;
  discountPrice?: number;
  features?: string[];
  partsCount?: number;
  lessonsCount?: number;
  homeworkCount?: number;
  createdAt: string;
}

export interface FirebaseLesson {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  videoUrl?: string;
  videoDuration?: number;
  pdfUrl?: string;
  isPdfLocked?: boolean;
  orderIndex: number;
  isFreePreview?: boolean;
  createdAt: string;
}

export interface QuestionOption {
  key: string;
  text: string;
}

export interface FirebaseQuestion {
  id: string;
  examId: string;
  questionText: string;
  questionType: 'mcq' | 'essay';
  imageUrl?: string;
  marks: number;
  options: QuestionOption[];
  correctAnswer: string;
  explanation?: string;
  orderIndex: number;
}

export interface FirebaseExam {
  id: string;
  lessonId: string;
  courseId?: string;
  title: string;
  description?: string;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number;
  maxAttempts: number;
  questionsCount?: number;
  isActive: boolean;
  createdAt: string;
}

export interface FirebaseExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  studentName?: string;
  studentPhone?: string;
  score: number;
  totalMarks: number;
  percentage: number;
  status: 'passed' | 'failed';
  answers: Record<string, string>;
  createdAt: string;
}