'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getLessonById, getExamByLesson, getStudentPassedExams } from '@/lib/firebase/services';
import type { FirebaseLesson, FirebaseExam } from '@/lib/firebase/types';
import { Skeleton } from '@/components/ui/skeleton';
import { SecureVideoPlayer } from '@/components/course/secure-video-player';
import {
  PlayCircle,
  FileText,
  ClipboardList,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
  ArrowRight,
  Eye,
  Download,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LessonDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [lesson, setLesson] = useState<FirebaseLesson | null>(null);
  const [exam, setExam] = useState<FirebaseExam | null>(null);
  const [passedExams, setPassedExams] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [activeVideoPart, setActiveVideoPart] = useState(1);

  useEffect(() => {
    async function load() {
      try {
        const l = await getLessonById(id);
        setLesson(l);
        const ex = await getExamByLesson(id);
        setExam(ex);
        const passed = await getStudentPassedExams('current-student');
        setPassedExams(passed);
      } catch (err) {
        console.error('Failed to load lesson', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-6" dir="rtl">
        <Skeleton className="h-96 w-full rounded-3xl bg-slate-800/40" />
        <Skeleton className="h-48 w-full rounded-3xl bg-slate-800/40" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="py-20 text-center text-slate-400" dir="rtl">
        <p className="text-lg font-bold">المحاضرة غير موجودة أو تم حذفها.</p>
        <Link href="/courses" className="mt-4 inline-block text-blue-400 font-bold hover:underline">
          العودة للكورسات
        </Link>
      </div>
    );
  }

  const examId = exam?.id || `exam-${lesson.id}`;
  const isExamPassed = passedExams.has(examId);
  const isPdfLocked = lesson.isPdfLocked && !isExamPassed;

  return (
    <div className="space-y-8" dir="rtl">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 mb-1">
            <Link href={`/course/${lesson.courseId}`} className="hover:underline flex items-center gap-1">
              <ArrowRight className="h-3.5 w-3.5" /> الرجوع للكورس
            </Link>
            <span>•</span>
            <span>الدرس {lesson.orderIndex || 1}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            {lesson.title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {isExamPassed ? (
            <span className="flex items-center gap-1.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/30 px-3.5 py-1.5 text-xs font-bold text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> اجتزت امتحان هذا الدرس
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-2xl bg-amber-950/80 border border-amber-500/30 px-3.5 py-1.5 text-xs font-bold text-amber-400">
              <AlertCircle className="h-4 w-4" /> مطلوب اجتياز الامتحان لفتح التالي
            </span>
          )}
        </div>
      </div>

      {/* ── SECTION 1: أجزاء الدرس (Matching Screenshot 4) ────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-amber-400" />
            أجزاء الدرس والشرح التفاعلي
          </h2>
          <span className="text-xs text-slate-400">3 أجزاء متاحة</span>
        </div>

        {/* Video Player Box */}
        {lesson.videoUrl && (
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-black shadow-2xl">
            <SecureVideoPlayer
              src={lesson.videoUrl}
              watermarkText="منصة الأستاذ عبدالرحمن الأسيوطي • الدفعة 2026"
              embed={true}
            />
          </div>
        )}

        {/* Parts Cards (Yellow action button & Progress indicator - Screenshot 4) */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { num: 1, title: 'الجزء الأول: شرح المفاهيم التأسيسية', duration: '25 دقيقة', progress: 100 },
            { num: 2, title: 'الجزء الثاني: التطبيقات ونماذج الأسئلة', duration: '30 دقيقة', progress: 65 },
            { num: 3, title: 'الجزء الثالث: مراجعة وحل الواجب', duration: '20 دقيقة', progress: 0 }
          ].map((part) => (
            <div
              key={part.num}
              onClick={() => setActiveVideoPart(part.num)}
              className={cn(
                'cursor-pointer rounded-2xl border p-4 transition-all duration-300 flex flex-col justify-between space-y-3',
                activeVideoPart === part.num
                  ? 'border-amber-400 bg-[#0E172A] shadow-lg shadow-amber-500/10'
                  : 'border-slate-800 bg-[#0B1324] hover:border-slate-700'
              )}
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="font-bold text-amber-400">الجزء {part.num}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {part.duration}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white line-clamp-1">{part.title}</h4>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>نسبة المشاهدة</span>
                  <span className="font-bold text-white">{part.progress}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-500"
                    style={{ width: `${part.progress}%` }}
                  />
                </div>
              </div>

              {/* Yellow Button (Matching Screenshot 4) */}
              <button
                type="button"
                className="w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black py-2 text-xs shadow-md shadow-amber-400/20 transition"
              >
                {activeVideoPart === part.num ? 'قيد المشاهدة الآن ▶' : 'مشاهدة هذا الجزء'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION 2: ملفات ومرفقات الدرس (PDF) (Matching Screenshot 4) ────────── */}
      <div className="space-y-4 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-400" />
            ملفات ومرفقات الدرس
          </h2>
          <span className="text-xs text-slate-400">ملف تدريبات ومذكرة</span>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-[#0B1324] p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-400">
              <FileText className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">مذكرة وتطبيقات المحاضرة الشاملة (PDF)</h3>
                {isPdfLocked && (
                  <span className="rounded-lg bg-amber-950/80 border border-amber-600/30 px-2 py-0.5 text-[11px] font-bold text-amber-400 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> مقفول حتى اجتياز الامتحان
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                ملف PDF يحتوي على أهم الخرائط الذهنية وشرح القواعد والتدريبات الشاملة
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto shrink-0">
            {isPdfLocked ? (
              <button
                type="button"
                onClick={() => toast.error('🔒 عذراً، يجب عليك اجتياز امتحان الدرس أولاً لفتح مذكرة الـ PDF!')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-800/60 px-6 py-3 text-xs font-bold text-slate-400 cursor-not-allowed"
              >
                <Lock className="h-4 w-4" />
                ملف مقفول
              </button>
            ) : (
              <a
                href={lesson.pdfUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 px-6 py-3 text-xs font-black text-white shadow-lg shadow-cyan-600/30 transition hover:scale-105"
              >
                <Eye className="h-4 w-4" />
                شوف الملف 📄
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── SECTION 3: اختبارات الدرس (Matching Screenshot 5) ────────────────── */}
      <div className="space-y-4 pt-4 border-t border-slate-800/80 pb-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-red-500" />
            اختبارات وواجبات الدرس
          </h2>
          <span className="text-xs text-slate-400">نظام تقييم فوري وتتابع إجباري</span>
        </div>

        {/* Exam Card (Matching Screenshot 5) */}
        <div className="rounded-3xl border border-slate-800 bg-[#0B1324] p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-red-500/40 transition">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-red-600/90 px-3 py-1 text-xs font-black text-white shadow">
                اختبار إجباري
              </span>
              <h3 className="text-base sm:text-lg font-black text-white">
                {exam?.title || 'اختبار تقييم الدرس - قياس الفهم والاستيعاب'}
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              {exam?.description || 'يجب عليك اجتياز هذا الاختبار بنسبة 50% على الأقل لفتح باقي المحاضرات والملفات'}
            </p>

            {/* Exam Meta: Time, Questions, Marks (Matching Screenshot 5) */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-300 pt-2">
              <div className="flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5">
                <Clock className="h-4 w-4 text-amber-400" />
                <span>{exam?.durationMinutes || 20} دقيقة</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5">
                <ClipboardList className="h-4 w-4 text-blue-400" />
                <span>{exam?.questionsCount || 4} أسئلة</span>
              </div>

              <div className="flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span>درجة النجاح: 50%</span>
              </div>
            </div>
          </div>

          {/* Action Button: الدخول للاختبار (Red Button - Screenshot 5) */}
          <div className="w-full md:w-auto shrink-0">
            {isExamPassed ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> لقد اجتزت هذا الاختبار بنجاح
                </div>
                <Link
                  href={`/exam/${examId}`}
                  className="w-full md:w-auto rounded-2xl border border-emerald-500/40 bg-emerald-950/60 hover:bg-emerald-900/60 px-8 py-3 text-center text-xs font-black text-emerald-300 transition"
                >
                  إعادة الاختبار للتدريب
                </Link>
              </div>
            ) : (
              <Link
                href={`/exam/${examId}`}
                className="w-full md:w-auto block rounded-2xl bg-red-600 hover:bg-red-500 px-8 py-3.5 text-center text-xs font-black text-white shadow-xl shadow-red-600/30 transition hover:scale-105"
              >
                الدخول للاختبار ✍️
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
