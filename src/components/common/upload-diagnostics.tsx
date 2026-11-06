"use client";
import { useState } from "react";
import { uploadCourseImage } from "@/lib/firebase/image-upload";
import { uploadLessonPdf } from "@/lib/firebase/course-builder-service";
import { removeUpload } from "@/lib/firebase/storage-upload";
import { firebaseConfig } from "@/lib/firebase/config";
export function UploadDiagnostics({
  courseId,
  onBusyChange,
}: {
  courseId: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false),
    [lines, setLines] = useState<string[]>([]);
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
    const files = [
      new File([png], "upload-check.png", { type: "image/png" }),
      new File(
        ["%PDF-1.4\n% Storage upload diagnostic only\n%%EOF"],
        "upload-check.pdf",
        { type: "application/pdf" },
      ),
    ];
    try {
      for (const file of files) {
        let path = "";
        try {
          setLines((x) => [...x, `جاري اختبار ${file.type}…`]);
          const url =
            file.type === "image/png"
              ? (await uploadCourseImage(courseId, file)).url
              : await uploadLessonPdf(courseId, file);
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
            `نجح الرفع والتنزيل ومطابقة المحتوى: ${file.type}`,
          ]);
        } catch (e) {
          setLines((x) => [
            ...x,
            `${file.type}: ${e instanceof Error ? e.message : "فشل الاختبار"}`,
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
      <button
        type="button"
        disabled={busy}
        onClick={test}
        className="rounded-xl bg-blue-600 px-4 py-2 text-white"
      >
        {busy ? "جاري الاختبار الفعلي…" : "اختبار الرفع والتنزيل الآن"}
      </button>
      <ul aria-live="polite" className="mt-3 space-y-2 break-words text-sm">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </details>
  );
}
