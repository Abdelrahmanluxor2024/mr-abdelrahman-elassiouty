"use client";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  getMetadata,
  getBytes,
  deleteObject,
} from "firebase/storage";
import { auth, storage } from "./config";
import { uploadErrorMessage } from "../upload-errors";
import { runUploadStep, type UploadProgress } from "../upload-step";
export type { UploadProgress } from "../upload-step";
/** A selection/preview is NOT a successful upload. Verify the remote object before returning. */
export async function uploadStoredFile(
  path: string,
  file: Blob,
  type: string,
  onProgress?: UploadProgress,
) {
  try {
    await runUploadStep(
      "التحقق من جلسة Firebase",
      () => auth.authStateReady(),
      onProgress,
    );
    if (!auth.currentUser) throw new Error("سجل الدخول قبل رفع الملفات");
    await runUploadStep(
      "تجديد تصريح رفع الملف",
      () => auth.currentUser!.getIdToken(),
      onProgress,
    );
    const target = ref(storage, path),
      task = uploadBytesResumable(target, file, { contentType: type });
    onProgress?.(0, "الاتصال بخادم التخزين ورفع الملف");
    await new Promise<void>((resolve, reject) => {
      let last = -1,
        settled = false;
      const finish = (error?: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        error ? reject(error) : resolve();
      };
      let timer = setTimeout(() => {
        finish(
          new Error(
            "لم يتقدم رفع الملف خلال ٤٥ ثانية. تحقق من الشبكة وقواعد Storage وCORS.",
          ),
        );
        task.cancel();
      }, 45000);
      const heartbeat = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          finish(
            new Error(
              "توقف تقدم رفع الملف لمدة ٤٥ ثانية. تحقق من الشبكة وإعدادات Storage.",
            ),
          );
          task.cancel();
        }, 45000);
      };
      task.on(
        "state_changed",
        (s) => {
          if (s.bytesTransferred !== last) {
            last = s.bytesTransferred;
            heartbeat();
          }
          onProgress?.(
            s.totalBytes
              ? Math.min(
                  99,
                  Math.round((s.bytesTransferred / s.totalBytes) * 100),
                )
              : 0,
            "رفع الملف إلى Firebase Storage",
          );
        },
        finish,
        () => finish(),
      );
    });
    const metadata = await runUploadStep(
      "قراءة بيانات الملف بعد الرفع",
      () => getMetadata(target),
      onProgress,
      99,
    );
    if (metadata.size !== file.size || metadata.contentType !== type)
      throw new Error(
        "الملف المحفوظ لا يطابق الحجم أو النوع المطلوب؛ لم يتم اعتماد الرابط",
      );
    // Metadata alone cannot prove that the stored file is downloadable and intact.
    const downloaded = new Uint8Array(
      await runUploadStep(
        "تنزيل الملف للتحقق من سلامته",
        () => getBytes(target, file.size),
        onProgress,
        99,
        30000,
      ),
    );
    const original = new Uint8Array(
      await runUploadStep(
        "مقارنة محتوى الملف",
        () => file.arrayBuffer(),
        onProgress,
        99,
      ),
    );
    if (
      downloaded.length !== original.length ||
      !downloaded.every((byte, i) => byte === original[i])
    )
      throw new Error(
        "الملف رُفع لكن محتوى التنزيل لا يطابق الأصل؛ لم يتم اعتماد الرابط",
      );
    const url = await runUploadStep(
      "استخراج رابط الملف المحفوظ",
      () => getDownloadURL(target),
      onProgress,
      99,
    );
    onProgress?.(100, "اكتمل الرفع والتحقق من الملف");
    return {
      url,
      path,
      size: metadata.size,
      contentType: metadata.contentType,
    };
  } catch (error) {
    throw new Error(uploadErrorMessage(error));
  }
}
export async function removeUpload(path: string) {
  await deleteObject(ref(storage, path));
}
