'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createExamWithQuestions, uploadQuestionImage } from '@/lib/firebase/services';
import type { FirebaseQuestion, QuestionOption } from '@/lib/firebase/types';
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
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionFormItem {
  id: string;
  text: string;
  type: 'mcq' | 'essay';
  imageFile: File | null;
  imagePreview: string | null;
  options: { key: string; text: string }[];
  correctAnswer: string;
  marks: number;
}

export default function AdminCreateExamPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Exam Meta
  const [examTitle, setExamTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [passingPercentage, setPassingPercentage] = useState(50);
  const [lessonId, setLessonId] = useState('lesson-1');
  const [examDescription, setExamDescription] = useState('');

  // Questions State
  const [questions, setQuestions] = useState<QuestionFormItem[]>([
    {
      id: 'q-init-1',
      text: '',
      type: 'mcq',
      imageFile: null,
      imagePreview: null,
      options: [
        { key: 'a', text: '' },
        { key: 'b', text: '' },
        { key: 'c', text: '' },
        { key: 'd', text: '' }
      ],
      correctAnswer: 'a',
      marks: 5
    }
  ]);

  const addQuestion = (type: 'mcq' | 'essay' = 'mcq') => {
    setQuestions((prev) => [
      ...prev,
      {
        id: `q-${Date.now()}-${Math.random()}`,
        text: '',
        type,
        imageFile: null,
        imagePreview: null,
        options: [
          { key: 'a', text: '' },
          { key: 'b', text: '' },
          { key: 'c', text: '' },
          { key: 'd', text: '' }
        ],
        correctAnswer: 'a',
        marks: 5
      }
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      toast.error('يجب أن يحتوي الامتحان على سؤال واحد على الأقل');
      return;
    }
    setQuestions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === index ? { ...q, imageFile: file, imagePreview: previewUrl } : q
      )
    );
  };

  const handleOptionChange = (qIndex: number, optIndex: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qIndex) return q;
        const newOptions = [...q.options];
        newOptions[optIndex].text = text;
        return { ...q, options: newOptions };
      })
    );
  };

  const totalExamMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!examTitle.trim()) {
      toast.error('يرجى كتابة عنوان الامتحان');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        toast.error(`يرجى كتابة نص السؤال رقم ${i + 1}`);
        return;
      }
      if (q.type === 'mcq') {
        const hasEmptyOption = q.options.some((opt) => !opt.text.trim());
        if (hasEmptyOption) {
          toast.error(`يرجى ملء كافة الخيارات الأربعة للسؤال رقم ${i + 1}`);
          return;
        }
      }
    }

    startTransition(async () => {
      try {
        toast.loading('جاري رفع الصور ونشر الامتحان في قاعدة بيانات Firebase...');

        // 1. Prepare questions data & upload images if any
        const formattedQuestions: Omit<FirebaseQuestion, 'id' | 'examId'>[] = [];

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          let imageUrl: string | undefined = undefined;

          if (q.imageFile) {
            try {
              imageUrl = await uploadQuestionImage(q.imageFile, 'temp-exam');
            } catch (err) {
              console.warn('Image upload skipped or failed', err);
            }
          }

          formattedQuestions.push({
            questionText: q.text,
            questionType: q.type,
            imageUrl,
            marks: q.marks,
            options: q.type === 'mcq' ? q.options : [],
            correctAnswer: q.correctAnswer,
            orderIndex: i + 1
          });
        }

        // 2. Publish to Firestore
        await createExamWithQuestions(
          {
            lessonId,
            title: examTitle,
            description: examDescription,
            durationMinutes,
            totalMarks: totalExamMarks,
            passingMarks: Math.ceil((totalExamMarks * passingPercentage) / 100),
            maxAttempts: 2,
            questionsCount: questions.length,
            isActive: true
          },
          formattedQuestions
        );

        toast.dismiss();
        toast.success('🎉 تم نشر الامتحان وبنك الأسئلة في Firebase بنجاح!');
        router.push('/admin/exams');
      } catch (err: any) {
        toast.dismiss();
        toast.error(err.message || 'حدث خطأ أثناء نشر الامتحان');
      }
    });
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-6" dir="rtl">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 mb-1">
            <Link href="/admin/exams" className="hover:underline flex items-center gap-1">
              <ArrowRight className="h-3.5 w-3.5" /> لوحة تحكم الامتحانات
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            <span>📝</span> بناء وإنشاء امتحان تفاعلي جديد
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            إضافة الأسئلة وصور التوضيح والخيارات مع الحفظ المباشر في Firebase
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-2xl bg-[#0B1324] border border-slate-800 px-4 py-2 text-center">
            <div className="text-xs text-slate-400">مجموع الدرجات</div>
            <div className="text-lg font-black text-amber-400">{totalExamMarks} درجات</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ── Exam Metadata Card ────────────────────────────── */}
        <div className="rounded-3xl border border-slate-800 bg-[#0B1324] p-6 shadow-xl space-y-5">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            بيانات الامتحان الأساسية
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-300">اسم الامتحان *</label>
              <input
                type="text"
                required
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="مثال: امتحان الحصة الأولى - همزة الوصل والقطع والمشتقات"
                className="w-full rounded-2xl border border-slate-800 bg-[#070B14] px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">مدة الامتحان (بالدقائق) *</label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  max="180"
                  required
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-800 bg-[#070B14] px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
                <span className="absolute left-4 top-3 text-xs text-slate-500">دقيقة</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">نسبة النجاح المطلوبة لفتح الدرس التالي *</label>
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  max="100"
                  required
                  value={passingPercentage}
                  onChange={(e) => setPassingPercentage(Number(e.target.value))}
                  className="w-full rounded-2xl border border-slate-800 bg-[#070B14] px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
                <span className="absolute left-4 top-3 text-xs text-slate-500">%</span>
              </div>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-300">وصف وتعليمات الامتحان للطلاب</label>
              <textarea
                rows={2}
                value={examDescription}
                onChange={(e) => setExamDescription(e.target.value)}
                placeholder="تعليمات الامتحان (تنبيه: الخروج من الشاشة أو فتح نافذة جديدة يسلم الامتحان تلقائياً)"
                className="w-full rounded-2xl border border-slate-800 bg-[#070B14] px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* ── Questions Builder List ────────────────────────── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-500" />
              أسئلة الامتحان ({questions.length})
            </h2>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => addQuestion('mcq')}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-black text-white shadow-md transition"
              >
                <Plus className="h-4 w-4" /> إضافة سؤال اختيار من متعدد (MCQ)
              </button>
              <button
                type="button"
                onClick={() => addQuestion('essay')}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 transition"
              >
                <Plus className="h-4 w-4" /> إضافة سؤال مقالي
              </button>
            </div>
          </div>

          {questions.map((q, qIndex) => (
            <div
              key={q.id}
              className="rounded-3xl border border-slate-800 bg-[#0B1324] p-6 shadow-xl space-y-5 relative"
            >
              {/* Question Header & Delete */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-xl bg-blue-600 text-xs font-black text-white">
                    {qIndex + 1}
                  </span>
                  <span className="text-sm font-black text-white">
                    {q.type === 'mcq' ? 'سؤال اختيار من متعدد (MCQ)' : 'سؤال مقالي (كتابة وإجابة تفصيلية)'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span>الدرجة:</span>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={q.marks}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setQuestions((prev) =>
                          prev.map((item, idx) => (idx === qIndex ? { ...item, marks: val } : item))
                        );
                      }}
                      className="w-14 rounded-xl border border-slate-800 bg-[#070B14] px-2 py-1 text-center text-xs text-white"
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
                <label className="text-xs font-bold text-slate-300">نص السؤال *</label>
                <textarea
                  rows={2}
                  required
                  value={q.text}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuestions((prev) =>
                      prev.map((item, idx) => (idx === qIndex ? { ...item, text: val } : item))
                    );
                  }}
                  placeholder="اكتب صيغة السؤال هنا..."
                  className="w-full rounded-2xl border border-slate-800 bg-[#070B14] px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Upload Image Section */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-cyan-400" />
                  صورة توضيحية للسؤال (اختياري)
                </label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer rounded-2xl border border-dashed border-slate-700 bg-[#070B14] hover:border-blue-500 px-4 py-2.5 text-xs font-bold text-slate-300 flex items-center gap-2 transition">
                    <Upload className="h-4 w-4 text-blue-400" />
                    اختر صورة من جهازك
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageChange(qIndex, e)}
                    />
                  </label>

                  {q.imagePreview && (
                    <div className="relative h-14 w-24 overflow-hidden rounded-xl border border-slate-700">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={q.imagePreview} alt="معاينة" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
              </div>

              {/* MCQ Options with Radio Select for Correct Answer */}
              {q.type === 'mcq' ? (
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-slate-300">
                    الخيارات الأربعة (حدد علامة الاختيار أمام الإجابة الصحيحة) *
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {q.options.map((opt, optIndex) => {
                      const letters = ['أ', 'ب', 'ج', 'د'];
                      const isCorrect = q.correctAnswer === opt.key;

                      return (
                        <div
                          key={opt.key}
                          className={cn(
                            'flex items-center gap-3 rounded-2xl border p-2.5 transition',
                            isCorrect
                              ? 'border-emerald-500 bg-emerald-950/30'
                              : 'border-slate-800 bg-[#070B14]'
                          )}
                        >
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={isCorrect}
                            onChange={() => {
                              setQuestions((prev) =>
                                prev.map((item, idx) =>
                                  idx === qIndex ? { ...item, correctAnswer: opt.key } : item
                                )
                              );
                            }}
                            className="h-4 w-4 text-emerald-500 focus:ring-0 cursor-pointer"
                          />
                          <span
                            className={cn(
                              'grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-black',
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
                            )}
                          >
                            {letters[optIndex]}
                          </span>
                          <input
                            type="text"
                            required
                            value={opt.text}
                            onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                            placeholder={`الخيار (${letters[optIndex]})`}
                            className="w-full bg-transparent text-xs text-white placeholder:text-slate-600 focus:outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-[#070B14] p-4 text-xs text-slate-400">
                  سيكون للطالب مساحة كتابة نصية أو رفع صورة إجابته لتصحيحها من قبل المعلم.
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Submit / Publish Button ────────────────────────── */}
        <div className="sticky bottom-6 z-20 rounded-3xl border border-slate-700 bg-[#0B1324]/90 backdrop-blur-md p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-slate-300">
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
            className="w-full sm:w-auto rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 px-8 py-3.5 text-xs font-black text-white shadow-xl shadow-blue-600/30 transition hover:scale-105 disabled:opacity-50"
          >
            {isPending ? 'جاري نشر الامتحان...' : 'نشر الامتحان فوراً 🚀'}
          </button>
        </div>
      </form>
    </div>
  );
}
