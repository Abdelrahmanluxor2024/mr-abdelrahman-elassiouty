"use client";
import { validateImageFile } from "@/lib/image-attachments";
import { Textarea } from "@/components/ui/textarea";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createExamWithQuestions,
  newExamId,
  relocateStagedExamImages,
  uploadQuestionImage,
} from "@/lib/firebase/services";
import { removeStoredFiles } from "@/lib/uploads/storage-upload";
import type { FirebaseQuestion, QuestionOption } from "@/lib/firebase/types";
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Award,
  Sparkles,
  ArrowRight,
  Upload,
  Layers,
  FileQuestion,
  HelpCircle,
  FileSpreadsheet,
} from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { cn } from "@/lib/utils";

interface QuestionFormItem {
  id: string;
  text: string;
  type: "mcq" | "essay";
  imageFile: File | null;
  imagePreview: string | null;
  options: { key: string; text: string }[];
  correctAnswer: string;
  marks: number;
  explanation?: string;
}

export default function AdminCreateExamPage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [lessons, setLessons] = useState<
    { id: string; title: string; courseId: string }[]
  >([]);
  const [courseId, setCourseId] = useState("");
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    setCourseId(search.get("courseId") || "");
    setLessonId(search.get("lessonId") || "");
    Promise.all([
      getDocs(collection(db, "courses")),
      getDocs(collection(db, "lessons")),
    ])
      .then(([c, l]) => {
        setCourses(c.docs.map((d) => ({ id: d.id, title: d.data().title })));
        setLessons(
          l.docs
            .filter((d) => d.data().isPublished !== false)
            .map((d) => ({
              id: d.id,
              title: d.data().title,
              courseId: d.data().courseId,
            })),
        );
      })
      .catch(() => toast.error("تعذر تحميل الكورسات. أعد تحميل الصفحة"));
  }, []);

  // Exam Meta
  const [examTitle, setExamTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [passingPercentage, setPassingPercentage] = useState(50);
  const [lessonId, setLessonId] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(0);
  const [antiCheat, setAntiCheat] = useState(false);
  const [examDescription, setExamDescription] = useState("");

  // Code Import State
  const [showCodeImportModal, setShowCodeImportModal] = useState(false);
  const [codeImportText, setCodeImportText] = useState("");

  // Questions State
  const [questions, setQuestions] = useState<QuestionFormItem[]>([
    {
      id: "q-init-1",
      text: "",
      type: "mcq",
      imageFile: null,
      imagePreview: null,
      options: [
        { key: "a", text: "" },
        { key: "b", text: "" },
        { key: "c", text: "" },
        { key: "d", text: "" },
      ],
      correctAnswer: "a",
      marks: 1,
    },
  ]);

  const handleImportJsonCode = () => {
    if (!codeImportText.trim()) {
      toast.error("يرجى لصق كود الأسئلة أولاً");
      return;
    }
    try {
      const parsed = JSON.parse(codeImportText.trim());
      if (!Array.isArray(parsed) || parsed.length === 0) {
        toast.error("الكود يجب أن يكون قائمة أسئلة (JSON Array)");
        return;
      }

      const importedQuestions: QuestionFormItem[] = parsed.map(
        (item: any, idx: number) => {
          const isEssay = item.type === "essay";
          let options = [
            { key: "a", text: "" },
            { key: "b", text: "" },
            { key: "c", text: "" },
            { key: "d", text: "" },
          ];

          if (Array.isArray(item.options)) {
            options = item.options.map((opt: any, oIdx: number) => ({
              key: opt.key || ["a", "b", "c", "d"][oIdx] || `opt-${oIdx}`,
              text: typeof opt === "string" ? opt : opt.text || "",
            }));
          }

          return {
            id: `q-imported-${Date.now()}-${idx}`,
            text: item.text || item.questionText || "",
            type: isEssay ? "essay" : "mcq",
            imageFile: null,
            imagePreview: item.imageUrl || null,
            options,
            correctAnswer:
              item.correctAnswer || item.correct_answer || (isEssay ? "" : "a"),
            marks: isEssay ? 2 : 1,
            explanation: item.explanation || "",
          };
        },
      );

      setQuestions(importedQuestions);
      setShowCodeImportModal(false);
      setCodeImportText("");
      toast.success(
        `🎉 تم توليد وتضمين ${importedQuestions.length} سؤال في الامتحان بنجاح!`,
      );
    } catch (e: any) {
      console.error("JSON parse error:", e);
      toast.error("صيغة الكود غير صحيحة. يرجى التأكد من كتابة JSON صحيح.");
    }
  };

  const addQuestion = (type: "mcq" | "essay" = "mcq") => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q-${Date.now()}-${Math.random()}`,
        text: "",
        type,
        imageFile: null,
        imagePreview: null,
        options: [
          { key: "a", text: "" },
          { key: "b", text: "" },
          { key: "c", text: "" },
          { key: "d", text: "" },
        ],
        correctAnswer: "a",
        marks: 1,
      },
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      toast.error("يجب أن يحتوي الامتحان على سؤال واحد على الأقل");
      return;
    }
    setQuestions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleImageChange = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await validateImageFile(file);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "صورة غير صالحة");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === index ? { ...q, imageFile: file, imagePreview: previewUrl } : q,
      ),
    );
  };

  const handleOptionChange = (
    qIndex: number,
    optIndex: number,
    text: string,
  ) => {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        const newOptions = [...q.options];
        newOptions[optIndex].text = text;
        return { ...q, options: newOptions };
      }),
    );
  };

  const totalExamMarks = questions.reduce(
    (sum, q) => sum + (q.type === "essay" ? 2 : 1),
    0,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !Number.isSafeInteger(maxAttempts) ||
      maxAttempts < 0 ||
      maxAttempts > 1000
    ) {
      toast.error("عدد المحاولات غير صالح");
      return;
    }
    if (!examTitle.trim()) {
      toast.error("يرجى كتابة عنوان الامتحان");
      return;
    }

    if (!courseId || !lessonId) {
      toast.error("اختر الكورس والدرس الذي يتبعه الامتحان");
      return;
    }
    if (
      !Number.isFinite(durationMinutes) ||
      durationMinutes < 1 ||
      passingPercentage < 1 ||
      passingPercentage > 100 ||
      questions.some(
        (q) =>
          !Number.isFinite(q.marks) ||
          q.marks < 1 ||
          (q.type === "mcq" &&
            !q.options.some((o) => o.key === q.correctAnswer)),
      )
    ) {
      toast.error("راجع المدة ودرجات الأسئلة والإجابة الصحيحة ونسبة النجاح");
      return;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        toast.error(`يرجى كتابة نص السؤال رقم ${i + 1}`);
        return;
      }
      if (q.type === "mcq") {
        const hasEmptyOption = q.options.some((opt) => !opt.text.trim());
        if (hasEmptyOption) {
          toast.error(`يرجى ملء كافة الخيارات الأربعة للسؤال رقم ${i + 1}`);
          return;
        }
      }
    }

    setIsPending(true);
    // Every image written during this submit, so a failed publish can remove
    // exactly those and nothing else.
    const uploadedImages: string[] = [];
    let examIdForCleanup = "";
    try {
      toast.loading("جاري رفع الصور ونشر الامتحان في قاعدة بيانات Firebase...");

      // 1. Upload question images straight into questions/{examId}/.
      // The exam document does not exist yet, but its id does: uploading to a
      // hard-coded "temp-exam" folder meant the saved question pointed at a
      // folder that no rule and no reader expected.
      const examId = newExamId();
      examIdForCleanup = examId;
      const formattedQuestions: Omit<FirebaseQuestion, "id" | "examId">[] = [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        let url: string | undefined = q.imagePreview?.startsWith("https://")
          ? q.imagePreview
          : undefined;

        if (q.imageFile) {
          try {
            url = await uploadQuestionImage(q.imageFile, examId);
            uploadedImages.push(url);
          } catch (err) {
            throw new Error(
              `تعذر رفع صورة السؤال ${i + 1}: ${err instanceof Error ? err.message : "تحقق من التخزين"}`,
            );
          }
        }

        formattedQuestions.push({
          questionText: q.text,
          questionType: q.type,
          imageUrl: url,
          marks: q.type === "essay" ? 2 : 1,
          explanation: q.explanation || "",
          options: q.type === "mcq" ? q.options : [],
          correctAnswer: q.correctAnswer,
          orderIndex: i + 1,
        });
      }

      // 2. Move any image staged for another exam id into this exam's folder.
      const { questions: finalQuestions, moved } = await relocateStagedExamImages(
        formattedQuestions,
        examId,
      );
      uploadedImages.push(...moved);

      // 3. Publish the exam and its questions with the same exam id.
      await createExamWithQuestions(
        {
          lessonId,
          courseId,
          title: examTitle,
          description: examDescription,
          durationMinutes,
          totalMarks: totalExamMarks,
          passingMarks: Math.ceil((totalExamMarks * passingPercentage) / 100),
          maxAttempts,
          antiCheat,
          questionsCount: questions.length,
          isActive: true,
        },
        finalQuestions,
        examId,
      );

      toast.dismiss();
      toast.success("🎉 تم نشر الامتحان وبنك الأسئلة في Firebase بنجاح!");
      router.push("/admin/exams");
    } catch (err: any) {
      toast.dismiss();
      // Nothing was published, so these images are unreferenced: remove them.
      if (examIdForCleanup)
        await removeStoredFiles(
          "exam-question",
          { examId: examIdForCleanup },
          uploadedImages,
        );
      toast.error(err.message || "حدث خطأ أثناء نشر الامتحان");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div
      className="space-y-8 max-w-4xl mx-auto rounded-3xl theme-panel bg-slate-50 dark:bg-[#070B14] p-4 sm:p-6 text-ink"
      dir="rtl"
    >
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 mb-1">
            <Link
              href="/admin/exams"
              className="hover:underline flex items-center gap-1"
            >
              <ArrowRight className="h-3.5 w-3.5" /> لوحة تحكم الامتحانات
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-ink flex items-center gap-2">
            <span>📝</span> بناء وإنشاء امتحان تفاعلي جديد
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            إضافة الأسئلة وصور التوضيح والخيارات مع الحفظ المباشر في Firebase
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-2xl theme-panel bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 px-4 py-2 text-center">
            <div className="text-xs text-muted">مجموع الدرجات</div>
            <div className="text-lg font-black text-amber-400">
              {totalExamMarks} درجات
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-blue-500/30 bg-blue-500/5 p-6 space-y-4">
        <h2 className="font-bold">أين يظهر الامتحان؟</h2>
        <p className="text-sm text-muted">
          اختر الكورس ثم الدرس. سيظهر الامتحان في صفحة الكورس وتحت فيديو الدرس
          تلقائياً.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            الكورس
            <select
              aria-label="الكورس"
              className="w-full rounded-xl border p-3 theme-panel bg-white dark:bg-slate-900 text-ink"
              value={courseId}
              onChange={(e) => {
                setCourseId(e.target.value);
                setLessonId("");
              }}
            >
              <option value="">اختر الكورس</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            الدرس
            <select
              aria-label="الدرس"
              disabled={!courseId}
              className="w-full rounded-xl border p-3 theme-panel bg-white dark:bg-slate-900 text-ink"
              value={lessonId}
              onChange={(e) => setLessonId(e.target.value)}
            >
              <option value="">اختر الدرس</option>
              {lessons
                .filter((l) => l.courseId === courseId)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
            </select>
          </label>
        </div>
        {courseId && !lessons.some((l) => l.courseId === courseId) && (
          <Link href="/admin/courses" className="text-blue-400 underline">
            أضف درساً لهذا الكورس أولاً من إدارة الكورسات
          </Link>
        )}
      </section>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="rounded-2xl border p-4 space-y-3">
          <label className="block">
            عدد المحاولات (٠ = غير محدود)
            <input
              className="mx-3 w-24 rounded border bg-transparent p-2"
              type="number"
              min="0"
              max="1000"
              value={maxAttempts}
              onChange={(e) =>
                setMaxAttempts(Math.max(0, Math.floor(Number(e.target.value))))
              }
            />
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={antiCheat}
              onChange={(e) => setAntiCheat(e.target.checked)}
            />
            تفعيل قيود تقليل الغش ومغادرة التبويب
          </label>
        </div>
        {/* ── Exam Metadata Card ────────────────────────────── */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 theme-panel bg-white dark:bg-[#0B1324] p-6 shadow-xl space-y-5">
          <h2 className="text-base font-black text-ink flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            بيانات الامتحان الأساسية
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-muted">
                اسم الامتحان *
              </label>
              <input
                type="text"
                required
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="مثال: امتحان الحصة الأولى - همزة الوصل والقطع والمشتقات"
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 theme-panel bg-slate-50 dark:bg-[#070B14] px-4 py-3 text-sm text-ink placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted">
                مدة الامتحان (بالدقائق) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  max="180"
                  required
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 theme-panel bg-slate-50 dark:bg-[#070B14] px-4 py-3 text-sm text-ink focus:border-blue-500 focus:outline-none"
                />
                <span className="absolute left-4 top-3 text-xs text-muted">
                  دقيقة
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted">
                نسبة النجاح المطلوبة لفتح الدرس التالي *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  max="100"
                  required
                  value={passingPercentage}
                  onChange={(e) => setPassingPercentage(Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 theme-panel bg-slate-50 dark:bg-[#070B14] px-4 py-3 text-sm text-ink focus:border-blue-500 focus:outline-none"
                />
                <span className="absolute left-4 top-3 text-xs text-muted">
                  %
                </span>
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-muted">
                وصف وتعليمات الامتحان للطلاب
              </label>
              <textarea
                rows={2}
                value={examDescription}
                onChange={(e) => setExamDescription(e.target.value)}
                placeholder="تعليمات الامتحان (تنبيه: الخروج من الشاشة أو فتح نافذة جديدة يسلم الامتحان تلقائياً)"
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 theme-panel bg-slate-50 dark:bg-[#070B14] px-4 py-3 text-sm text-ink placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ── Questions Builder List ────────────────────────── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-ink flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-500" />
              أسئلة الامتحان ({questions.length})
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCodeImportModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 px-3.5 py-2 text-xs font-black text-black shadow-md transition"
              >
                <Sparkles className="h-4 w-4" /> لصق كود الأسئلة الذكي (JSON) ⚡
              </button>
              <button
                type="button"
                onClick={() => addQuestion("mcq")}
                className="flex items-center gap-1.5 rounded-xl theme-inverse bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-black text-ink shadow-md transition"
              >
                <Plus className="h-4 w-4" /> إضافة سؤال اختيار من متعدد (MCQ)
              </button>
              <button
                type="button"
                onClick={() => addQuestion("essay")}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 theme-panel bg-white/80 dark:bg-slate-800/80 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-ink transition"
              >
                <Plus className="h-4 w-4" /> إضافة سؤال مقالي
              </button>
            </div>
          </div>

          {/* JSON Importer Modal */}
          {showCodeImportModal && (
            <div className="rounded-3xl border-2 border-amber-500/60 bg-amber-950/20 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
                  <Sparkles className="h-5 w-5" />
                  <span>مولد الأسئلة التلقائي - الصق كود الأسئلة هنا</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCodeImportModal(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs text-muted hover:text-white"
                >
                  إلغاء ✕
                </button>
              </div>

              <p className="text-xs text-muted">
                الصق كود الأسئلة الجاهز (JSON) الذي قمت بإنشائه، وسيتم تحويله
                فوراً لأسئلة تفاعلية مع الخيارات والإجابات النموذجية:
              </p>

              <textarea
                rows={7}
                dir="ltr"
                value={codeImportText}
                onChange={(e) => setCodeImportText(e.target.value)}
                placeholder={`[
  {
    "text": "ما هو إعراب كلمة العلم؟",
    "type": "mcq",
    "marks": 2,
    "options": [
      { "key": "a", "text": "اسم إن منصوب" },
      { "key": "b", "text": "خبر إن مرفوع" }
    ],
    "correctAnswer": "a"
  },
  {
    "text": "اشرح الفارق بين لا النافية للجنس ولا النافية للفعل؟",
    "type": "essay",
    "marks": 5,
    "correctAnswer": "إجابة نموذجية..."
  }
]`}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 theme-inverse bg-black/90 p-4 font-mono text-xs text-emerald-400 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
              />

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted">
                  يدعم أسئلة الاختيار من متعدد والأسئلة المقالية تلقائياً.
                </span>
                <button
                  type="button"
                  onClick={handleImportJsonCode}
                  className="rounded-xl bg-amber-400 hover:bg-amber-300 px-6 py-2.5 text-xs font-black text-black shadow-lg shadow-amber-400/20 transition"
                >
                  توليد ووضع الأسئلة في الامتحان 🚀
                </button>
              </div>
            </div>
          )}

          {questions.map((q, qIndex) => (
            <div
              key={q.id}
              className="rounded-3xl border border-slate-200 dark:border-slate-800 theme-panel bg-white dark:bg-[#0B1324] p-6 shadow-xl space-y-5 relative"
            >
              {/* Question Header & Delete */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-xl theme-inverse bg-blue-600 text-xs font-black text-ink">
                    {qIndex + 1}
                  </span>
                  <span className="text-sm font-black text-ink">
                    {q.type === "mcq"
                      ? "سؤال اختيار من متعدد (MCQ)"
                      : "سؤال مقالي (كتابة وإجابة تفصيلية)"}
                  </span>
                </div>

                <label className="block text-sm">
                  شرح الإجابة (يظهر بعد التسليم)
                  <Textarea
                    value={q.explanation || ""}
                    onChange={(e) =>
                      setQuestions((prev) =>
                        prev.map((item, idx) =>
                          idx === qIndex
                            ? { ...item, explanation: e.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <span>الدرجة:</span>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={q.type === "essay" ? 2 : 1}
                      readOnly
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setQuestions((prev) =>
                          prev.map((item, idx) =>
                            idx === qIndex ? { ...item, marks: val } : item,
                          ),
                        );
                      }}
                      className="w-14 rounded-xl border border-slate-200 dark:border-slate-800 theme-panel bg-slate-50 dark:bg-[#070B14] px-2 py-1 text-center text-xs text-ink"
                    />
                  </div>

                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(qIndex)}
                      className="rounded-xl p-1.5 text-red-400 hover:bg-red-950/50 hover:text-red-300 transition"
                      title="حذف السؤال"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted">
                  نص السؤال *
                </label>
                <textarea
                  rows={2}
                  required
                  value={q.text}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuestions((prev) =>
                      prev.map((item, idx) =>
                        idx === qIndex ? { ...item, text: val } : item,
                      ),
                    );
                  }}
                  placeholder="اكتب صيغة السؤال هنا..."
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 theme-panel bg-slate-50 dark:bg-[#070B14] px-4 py-3 text-sm text-ink placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Upload Image Section */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-cyan-400" />
                  صورة توضيحية للسؤال (اختياري)
                </label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 theme-panel bg-slate-50 dark:bg-[#070B14] hover:border-blue-500 px-4 py-2.5 text-xs font-bold text-muted flex items-center gap-2 transition">
                    <Upload className="h-4 w-4 text-blue-400" />
                    اختر صورة من جهازك
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => handleImageChange(qIndex, e)}
                    />
                  </label>

                  {q.imagePreview && (
                    <div className="relative h-14 w-24 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={q.imagePreview}
                        alt="معاينة"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* MCQ Options with Radio Select for Correct Answer */}
              {q.type === "mcq" ? (
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-muted">
                    الخيارات الأربعة (حدد علامة الاختيار أمام الإجابة الصحيحة) *
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {q.options.map((opt, optIndex) => {
                      const letters = ["أ", "ب", "ج", "د"];
                      const isCorrect = q.correctAnswer === opt.key;

                      return (
                        <div
                          key={opt.key}
                          className={cn(
                            "flex items-center gap-3 rounded-2xl border p-2.5 transition",
                            isCorrect
                              ? "border-emerald-500 bg-emerald-950/30"
                              : "border-slate-200 dark:border-slate-800 theme-panel bg-slate-50 dark:bg-[#070B14]",
                          )}
                        >
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={isCorrect}
                            onChange={() => {
                              setQuestions((prev) =>
                                prev.map((item, idx) =>
                                  idx === qIndex
                                    ? { ...item, correctAnswer: opt.key }
                                    : item,
                                ),
                              );
                            }}
                            className="h-4 w-4 text-emerald-500 focus:ring-0 cursor-pointer"
                          />
                          <span
                            className={cn(
                              "grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-black",
                              isCorrect
                                ? "theme-inverse bg-emerald-600 text-ink"
                                : "theme-panel bg-white dark:bg-slate-800 text-muted",
                            )}
                          >
                            {letters[optIndex]}
                          </span>
                          <input
                            type="text"
                            required
                            value={opt.text}
                            onChange={(e) =>
                              handleOptionChange(
                                qIndex,
                                optIndex,
                                e.target.value,
                              )
                            }
                            placeholder={`الخيار (${letters[optIndex]})`}
                            className="w-full bg-transparent text-xs text-ink placeholder:text-slate-600 focus:outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 theme-panel bg-slate-50 dark:bg-[#070B14] p-4 text-xs text-muted">
                  سيكون للطالب مساحة كتابة نصية أو رفع صورة إجابته لتصحيحها من
                  قبل المعلم.
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Submit / Publish Button ────────────────────────── */}
        <div className="sticky bottom-6 z-20 rounded-3xl border border-slate-200 dark:border-slate-700 theme-panel bg-white/90 dark:bg-[#0B1324]/90 backdrop-blur-md p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              جاهز للنشر على Firebase
            </span>
            <span>•</span>
            <span>عدد الأسئلة: {questions.length}</span>
            <span>•</span>
            <span>المدة: {durationMinutes} دقيقة</span>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full sm:w-auto rounded-2xl theme-inverse bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 px-8 py-3.5 text-xs font-black text-ink shadow-xl shadow-blue-600/30 transition hover:scale-105 disabled:opacity-50"
          >
            {isPending ? "جاري نشر الامتحان..." : "نشر الامتحان فوراً 🚀"}
          </button>
        </div>
      </form>
    </div>
  );
}
