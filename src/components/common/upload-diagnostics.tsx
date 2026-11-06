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
import { uploadLessonPdf } from "@/lib/firebase/course-builder-service";
import { removeUpload } from "@/lib/firebase/storage-upload";
import { firebaseConfig } from "@/lib/firebase/config";
import {
  checkStorageBucket,
  missingBucketMessage,
  storageBucketEndpoint,
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
      upload: () => Promise<string>;
    }[] = [
      {
        label: "غلاف الكورس",
        file: image,
        upload: async () => (await uploadCourseImage(courseId, image)).url,
      },
      {
        label: "ملفات PDF للدروس",
        file: pdf,
        upload: () => uploadLessonPdf(courseId, pdf),
      },
    ];
    if (allPaths) {
      if (lessonId)
        checks.push({
          label: "صورة الدرس",
          file: image,
          upload: async () =>
            (await uploadLessonImage(courseId, lessonId, image)).url,
        });
      if (examId)
        checks.push({
          label: "صورة سؤال الامتحان",
          file: image,
          upload: async () => (await uploadExamImage(image, examId)).url,
        });
      checks.push(
        {
          label: "الصورة الشخصية — التخزين فقط",
          file: image,
          upload: async () => (await uploadAvatarImage(image)).url,
        },
        {
          label: "صور منشورات المنصة",
          file: image,
          upload: async () => (await uploadAdminImage("community", image)).url,
        },
        {
          label: "صور الإشعارات",
          file: image,
          upload: async () =>
            (await uploadAdminImage("notifications", image)).url,
        },
        {
          label: "صور المنتدى — بحساب الأدمن الحالي",
          file: image,
          upload: async () => (await uploadForumImage(courseId, image)).url,
        },
      );
    }
    try {
      setLines((x) => [...x, "فحص اسم الدلو وإتاحته من المتصفح…"]);
      const bucket = await checkStorageBucket();
      setLines((x) => [
        ...x,
        bucket.ok
          ? `الدلو متاح للاتصال: ${bucket.bucket}`
          : `${missingBucketMessage(bucket.bucket)} [${bucket.code} | ${storageBucketEndpoint(bucket.bucket)}]`,
      ]);
      if (!bucket.ok) return;
      for (const check of checks) {
        const file = check.file;
        let path = "";
        try {
          setLines((x) => [...x, `جاري اختبار ${check.label} (${file.type})…`]);
          const url = await check.upload();
          path = decodeURIComponent(new URL(url).pathname.split("/o/")[1]);
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
          if (path) {
            try {
              await removeUpload(path);
              setLines((x) => [...x, "تم حذف ملف الاختبار فقط."]);
            } catch {
              setLines((x) => [
                ...x,
                `الرفع تم، لكن حذف ملف الاختبار رفضته القواعد: ${path}`,
              ]);
            }
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
        الدلو: {firebaseConfig.storageBucket}. الاختبار يرفع ملفين صغيرين،
        ينزلهما ويقارن محتواهما ثم يحذف ملفي الاختبار فقط. لا يعدّل الكورس أو
        الملفات القديمة.
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
                `Bucket: ${firebaseConfig.storageBucket}\n${lines.join("\n")}`,
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
