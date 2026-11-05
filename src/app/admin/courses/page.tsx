"use client";

import { addFourthLesson } from "@/app/actions/add-fourth-lesson";
import { auth } from "@/lib/firebase/config";
import { ARABIC_COURSE_ID } from "@/lib/arabic-fourth-lesson";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { normalizeCourse } from "@/lib/firebase/services";
import {
  loadCourseDraft,
  saveCourseDraft,
  uploadLessonPdf,
} from "@/lib/firebase/course-builder-service";
import {
  validateCourseDraft,
  type CourseDraft,
  type BuilderLesson,
} from "@/lib/course-builder";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Plus,
  BookOpen,
  Layers,
  Video,
  FileText,
  ClipboardList,
  Save,
  Eye,
  ArrowUp,
  ArrowDown,
  Trash2,
  Loader2,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import type { FirebaseCourse, FirebaseExam } from "@/lib/firebase/types";

const newId = () => crypto.randomUUID();
function move<T>(items: T[], index: number, direction: number) {
  const next = [...items],
    target = index + direction;
  if (target < 0 || target >= next.length) return items;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
export default function CourseStudio() {
  const [courses, setCourses] = useState<FirebaseCourse[]>([]);
  const [exams, setExams] = useState<FirebaseExam[]>([]);
  const [draft, setDraft] = useState<CourseDraft | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [issues, setIssues] = useState<string[]>([]);
  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [c, e] = await Promise.all([
        getDocs(collection(db, "courses")),
        getDocs(collection(db, "exams")),
      ]);
      setCourses(c.docs.map((d) => normalizeCourse(d.id, d.data())));
      setExams(e.docs.map((d) => ({ id: d.id, ...d.data() }) as FirebaseExam));
    } catch {
      setError("تعذر تحميل الاستوديو. تحقق من الاتصال وصلاحيات الأدمن");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const target = await getDoc(doc(db, "courses", ARABIC_COURSE_ID));
          if (!active) return;
          if (target.exists()) {
            const result = await addFourthLesson(await user.getIdToken());
            if (!result.ok) throw new Error(result.message);
            if (active && result.changed) toast.success(result.message);
          }
        } catch (e) {
          if (active)
            toast.error(
              e instanceof Error
                ? `تعذر ربط الدرس الرابع: ${e.message}`
                : "تعذر ربط الدرس الرابع",
            );
        }
      }
      if (active) await refresh();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function update(patch: Partial<CourseDraft>) {
    if (draft) {
      setDraft({ ...draft, ...patch });
      setDirty(true);
      setIssues([]);
    }
  }
  function updateLesson(id: string, patch: Partial<BuilderLesson>) {
    if (draft)
      update({
        lessons: draft.lessons.map((l) =>
          l.id === id ? { ...l, ...patch } : l,
        ),
      });
  }
  function leave() {
    if (!dirty || confirm("فيه تغييرات لم تُحفظ. هل تريد الخروج بدون حفظ؟")) {
      setDraft(null);
      setDirty(false);
      setIssues([]);
    }
  }
  function create() {
    setDraft({
      id: doc(collection(db, "courses")).id,
      revision: 0,
      title: "",
      description: "",
      price: 0,
      isFree: true,
      durationHours: 0,
      thumbnailUrl: "/images/course-foundation-languages.jpg",
      modules: [],
      lessons: [],
      originalLessonIds: [],
      originalExamIds: [],
    });
    setStep(0);
    setDirty(false);
    setSaved(false);
  }
  async function edit(id: string) {
    setBusy(true);
    try {
      setDraft(await loadCourseDraft(id));
      setStep(0);
      setDirty(false);
      setSaved(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر فتح الكورس");
    } finally {
      setBusy(false);
    }
  }
  async function save(publish: boolean) {
    if (!draft) return;
    const errors = validateCourseDraft(draft, publish);
    setIssues(errors);
    if (errors.length) return;
    setBusy(true);
    try {
      await saveCourseDraft(draft, publish);
      setDraft(await loadCourseDraft(draft.id));
      setSaved(true);
      setDirty(false);
      toast.success(
        publish
          ? "اتنشر الكورس وكل محتواه بنجاح"
          : "المسودة اتحفظت على الخادم — غير ظاهرة للطلاب",
      );
      await refresh();
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "تعذر الحفظ؛ التعديلات ما زالت في الاستوديو",
      );
    } finally {
      setBusy(false);
    }
  }
  function addLesson() {
    if (!draft) return;
    update({
      lessons: [
        ...draft.lessons,
        {
          id: newId(),
          title: `درس جديد ${draft.lessons.length + 1}`,
          description: "",
          moduleId: draft.modules[0]?.id || "",
          videos: [],
          files: [],
          examIds: [],
        },
      ],
    });
  }
  if (!draft)
    return (
      <div className="space-y-6" dir="rtl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-blue-600 dark:text-cyan-400">
              مساحة المعلم / استوديو المحتوى
            </p>
            <h1 className="mt-2 text-3xl font-black">من فكرة… لكورس متكامل.</h1>
            <p className="mt-2 text-sm text-muted">
              ابنِ الكورس، رتّب الوحدات، وأضف كل محتوى الدرس من مكان واحد.
            </p>
          </div>
          <Button disabled={busy} onClick={create}>
            <Plus className="h-4 w-4" />
            كورس جديد من الصفر
          </Button>
        </header>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            [BookOpen, "١. بيانات الكورس"],
            [Layers, "٢. الوحدات والدروس"],
            [Eye, "٣. المعاينة والنشر"],
          ].map(([Icon, label]) => {
            const I = Icon as typeof BookOpen;
            return (
              <Card key={String(label)}>
                <CardContent className="flex items-center gap-3 p-5">
                  <I className="h-6 w-6 text-blue-500" />
                  <strong className="text-sm">{String(label)}</strong>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Input
          aria-label="البحث عن كورس"
          placeholder="ابحث عن كورس لتعديله…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {loading ? (
          <p className="p-10 text-center">جاري تحميل الكورسات…</p>
        ) : error ? (
          <Card>
            <CardContent className="p-6">
              <p role="alert">{error}</p>
              <Button onClick={refresh} className="mt-4">
                حاول مرة أخرى
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses
              .filter((c) => c.title.includes(search))
              .map((c) => (
                <Card key={c.id}>
                  <CardContent className="space-y-4 p-6">
                    <div className="flex justify-between gap-3">
                      <BookOpen className="h-8 w-8 text-blue-500" />
                      <span className="text-xs font-bold text-muted">
                        {c.isPublished ? "منشور" : "مسودة مخفية"}
                      </span>
                    </div>
                    <h2 className="font-black text-lg">{c.title}</h2>
                    <p className="text-sm text-muted">
                      {c.lessonsCount || 0} دروس ·{" "}
                      {c.isFree ? "مجاني" : `${c.price} جنيه`}
                    </p>
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled={busy}
                      onClick={() => edit(c.id)}
                    >
                      افتح في الاستوديو
                    </Button>
                  </CardContent>
                </Card>
              ))}
            {!courses.length && (
              <p className="col-span-full rounded-3xl border border-dashed p-10 text-center">
                لسه مفيش كورسات. ابدأ بأول فكرة عندك.
              </p>
            )}
          </div>
        )}
      </div>
    );
  return (
    <div dir="rtl" className="space-y-6 pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button variant="ghost" disabled={busy} onClick={leave}>
            <ArrowRight className="h-4 w-4" />
            كل الكورسات
          </Button>
          <h1 className="mt-2 text-2xl font-black">
            {draft.title || "كورس جديد"}{" "}
            <span className="text-xs font-normal text-muted">
              {dirty
                ? "تغييرات غير محفوظة"
                : saved
                  ? "محفوظ على الخادم"
                  : "ابدأ بإضافة التفاصيل"}
            </span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={busy} onClick={() => save(false)}>
            <Save className="h-4 w-4" />
            حفظ مسودة وإخفاء الكورس
          </Button>
          <Button disabled={busy} onClick={() => setStep(2)}>
            <Eye className="h-4 w-4" />
            معاينة
          </Button>
        </div>
      </header>
      <nav className="grid grid-cols-3 gap-2" aria-label="خطوات بناء الكورس">
        {["بيانات الكورس", "الوحدات والدروس", "المراجعة والنشر"].map(
          (label, i) => (
            <button
              disabled={busy}
              key={label}
              onClick={() => setStep(i)}
              aria-current={step === i ? "step" : undefined}
              className={`rounded-2xl border p-4 text-sm font-bold ${step === i ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-cyan-300" : "border-slate-200 theme-panel bg-white dark:bg-slate-900 text-muted dark:border-slate-700 dark:bg-slate-900"}`}
            >
              {i + 1}. {label}
            </button>
          ),
        )}
      </nav>
      {issues.length > 0 && (
        <div
          role="alert"
          className="rounded-2xl border border-red-400 bg-red-50 p-5 text-red-800 dark:bg-red-500/10 dark:text-red-300"
        >
          <strong>راجع النقاط دي قبل الحفظ:</strong>
          <ul className="mt-2 list-disc pr-5">
            {issues.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}
      <fieldset
        disabled={busy}
        className="min-w-0 space-y-5 disabled:opacity-60"
      >
        {step === 0 && (
          <Card>
            <CardContent className="grid gap-5 p-6 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-bold">
                اسم الكورس
                <Input
                  value={draft.title}
                  onChange={(e) => update({ title: e.target.value })}
                  placeholder="مثال: التأسيس الشامل"
                />
              </label>
              <label className="space-y-2 text-sm font-bold">
                مدة الشرح بالساعات
                <Input
                  min={0}
                  type="number"
                  value={draft.durationHours}
                  onChange={(e) =>
                    update({ durationHours: Number(e.target.value) })
                  }
                />
              </label>
              <label className="sm:col-span-2 space-y-2 text-sm font-bold">
                وصف الكورس
                <Textarea
                  value={draft.description}
                  onChange={(e) => update({ description: e.target.value })}
                  placeholder="لمن الكورس؟ والطالب هيتعلم إيه؟"
                />
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={draft.isFree}
                  onChange={(e) =>
                    update({
                      isFree: e.target.checked,
                      price: e.target.checked ? 0 : draft.price,
                    })
                  }
                />
                كورس مجاني
              </label>
              <label className="space-y-2 text-sm font-bold">
                سعر الاشتراك للباقة كاملة (جنيه)
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  disabled={draft.isFree}
                  value={draft.price}
                  onChange={(e) => update({ price: Number(e.target.value) })}
                />
              </label>
              <label className="sm:col-span-2 space-y-2 text-sm font-bold">
                رابط صورة الغلاف
                <Input
                  dir="ltr"
                  value={draft.thumbnailUrl}
                  onChange={(e) => update({ thumbnailUrl: e.target.value })}
                />
              </label>
              <p className="text-sm text-muted sm:col-span-2">
                حفظ المسودة يجعل الكورس غير ظاهر للطلاب. نشره يتم من خطوة
                المراجعة فقط.
              </p>
            </CardContent>
          </Card>
        )}
        {step === 1 && (
          <>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-black flex items-center gap-2">
                    <Layers className="h-5 w-5 text-blue-500" />
                    وحدات الكورس{" "}
                    <span className="text-xs font-normal text-muted">
                      اختياري
                    </span>
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() =>
                      update({
                        modules: [
                          ...draft.modules,
                          {
                            id: newId(),
                            title: `الوحدة ${draft.modules.length + 1}`,
                          },
                        ],
                      })
                    }
                  >
                    <Plus className="h-4 w-4" />
                    وحدة
                  </Button>
                </div>
                {draft.modules.map((m, i) => (
                  <div className="flex items-center gap-2" key={m.id}>
                    <Input
                      aria-label={`اسم الوحدة ${i + 1}`}
                      value={m.title}
                      onChange={(e) =>
                        update({
                          modules: draft.modules.map((x) =>
                            x.id === m.id ? { ...x, title: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="رفع الوحدة"
                      disabled={!i}
                      onClick={() =>
                        update({ modules: move(draft.modules, i, -1) })
                      }
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="خفض الوحدة"
                      disabled={i === draft.modules.length - 1}
                      onClick={() =>
                        update({ modules: move(draft.modules, i, 1) })
                      }
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="حذف الوحدة"
                      onClick={() => {
                        if (draft.lessons.some((l) => l.moduleId === m.id)) {
                          toast.error("انقل دروس الوحدة لوحدة أخرى قبل حذفها");
                          return;
                        }
                        update({
                          modules: draft.modules.filter((x) => x.id !== m.id),
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
            <div className="flex items-center justify-between">
              <h2 className="font-black text-xl">الدروس ومحتواها</h2>
              <Button onClick={addLesson}>
                <Plus className="h-4 w-4" />
                إضافة درس
              </Button>
            </div>
            {!draft.lessons.length && (
              <div className="rounded-3xl border border-dashed p-10 text-center text-muted">
                ابدأ بدرس واحد؛ تقدر تضيف فيديوهات وملفات وامتحانات متعددة جواه.
              </div>
            )}
            {draft.lessons.map((lesson, index) => (
              <Card key={lesson.id} className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 theme-panel bg-slate-50 dark:bg-slate-900 px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
                  <strong>
                    الدرس {index + 1} · {lesson.title}
                  </strong>
                  <div className="flex gap-1">
                    <Button
                      aria-label="رفع الدرس"
                      size="icon"
                      variant="ghost"
                      disabled={!index}
                      onClick={() =>
                        update({ lessons: move(draft.lessons, index, -1) })
                      }
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      aria-label="خفض الدرس"
                      size="icon"
                      variant="ghost"
                      disabled={index === draft.lessons.length - 1}
                      onClick={() =>
                        update({ lessons: move(draft.lessons, index, 1) })
                      }
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      aria-label="إزالة الدرس"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (
                          confirm(
                            "إزالة الدرس تخفيه وامتحاناته عند الحفظ، دون حذف نتائج الطلاب. هل تريد المتابعة؟",
                          )
                        )
                          update({
                            lessons: draft.lessons.filter(
                              (l) => l.id !== lesson.id,
                            ),
                          });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-6 space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-bold space-y-2">
                      عنوان الدرس
                      <Input
                        value={lesson.title}
                        onChange={(e) =>
                          updateLesson(lesson.id, { title: e.target.value })
                        }
                      />
                    </label>
                    <label className="text-sm font-bold space-y-2">
                      داخل وحدة
                      <select
                        className="studio-select"
                        value={lesson.moduleId}
                        onChange={(e) =>
                          updateLesson(lesson.id, { moduleId: e.target.value })
                        }
                      >
                        <option value="">بدون وحدة</option>
                        {draft.modules.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="sm:col-span-2 text-sm font-bold space-y-2">
                      وصف مختصر
                      <Textarea
                        value={lesson.description}
                        onChange={(e) =>
                          updateLesson(lesson.id, {
                            description: e.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold flex items-center gap-2">
                        <Video className="h-5 w-5 text-blue-500" />
                        فيديوهات الدرس ({lesson.videos.length})
                      </h3>
                      <Button
                        variant="outline"
                        onClick={() =>
                          updateLesson(lesson.id, {
                            videos: [
                              ...lesson.videos,
                              {
                                id: newId(),
                                title: `الفيديو ${lesson.videos.length + 1}`,
                                url: "",
                              },
                            ],
                          })
                        }
                      >
                        + فيديو
                      </Button>
                    </div>
                    {lesson.videos.map((v, i) => (
                      <div
                        key={v.id}
                        className="grid gap-2 rounded-2xl border border-slate-200 p-3 dark:border-slate-700 sm:grid-cols-[1fr_2fr_auto]"
                      >
                        <Input
                          aria-label="عنوان الفيديو"
                          value={v.title}
                          onChange={(e) =>
                            updateLesson(lesson.id, {
                              videos: lesson.videos.map((x) =>
                                x.id === v.id
                                  ? { ...x, title: e.target.value }
                                  : x,
                              ),
                            })
                          }
                        />
                        <Input
                          aria-label="رابط الفيديو"
                          dir="ltr"
                          placeholder="https://youtube.com/watch?v=…"
                          value={v.url}
                          onChange={(e) =>
                            updateLesson(lesson.id, {
                              videos: lesson.videos.map((x) =>
                                x.id === v.id
                                  ? { ...x, url: e.target.value }
                                  : x,
                              ),
                            })
                          }
                        />
                        <div className="flex">
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="رفع الفيديو"
                            disabled={!i}
                            onClick={() =>
                              updateLesson(lesson.id, {
                                videos: move(lesson.videos, i, -1),
                              })
                            }
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label="حذف الفيديو"
                            onClick={() =>
                              updateLesson(lesson.id, {
                                videos: lesson.videos.filter(
                                  (x) => x.id !== v.id,
                                ),
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </section>
                  <section className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-bold flex items-center gap-2">
                        <FileText className="h-5 w-5 text-teal-500" />
                        ملفات PDF ({lesson.files.length})
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() =>
                            updateLesson(lesson.id, {
                              files: [
                                ...lesson.files,
                                {
                                  id: newId(),
                                  title: "مذكرة الدرس",
                                  url: "",
                                  locked: false,
                                },
                              ],
                            })
                          }
                        >
                          + رابط ملف
                        </Button>
                        <label className="cursor-pointer rounded-xl border border-blue-200 px-4 py-2 text-sm font-bold text-blue-600 dark:text-cyan-300">
                          رفع PDF
                          <input
                            type="file"
                            accept="application/pdf"
                            className="sr-only"
                            disabled={busy}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setBusy(true);
                              try {
                                const url = await uploadLessonPdf(
                                  draft.id,
                                  file,
                                );
                                updateLesson(lesson.id, {
                                  files: [
                                    ...lesson.files,
                                    {
                                      id: newId(),
                                      title: file.name.replace(/\.pdf$/i, ""),
                                      url,
                                      locked: false,
                                    },
                                  ],
                                });
                                toast.success(
                                  "تم رفع الملف؛ احفظ الكورس لربطه بالدرس",
                                );
                              } catch (e) {
                                toast.error(
                                  e instanceof Error
                                    ? e.message
                                    : "فشل رفع الملف",
                                );
                              } finally {
                                setBusy(false);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                    {lesson.files.map((f, i) => (
                      <div
                        key={f.id}
                        className="space-y-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700"
                      >
                        <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                          <Input
                            aria-label="عنوان ملف PDF"
                            value={f.title}
                            onChange={(e) =>
                              updateLesson(lesson.id, {
                                files: lesson.files.map((x) =>
                                  x.id === f.id
                                    ? { ...x, title: e.target.value }
                                    : x,
                                ),
                              })
                            }
                          />
                          <Input
                            aria-label="رابط ملف PDF"
                            dir="ltr"
                            value={f.url}
                            onChange={(e) =>
                              updateLesson(lesson.id, {
                                files: lesson.files.map((x) =>
                                  x.id === f.id
                                    ? { ...x, url: e.target.value }
                                    : x,
                                ),
                              })
                            }
                          />
                          <div className="flex">
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="رفع الملف"
                              disabled={!i}
                              onClick={() =>
                                updateLesson(lesson.id, {
                                  files: move(lesson.files, i, -1),
                                })
                              }
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label="حذف الملف"
                              onClick={() =>
                                updateLesson(lesson.id, {
                                  files: lesson.files.filter(
                                    (x) => x.id !== f.id,
                                  ),
                                })
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <label className="text-xs flex gap-2 items-center">
                          <input
                            type="checkbox"
                            checked={!!f.locked}
                            onChange={(e) =>
                              updateLesson(lesson.id, {
                                files: lesson.files.map((x) =>
                                  x.id === f.id
                                    ? { ...x, locked: e.target.checked }
                                    : x,
                                ),
                              })
                            }
                          />
                          يفتح بعد اجتياز كل امتحانات الدرس
                        </label>
                      </div>
                    ))}
                  </section>
                  <section className="space-y-3 border-t border-slate-200 pt-5 dark:border-slate-700">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-bold flex gap-2">
                        <ClipboardList className="h-5 w-5 text-purple-500" />
                        امتحانات الدرس ({lesson.examIds.length})
                      </h3>
                      {saved && !dirty ? (
                        <Link
                          href={`/admin/exams/create?courseId=${draft.id}&lessonId=${lesson.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-bold text-blue-600 dark:text-cyan-300"
                        >
                          إنشاء امتحان لهذا الدرس ↗
                        </Link>
                      ) : (
                        <span className="text-xs text-muted">
                          احفظ المسودة أولاً لإنشاء امتحان مرتبط
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted">
                      يمكن ربط أكثر من امتحان. بعد إنشاء امتحان في تبويب آخر
                      اضغط «تحديث الامتحانات».
                    </p>
                    {lesson.examIds.map((id) => (
                      <div
                        className="flex justify-between items-center rounded-xl bg-slate-50 p-3 dark:bg-slate-800"
                        key={id}
                      >
                        <span className="text-sm">
                          {exams.find((e) => e.id === id)?.title ||
                            "امتحان مرتبط"}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateLesson(lesson.id, {
                              examIds: lesson.examIds.filter((x) => x !== id),
                            })
                          }
                        >
                          إخفاء من الدرس
                        </Button>
                      </div>
                    ))}
                    <select
                      aria-label="ربط امتحان موجود"
                      className="studio-select"
                      value=""
                      onChange={(e) => {
                        if (e.target.value)
                          updateLesson(lesson.id, {
                            examIds: [...lesson.examIds, e.target.value],
                          });
                      }}
                    >
                      <option value="">+ ربط امتحان موجود</option>
                      {exams
                        .filter(
                          (e) =>
                            (!e.courseId || e.courseId === draft.id) &&
                            !draft.lessons.some((l) =>
                              l.examIds.includes(e.id),
                            ),
                        )
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.title}
                          </option>
                        ))}
                    </select>
                  </section>
                </CardContent>
              </Card>
            ))}
            <Button
              variant="outline"
              onClick={async () => {
                setBusy(true);
                try {
                  const snap = await getDocs(collection(db, "exams"));
                  const list = snap.docs.map(
                    (d) => ({ id: d.id, ...d.data() }) as FirebaseExam,
                  );
                  setExams(list);
                  update({
                    lessons: draft.lessons.map((l) => ({
                      ...l,
                      examIds: [
                        ...new Set([
                          ...l.examIds,
                          ...list
                            .filter(
                              (e) =>
                                e.lessonId === l.id && e.isActive !== false,
                            )
                            .map((e) => e.id),
                        ]),
                      ],
                    })),
                  });
                  toast.success("اتحدثت قائمة الامتحانات؛ احفظ الربط");
                } catch {
                  toast.error("تعذر تحديث الامتحانات. راجع الاتصال والصلاحيات");
                } finally {
                  setBusy(false);
                }
              }}
            >
              تحديث الامتحانات
            </Button>
          </>
        )}
        {step === 2 && (
          <div className="space-y-5">
            <Card>
              <CardContent className="p-7 space-y-4">
                <p className="text-sm font-bold text-blue-600 dark:text-cyan-300">
                  معاينة قبل النشر — لا تظهر للطلاب بعد
                </p>
                <h2 className="text-3xl font-black">
                  {draft.title || "اسم الكورس"}
                </h2>
                <p className="text-muted leading-8 whitespace-pre-wrap">
                  {draft.description}
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <strong>
                    {draft.isFree ? "مجاني" : `${draft.price} جنيه`}
                  </strong>
                  <span>· {draft.modules.length} وحدات</span>
                  <span>· {draft.lessons.length} دروس</span>
                  <span>
                    · {draft.lessons.reduce((s, l) => s + l.videos.length, 0)}{" "}
                    فيديو
                  </span>
                  <span>
                    · {draft.lessons.reduce((s, l) => s + l.files.length, 0)}{" "}
                    ملفات
                  </span>
                </div>
              </CardContent>
            </Card>
            {draft.lessons.map((l, i) => (
              <Card key={l.id}>
                <CardContent className="p-6 space-y-2">
                  <p className="text-xs text-blue-600 dark:text-cyan-300">
                    {draft.modules.find((m) => m.id === l.moduleId)?.title ||
                      "محتوى الكورس"}
                  </p>
                  <h3 className="font-black">
                    {i + 1}. {l.title}
                  </h3>
                  <p className="text-sm text-muted">
                    {l.videos.length} فيديو · {l.files.length} PDF ·{" "}
                    {l.examIds.length} امتحان
                  </p>
                  <ul className="text-sm text-muted space-y-1">
                    {[...l.videos, ...l.files].map((r) => (
                      <li key={r.id}>• {r.title}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
            <p className="text-sm text-muted">
              الطلاب لا يرون مسوداتك. الحذف من المحرر يخفي المحتوى القديم ويحافظ
              على النتائج السابقة.
            </p>
          </div>
        )}
      </fieldset>
      <footer className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 theme-panel bg-white/95 dark:bg-slate-900/95 p-4 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <span className="text-xs text-muted">
          {busy
            ? "جاري الحفظ…"
            : dirty
              ? "احفظ تغييراتك قبل المغادرة"
              : "الاستوديو جاهز"}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={busy || step === 0}
            onClick={() => setStep(step - 1)}
          >
            السابق
          </Button>
          {step < 2 ? (
            <Button disabled={busy} onClick={() => setStep(step + 1)}>
              الخطوة التالية
            </Button>
          ) : (
            <Button disabled={busy} onClick={() => save(true)}>
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              حفظ ونشر الكورس
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
