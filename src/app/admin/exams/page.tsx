"use client";

import { QuestionExplanationsEditor } from "@/components/course/question-explanations-editor";
import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { FirebaseExam } from "@/lib/firebase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, ClipboardList, Search, BookOpen } from "lucide-react";

type Item = { id: string; title: string; courseId?: string };
export default function AdminExamsPage() {
  const [exams, setExams] = useState<FirebaseExam[]>([]);
  const [courses, setCourses] = useState<Item[]>([]);
  const [lessons, setLessons] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<FirebaseExam | null>(null);
  const [pending, setPending] = useState(false);
  async function load() {
    setLoading(true);
    setError(false);
    try {
      const [e, c, l] = await Promise.all(
        ["exams", "courses", "lessons"].map((name) =>
          getDocs(collection(db, name)),
        ),
      );
      setExams(e.docs.map((d) => ({ id: d.id, ...d.data() }) as FirebaseExam));
      setCourses(c.docs.map((d) => ({ id: d.id, title: d.data().title })));
      setLessons(
        l.docs.map((d) => ({
          id: d.id,
          title: d.data().title,
          courseId: d.data().courseId,
        })),
      );
    } catch {
      setError(true);
      toast.error("تعذر تحميل الامتحانات. حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function save() {
    if (!editing) return;
    if (
      !editing.courseId ||
      !lessons.some(
        (l) => l.id === editing.lessonId && l.courseId === editing.courseId,
      )
    ) {
      toast.error("اختر الكورس والدرس الصحيحين");
      return;
    }
    if (
      !Number.isSafeInteger(editing.maxAttempts ?? 0) ||
      (editing.maxAttempts ?? 0) < 0 ||
      (editing.maxAttempts ?? 0) > 1000
    ) {
      toast.error("عدد المحاولات غير صالح");
      return;
    }
    setPending(true);
    try {
      await updateDoc(doc(db, "exams", editing.id), {
        courseId: editing.courseId,
        lessonId: editing.lessonId,
        isActive: editing.isActive,
        maxAttempts: editing.maxAttempts ?? 0,
        antiCheat: editing.antiCheat === true,
      });
      toast.success("تم حفظ الربط وحالة الظهور");
      setEditing(null);
      await load();
    } catch {
      toast.error("لم يتم الحفظ. تحقق من الاتصال والصلاحيات");
    } finally {
      setPending(false);
    }
  }
  const visible = exams.filter(
    (e) =>
      e.title?.includes(search) &&
      (filter === "all" || (filter === "active" ? e.isActive : !e.courseId)),
  );
  return (
    <div className="space-y-6" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-blue-500 mb-2">
            مساحة المعلم / التقييمات
          </p>
          <h1 className="text-2xl font-black">امتحاناتك، في مكانها الصحيح</h1>
          <p className="mt-2 text-sm text-muted">
            أنشئ الامتحان، اختر الكورس والدرس، وتحكم في ظهوره للطلاب.
          </p>
        </div>
        <Link
          href="/admin/exams/create"
          className="flex items-center gap-2 rounded-2xl theme-inverse bg-blue-600 px-5 py-3 font-bold text-ink"
        >
          <Plus className="h-4 w-4" />
          إنشاء امتحان
        </Link>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["كل الامتحانات", exams.length],
          ["ظاهرة للطلاب", exams.filter((e) => e.isActive).length],
          ["تحتاج ربط بكورس", exams.filter((e) => !e.courseId).length],
        ].map(([label, count]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-sm text-muted">{label}</p>
              <p className="text-3xl font-black mt-2">{count}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {editing && (
        <Card className="border-blue-500">
          <CardContent className="p-6 space-y-4">
            <h2 className="font-black">إعدادات: {editing.title}</h2>
            <QuestionExplanationsEditor examId={editing.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                الكورس
                <select
                  className="mt-2 w-full rounded-xl border p-3 bg-white dark:bg-slate-900"
                  value={editing.courseId || ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      courseId: e.target.value,
                      lessonId: "",
                    })
                  }
                >
                  <option value="">اختر الكورس</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                الدرس
                <select
                  disabled={!editing.courseId}
                  className="mt-2 w-full rounded-xl border p-3 bg-white dark:bg-slate-900"
                  value={editing.lessonId}
                  onChange={(e) =>
                    setEditing({ ...editing, lessonId: e.target.value })
                  }
                >
                  <option value="">اختر الدرس</option>
                  {lessons
                    .filter((l) => l.courseId === editing.courseId)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.title}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editing.isActive}
                onChange={(e) =>
                  setEditing({ ...editing, isActive: e.target.checked })
                }
              />
              إظهار الامتحان في الكورس وصفحة الدرس
            </label>
            <label className="block">
              عدد المحاولات (٠ = غير محدود)
              <Input
                type="number"
                min="0"
                max="1000"
                value={editing.maxAttempts ?? 0}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    maxAttempts: Math.max(
                      0,
                      Math.floor(Number(e.target.value)),
                    ),
                  })
                }
              />
            </label>
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={editing.antiCheat === true}
                onChange={(e) =>
                  setEditing({ ...editing, antiCheat: e.target.checked })
                }
              />
              تفعيل قيود تقليل الغش
            </label>
            <p className="text-xs text-muted">
              الإخفاء يحافظ على الأسئلة ونتائج الطلاب. يمكن إظهار الامتحان
              مجدداً في أي وقت.
            </p>
            <div className="flex gap-2">
              <Button disabled={pending} onClick={save}>
                {pending ? "جاري الحفظ…" : "حفظ التغييرات"}
              </Button>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => setEditing(null)}
              >
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted" />
          <Input
            aria-label="البحث عن امتحان"
            className="pr-10"
            placeholder="ابحث باسم الامتحان…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="تصفية الامتحانات"
          className="rounded-xl border px-3 bg-white dark:bg-slate-900"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">كل الامتحانات</option>
          <option value="active">ظاهرة للطلاب</option>
          <option value="unlinked">تحتاج ربط</option>
        </select>
      </div>
      {loading ? (
        <Skeleton className="h-64 rounded-3xl" />
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p>تعذر تحميل البيانات، لا يعني هذا أن الامتحانات غير موجودة.</p>
            <Button className="mt-4" onClick={load}>
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((exam) => (
            <Card key={exam.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div className="space-y-2">
                  <h2 className="font-bold flex gap-2">
                    <ClipboardList className="h-5 w-5 text-blue-500" />
                    {exam.title}
                  </h2>
                  <p className="text-sm text-muted flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    {courses.find((c) => c.id === exam.courseId)?.title ||
                      "لم يتم اختيار كورس"}{" "}
                    /{" "}
                    {lessons.find((l) => l.id === exam.lessonId)?.title ||
                      "لم يتم اختيار درس"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {exam.durationMinutes} دقيقة
                    </Badge>
                    <Badge variant="outline">
                      {exam.questionsCount || "—"} سؤال
                    </Badge>
                    <Badge variant="outline">{exam.totalMarks} درجة</Badge>
                    <Badge variant={exam.isActive ? "success" : "warning"}>
                      {exam.isActive ? "ظاهر للطلاب" : "مخفي"}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setEditing({ ...exam })}
                >
                  إعدادات الامتحان والشرح
                </Button>
              </CardContent>
            </Card>
          ))}
          {!visible.length && (
            <div className="rounded-3xl border border-dashed p-12 text-center">
              <ClipboardList className="mx-auto h-10 w-10 text-blue-400" />
              <h2 className="mt-4 font-bold">
                {exams.length
                  ? "لا توجد نتائج مطابقة"
                  : "أول امتحان يبدأ من هنا"}
              </h2>
              <p className="mt-2 text-sm text-muted">
                أنشئ امتحاناً جديداً أو جهز الكورس التجريبي من إدارة الكورسات.
              </p>
              <Link
                href="/admin/courses"
                className="inline-block mt-4 text-blue-500 underline"
              >
                الانتقال لإدارة الكورسات
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
