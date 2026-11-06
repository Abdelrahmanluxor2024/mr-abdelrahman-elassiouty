"use client";
import { useState } from "react";
import {
  uploadCourseImage,
  uploadLessonImage,
  uploadAvatarImage,
  uploadAdminImage,
  uploadExamImage,
  uploadForumImage,
} from "@/lib/firebase/image-upload";
import type { UploadArea } from "@/lib/uploads/policy";
import { uploadLessonPdf } from "@/lib/firebase/course-builder-service";
import { removeStoredUpload } from "@/lib/uploads/storage-upload";
import {
  UPLOAD_PROVIDER,
  checkStorageBucket,
  missingStoreMessage,
} from "@/lib/firebase/storage-bucket";
export function UploadDiagnostics({
  courseId,
  lessonId,
  examId,
  onBusyChange,
}: {
  courseId: string;
  lessonId?: string;
  examId?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false),
    [lines, setLines] = useState<string[]>([]),
    [allPaths, setAllPaths] = useState(false);
  async function test() {
    setBusy(true);
    setLines([]);
    onBusyChange?.(true);
    const png = Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNgaPgPAAIDAYAkYfWXAAAAAElFTkSuQmCC",
      ),
      (c) => c.charCodeAt(0),
    );
    const image = new File([png], "upload-check.png", { type: "image/png" });
    const pdf = new File(
      ["%PDF-1.4\n% Storage upload diagnostic only\n%%EOF"],
      "upload-check.pdf",
      { type: "application/pdf" },
    );
    const checks: {
      label: string;
      file: File;
      area: UploadArea;
      input: Record<string, string | undefined>;
      upload: () => Promise<string>;
    }[] = [
      {
        label: "غلاف الكورس",
        file: image,
        area: "course-cover",
        input: { courseId },
        upload: async () => (await uploadCourseImage(courseId, image)).url,
      },
      {
        label: "ملفات PDF للدروس",
        file: pdf,
        area: "lesson-pdf",
        input: { courseId },
        upload: () => uploadLessonPdf(courseId, pdf),
      },
    ];
    if (allPaths) {
      if (lessonId)
        checks.push({
          label: "صورة الدرس",
          file: image,
          area: "lesson-image",
          input: { courseId, lessonId },
          upload: async () =>
            (await uploadLessonImage(courseId, lessonId, image)).url,
        });
      if (examId)
        checks.push({
          label: "صورة سؤال الامتحان",
          file: image,
          area: "exam-question",
          input: { examId },
          upload: async () => (await uploadExamImage(image, examId)).url,
        });
      checks.push(
        {
          label: "الصورة الشخصية — التخزين فقط",
          file: image,
          area: "avatar",
          input: {},
          upload: async () => (await uploadAvatarImage(image)).url,
        },
        {
          label: "صور منشورات المنصة",
          file: image,
          area: "community",
          input: {},
          upload: async () => (await uploadAdminImage("community", image)).url,
        },
        {
          label: "صور الإشعارات",
          file: image,
          area: "notification",
          input: {},
          upload: async () =>
            (await uploadAdminImage("notifications", image)).url,
        },
        {
          label: "صور المنتدى — بحساب الأدمن الحالي",
          file: image,
          area: "forum",
          input: { courseId },
          upload: async () => (await uploadForumImage(courseId, image)).url,
        },
      );
    }
    try {
      setLines((x) => [...x, "فحص مخزن الملفات في هذا النشر…"]);
      const store = await checkStorageBucket();
      setLines((x) => [
        ...x,
        store.ok
          ? `المخزن متاح: ${UPLOAD_PROVIDER}`
          : `${missingStoreMessage(store.code)} [${store.code}]`,
      ]);
      if (!store.ok) return;
      for (const check of checks) {
        const file = check.file;
        let url = "";
        try {
          setLines((x) => [...x, `جاري اختبار ${check.label} (${file.type})…`]);
          url = await check.upload();
          const response = await fetch(url, {
            cache: "no-store",
            signal: AbortSignal.timeout(30000),
          });
          if (!response.ok)
            throw new Error(
              `الملف رُفع لكن تنزيله فشل: HTTP ${response.status}`,
            );
          const bytes = new Uint8Array(await response.arrayBuffer()),
            original = new Uint8Array(await file.arrayBuffer());
          if (
            bytes.length !== original.length ||
            !bytes.every((b, i) => b === original[i])
          )
            throw new Error("محتوى التنزيل لا يطابق الملف المرفوع");
          setLines((x) => [
            ...x,
            `نجح الرفع والتنزيل ومطابقة المحتوى: ${check.label}`,
          ]);
        } catch (e) {
          setLines((x) => [
            ...x,
            `${check.label}: ${e instanceof Error ? e.message : "فشل الاختبار"}`,
          ]);
        } finally {
          if (url) {
            await removeStoredUpload(check.area, check.input, url);
            setLines((x) => [...x, "تم حذف ملف الاختبار فقط."]);
          }
        }
      }
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }
  return (
    <details className="sm:col-span-2 rounded-2xl border p-4">
      <summary className="cursor-pointer font-bold">
        تشخيص رفع الصور وPDF
      </summary>
      <p className="my-3 text-sm text-muted">
        المخزن: {UPLOAD_PROVIDER}. الاختبار يرفع ملفين صغيرين، ينزلهما ويقارن
        محتواهما ثم يحذف ملفي الاختبار فقط. لا يعدّل الكورس أو الملفات القديمة.
      </p>
      <label className="my-3 flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={allPaths}
          disabled={busy}
          onChange={(e) => setAllPaths(e.target.checked)}
        />
        فحص جميع مسارات الصور المتاحة أيضاً (بصلاحيات الحساب الحالي، دون تعديل
        منشورات أو صور الحساب)
      </label>
      <button
        type="button"
        disabled={busy}
        onClick={test}
        className="rounded-xl bg-blue-600 px-4 py-2 text-white"
      >
        {busy ? "جاري الاختبار الفعلي…" : "اختبار الرفع والتنزيل الآن"}
      </button>
      {lines.length > 0 && (
        <button
          type="button"
          className="mx-3 text-sm underline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                `Store: ${UPLOAD_PROVIDER}\n${lines.join("\n")}`,
              );
            } catch {
              setLines((x) => [
                ...x,
                "تعذر النسخ؛ يمكنك تحديد النص ونسخه يدوياً.",
              ]);
            }
          }}
        >
          نسخ نتيجة الفحص
        </button>
      )}
      <ul aria-live="polite" className="mt-3 space-y-2 break-words text-sm">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </details>
  );
}
