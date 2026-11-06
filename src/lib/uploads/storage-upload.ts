"use client";
import { upload as blobUpload } from "@vercel/blob/client";
import { auth } from "@/lib/firebase/config";
import { uploadErrorMessage } from "../upload-errors";
import { runUploadStep, type UploadProgress } from "../upload-step";
import {
  assertDeclaredType,
  assertPathForTarget,
  extensionFor,
  uploadRules,
  uploadPrefix,
  type UploadArea,
} from "../uploads/policy";

export type { UploadProgress } from "../upload-step";
export type StoredFile = {
  url: string;
  path: string;
  size: number;
  contentType: string;
};

const MAX_ATTEMPTS = 2;

const TRANSIENT_NAMES = new Set([
  "BlobServiceNotAvailable",
  "BlobServiceRateLimited",
  "BlobRequestAborted",
  "BlobUnknownError",
  "TypeError",
  "AbortError",
]);

/**
 * True only for failures worth a second attempt. Everything the Vercel Blob SDK
 * names explicitly (access, content type, size, missing/suspended store) is
 * final: the same request will fail the same way.
 */
function isTransient(error: unknown) {
  const name = (error as { name?: string })?.name || "";
  if (TRANSIENT_NAMES.has(name)) return true;
  if (name.startsWith("Blob")) return false;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /network|fetch failed|timeout|failed to fetch/i.test(message);
}

async function token() {
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error("سجل الدخول قبل رفع الملفات");
  // A fresh token: the previous one may have expired while the user was editing.
  return auth.currentUser.getIdToken();
}

/**
 * Uploads one file to Vercel Blob.
 *
 * The bytes go from this browser straight to Vercel Blob: a 20 MiB PDF cannot
 * pass through a serverless function body limit, and Firebase Storage cannot be
 * used at all on this project (no bucket, and Firebase requires Blaze since
 * February 2026). The server only issues a 10-minute token bound to one path,
 * one content type and one size, after checking the Firebase session and role.
 */
export async function uploadStoredFile(
  area: UploadArea,
  input: Record<string, string | undefined>,
  file: File,
  onProgress?: UploadProgress,
): Promise<StoredFile> {
  try {
    const idToken = await runUploadStep(
      "التحقق من جلسة Firebase",
      token,
      onProgress,
    );
    // Shape check only: permission is decided by the server route. This just
    // refuses an obviously wrong folder before any bytes move.
    const target = {
      area,
      prefix: uploadPrefix(area, input, auth.currentUser!.uid),
    };
    const rules = uploadRules(area);
    if (!file.size || file.size > rules.maxBytes)
      throw new Error(
        area === "lesson-pdf"
          ? "اختر ملف PDF بحجم لا يزيد عن ٢٠ ميجابايت"
          : "اختر صورة بحجم لا يزيد عن ٣ ميجابايت",
      );
    const contentType = rules.types.includes(file.type)
      ? file.type
      : rules.types[0];
    await runUploadStep(
      "فحص محتوى الملف قبل رفعه",
      () => assertDeclaredType(file, contentType),
      onProgress,
    );
    const pathname = `${target.prefix}/${crypto.randomUUID()}.${extensionFor(contentType)}`;
    assertPathForTarget(pathname, target, rules);

    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const result = await blobUpload(pathname, file, {
          access: "public",
          contentType,
          handleUploadUrl: "/api/uploads/token",
          clientPayload: JSON.stringify({ area, ...input }),
          headers: { authorization: `Bearer ${idToken}` },
          onUploadProgress: ({ percentage }) =>
            onProgress?.(
              Math.min(99, Math.round(percentage)),
              "رفع الملف إلى Vercel Blob",
            ),
        });
        if (!result?.url)
          throw new Error("تعذر الحصول على رابط الملف بعد الرفع");
        await runUploadStep(
          "التحقق من الملف المرفوع",
          async () => {
            const response = await fetch(result.url, { cache: "no-store" });
            if (!response.ok)
              throw new Error(
                `الملف رُفع لكن تنزيله للتحقق فشل (HTTP ${response.status})`,
              );
            const stored = await response.blob();
            if (stored.size !== file.size)
              throw new Error(
                "حجم الملف المخزن لا يطابق الأصل؛ لم يُعتمد",
              );
            if (area !== "lesson-pdf") {
              // The URL must really render as an image before it is accepted.
              await new Promise<void>((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve();
                image.onerror = () =>
                  reject(
                    new Error(
                      "الملف محفوظ لكن المتصفح لم يستطع عرضه كصورة؛ لم يُعتمد الرابط",
                    ),
                  );
                image.src = result.url;
              });
            }
          },
          onProgress,
          99,
        );
        onProgress?.(100, "اكتمل الرفع والتحقق من الملف");
        return {
          url: result.url,
          path: result.pathname,
          size: file.size,
          contentType,
        };
      } catch (error) {
        lastError = error;
        // Retry only failures that can plausibly succeed again. A permission
        // answer, a rejected file or a missing store cannot be fixed by
        // resending it, and retrying would only hide the real message.
        if (attempt === MAX_ATTEMPTS || !isTransient(error)) throw error;
      }
    }
    throw lastError;
  } catch (error) {
    throw new Error(uploadErrorMessage(error));
  }
}

/** Deletes a blob this session owns, e.g. a preview the user replaced. */
export async function removeStoredUpload(
  area: UploadArea,
  input: Record<string, string | undefined>,
  url: string,
) {
  if (!url) return;
  try {
    if (!url.startsWith("https://")) return;
    const idToken = await token();
    await fetch("/api/uploads/delete", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ area, url, ...input }),
    });
  } catch {
    /* Cleanup is best effort: the saved link is what matters. */
  }
}

export async function removeStoredFiles(
  area: UploadArea,
  input: Record<string, string | undefined>,
  urls: string[],
) {
  for (const url of urls) await removeStoredUpload(area, input, url);
}

/**
 * Moves a file that was uploaded before its final folder existed (an exam
 * question image staged for an id that was not saved). The bytes are downloaded
 * and uploaded again, so the moved file is proven readable and intact.
 */
export async function moveStoredFile(
  fromUrl: string,
  area: UploadArea,
  input: Record<string, string | undefined>,
  fileName: string,
  onProgress?: UploadProgress,
) {
  const response = await runUploadStep(
    "تنزيل الملف المؤقت قبل نقله",
    async () => {
      const result = await fetch(fromUrl, { cache: "no-store" });
      if (!result.ok)
        throw new Error(`تعذر تنزيل الملف المؤقت قبل نقله (HTTP ${result.status})`);
      return result;
    },
    onProgress,
  );
  const blob = await response.blob();
  const file = new File([blob], fileName, {
    type: blob.type || "application/octet-stream",
  });
  const moved = await uploadStoredFile(area, input, file, onProgress);
  await removeStoredUpload(area, input, fromUrl);
  return moved;
}
