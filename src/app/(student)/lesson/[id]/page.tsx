"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import {
  getLessonById,
  getExamsByLesson,
  getStudentPassedExams,
  isEnrolledInCourse,
} from "@/lib/firebase/services";
import { lessonVideos, lessonFiles } from "@/lib/learning-content";
import { completeLesson } from "@/app/actions/learning";
import { useCurrentStudent } from "@/lib/firebase/use-student-auth";
import type { FirebaseLesson, FirebaseExam } from "@/lib/firebase/types";
import { SecureVideoPlayer } from "@/components/course/secure-video-player";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PlayCircle,
  FileText,
  ClipboardList,
  CheckCircle2,
  Lock,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
export default function LessonPage() {
  const { id } = useParams<{ id: string }>();
  const { student } = useCurrentStudent();
  const [lesson, setLesson] = useState<FirebaseLesson | null>(null);
  const [exams, setExams] = useState<FirebaseExam[]>([]);
  const [passed, setPassed] = useState<Set<string>>(new Set());
  const [courseId, setCourseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState("");
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progressError, setProgressError] = useState("");
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLesson(null);
      setError("");
      setCompleted(false);
      setProgressError("");
      try {
        const l = await getLessonById(id);
        if (!l || cancelled) return;
        setCourseId(l.courseId);
        if (!(await isEnrolledInCourse(student.id, l.courseId))) return;
        const list = await getExamsByLesson(id),
          p = await getStudentPassedExams(student.id);
        if (cancelled) return;
        setLesson(l);
        setExams(list);
        setPassed(p);
        setActive(lessonVideos(l)[0]?.id || "");
        await auth.authStateReady();
        if (auth.currentUser) {
          try {
            const done = await getDoc(
              doc(db, "lesson_progress", `${auth.currentUser.uid}_${id}`),
            );
            if (!cancelled) setCompleted(done.exists());
          } catch {
            if (!cancelled)
              setProgressError(
                "تعذر قراءة تقدمك المحفوظ. المحتوى متاح، لكن حفظ التقدم قد يحتاج مراجعة صلاحيات الحساب.",
              );
          }
        }
      } catch {
        if (!cancelled)
          setError("تعذر تحميل المحتوى. تحقق من الاتصال أو صلاحيات الوصول");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, student.id]);
  if (loading) return <Skeleton className="h-96 rounded-3xl" />;
  if (error)
    return (
      <div role="alert" className="p-10 text-center space-y-4">
        <p>{error}</p>
        <Button onClick={() => location.reload()}>إعادة المحاولة</Button>
      </div>
    );
  if (!lesson)
    return (
      <div className="py-16 text-center space-y-4">
        <Lock className="mx-auto h-10 w-10 text-amber-500" />
        <h1 className="text-xl font-black">
          {courseId
            ? "اشترك في الكورس لفتح هذا الدرس"
            : "الدرس غير موجود أو مخفي"}
        </h1>
        <Link
          href={courseId ? `/course/${courseId}` : "/courses"}
          className="text-blue-600 dark:text-cyan-300 underline"
        >
          الرجوع للكورس
        </Link>
      </div>
    );
  const videos = lessonVideos(lesson),
    files = lessonFiles(lesson),
    current = videos.find((v) => v.id === active) || videos[0];
  const allPassed = exams.length > 0 && exams.every((e) => passed.has(e.id));
  return (
    <div dir="rtl" className="space-y-8">
      <header className="space-y-3">
        <Link
          href={`/course/${lesson.courseId}`}
          className="inline-flex gap-2 items-center text-sm font-bold text-blue-600 dark:text-cyan-300"
        >
          <ArrowRight className="h-4 w-4" />
          العودة للكورس
        </Link>
        <p className="text-sm text-muted">
          {lesson.moduleTitle || `الدرس ${lesson.orderIndex}`}
        </p>
        {lesson.imageUrl && (
          <img
            src={lesson.imageUrl}
            alt={lesson.title}
            className="max-h-96 w-full rounded-2xl object-contain"
          />
        )}
        <h1 className="text-3xl font-black">{lesson.title}</h1>
        <p className="text-muted leading-8">{lesson.description}</p>
      </header>
      <section className="space-y-4">
        <h2 className="text-xl font-black flex gap-2 items-center">
          <PlayCircle className="text-blue-500" />
          فيديوهات الشرح{" "}
          <span className="text-sm text-muted">({videos.length})</span>
        </h2>
        {current ? (
          <>
            <SecureVideoPlayer
              key={current.id}
              src={current.url}
              watermarkText={`${student.fullName} • ${student.phone}`}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => setActive(v.id)}
                  aria-pressed={v.id === current.id}
                  className={`rounded-2xl border p-4 text-right transition ${v.id === current.id ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-cyan-300" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}
                >
                  <span className="text-xs text-muted">الفيديو {i + 1}</span>
                  <strong className="mt-2 block text-sm">{v.title}</strong>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="rounded-2xl border border-dashed p-6 text-muted">
            لم يضف المعلم فيديوهات بعد.
          </p>
        )}
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-black flex gap-2 items-center">
          <FileText className="text-teal-500" />
          مكتبة ملفات الدرس{" "}
          <span className="text-sm text-muted">({files.length})</span>
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {files.map((file) => {
            const locked = file.locked && !allPassed;
            return (
              <Card key={file.id}>
                <CardContent className="p-5 flex justify-between items-center gap-3">
                  <div>
                    <h3 className="font-bold">{file.title}</h3>
                    <p className="mt-2 text-xs text-muted">
                      {locked
                        ? exams.length
                          ? "يفتح بعد اجتياز كل امتحانات الدرس"
                          : "الملف مقفل؛ المعلم لم يضف الامتحان بعد"
                        : "ملف PDF متاح للمراجعة"}
                    </p>
                  </div>
                  {locked ? (
                    <Lock className="h-5 w-5 text-amber-500" />
                  ) : (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-xl theme-inverse bg-blue-600 text-ink px-4 py-2 text-sm font-bold"
                    >
                      فتح الملف
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {!files.length && (
            <p className="text-sm text-muted">لا توجد ملفات مرفقة بعد.</p>
          )}
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-black flex gap-2 items-center">
          <ClipboardList className="text-purple-500" />
          اختبارات الدرس{" "}
          <span className="text-sm text-muted">({exams.length})</span>
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {exams.map((exam) => (
            <Card key={exam.id}>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-bold">{exam.title}</h3>
                <p className="text-xs text-muted">
                  {exam.questionsCount} سؤال · {exam.durationMinutes} دقيقة ·
                  محاولة واحدة
                </p>
                <Link
                  className="inline-block rounded-xl theme-inverse bg-blue-600 text-ink px-4 py-2 text-sm font-bold"
                  href={`/exam/${exam.id}`}
                >
                  فتح الامتحان / المحاولة المتاحة
                </Link>
                <Link
                  href={`/exam/${exam.id}/result`}
                  className="mr-3 text-sm text-blue-600 dark:text-cyan-300 underline"
                >
                  عرض النتيجة السابقة
                </Link>
              </CardContent>
            </Card>
          ))}
          {!exams.length && (
            <p className="text-sm text-muted">
              لا توجد امتحانات منشورة لهذا الدرس بعد.
            </p>
          )}
        </div>
      </section>
      {progressError && (
        <p
          role="alert"
          className="rounded-xl border border-amber-300 p-4 text-sm text-amber-800 dark:text-amber-200"
        >
          {progressError}
        </p>
      )}
      <Card className="border-blue-300 dark:border-blue-700">
        <CardContent className="p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-black">خلصت مذاكرة الدرس؟</h2>
            <p className="mt-2 text-sm text-muted">
              سجّل إكماله لتحديث تقدمك ونشاطك. هذا تأكيد منك، وليس قياساً
              تلقائياً لمدة مشاهدة الفيديو.
            </p>
          </div>
          <Button
            disabled={saving || completed}
            onClick={async () => {
              setSaving(true);
              try {
                const result = await completeLesson(
                  id,
                  await auth.currentUser?.getIdToken(),
                );
                if (!result.ok) throw new Error(result.error);
                setCompleted(true);
                toast.success("اتسجل تقدمك على حسابك");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "تعذر الحفظ");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {completed ? "الدرس مكتمل ✓" : "أنهيت هذا الدرس"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
