"use client";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { manageLessonAttempts } from "@/app/actions/attempt-grants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
export default function AttemptGrantsPage() {
  const [phone, setPhone] = useState(""),
    [lessonId, setLessonId] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [lessons, setLessons] = useState<
    { id: string; title: string; course: string }[]
  >([]);
  const [preview, setPreview] = useState<{
    phone: string;
    lessonId: string;
    studentId: string;
    name: string;
    examCount: number;
  } | null>(null);
  useEffect(() => {
    Promise.all([
      getDocs(collection(db, "courses")),
      getDocs(collection(db, "lessons")),
    ])
      .then(([c, l]) => {
        const names = new Map(c.docs.map((d) => [d.id, d.data().title]));
        setLessons(
          l.docs
            .filter((d) => d.data().isPublished !== false)
            .map((d) => ({
              id: d.id,
              title: d.data().title,
              course: names.get(d.data().courseId) || "كورس",
            })),
        );
      })
      .catch(() =>
        setError(
          "تعذر تحميل الدروس. أعد تحميل الصفحة وتحقق من صلاحيات المسؤول",
        ),
      );
  }, []);
  async function submit(confirm = false) {
    setBusy(true);
    try {
      await auth.authStateReady();
      const result = await manageLessonAttempts({
        phone,
        lessonId,
        confirm,
        expectedStudentId: preview?.studentId,
        idToken: await auth.currentUser?.getIdToken(),
      });
      if (!result.ok) throw Error(result.message);
      if (!confirm && result.studentId)
        setPreview({
          phone,
          lessonId,
          studentId: result.studentId,
          name: result.name!,
          examCount: result.examCount!,
        });
      else {
        toast.success(result.message);
        setPreview(null);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذر المنح");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div dir="rtl" className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-black">منح محاولة إضافية لطالب</h1>
        <p className="mt-3 text-sm leading-8 text-muted">
          اكتب رقم الطالب المسجل واختار الدرس. تُمنح محاولة إضافية واحدة لكل
          امتحان مستهلك داخل الدرس، بدون حذف النتائج السابقة أو تغيير اشتراك
          الطالب.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>الطالب والدرس</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="block text-sm font-bold space-y-2">
            رقم موبايل الطالب
            <Input
              type="tel"
              dir="ltr"
              placeholder="01xxxxxxxxx"
              disabled={busy}
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setPreview(null);
              }}
            />
          </label>
          <label className="block text-sm font-bold space-y-2">
            الدرس
            <select
              className="studio-select"
              disabled={busy || !lessons.length}
              value={lessonId}
              onChange={(e) => {
                setLessonId(e.target.value);
                setPreview(null);
              }}
            >
              <option value="">اختر الدرس</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.course} — {l.title}
                </option>
              ))}
            </select>
          </label>
          {error && (
            <p role="alert" className="text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
          <Button
            disabled={busy || !phone || !lessonId}
            onClick={() => submit()}
          >
            راجع بيانات الطالب
          </Button>
          {preview && (
            <div className="space-y-4 rounded-2xl border border-blue-200 p-5 dark:border-blue-800">
              <h2 className="font-black">{preview.name}</h2>
              <p className="text-sm">
                الرقم: <b dir="ltr">{preview.phone}</b> · {preview.examCount}{" "}
                امتحان نشط بالدرس
              </p>
              <p className="text-sm text-muted leading-7">
                لن تتراكم المنح عند تكرار الضغط. الامتحان غير المستهلك أو الجاري
                حله لا يحتاج منحة، وأي منحة متاحة بالفعل تبقى كما هي. منح محاولة
                جديدة لاحقاً يحتاج إجراءً جديداً من المسؤول.
              </p>
              <Button disabled={busy} onClick={() => submit(true)}>
                {busy ? "جاري التنفيذ…" : "تأكيد منح المحاولة الإضافية"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
