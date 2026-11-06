"use client";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  getMetadata,
  deleteObject,
} from "firebase/storage";
import { auth, storage } from "./config";
import { uploadErrorMessage } from "../upload-errors";
export type UploadProgress = (percent: number) => void;
/** A selection/preview is NOT a successful upload. Verify the remote object before returning. */
export async function uploadStoredFile(
  path: string,
  file: Blob,
  type: string,
  onProgress?: UploadProgress,
) {
  try {
    await auth.authStateReady();
    if (!auth.currentUser) throw new Error("سجل الدخول قبل رفع الملفات");
    await auth.currentUser.getIdToken();
    const target = ref(storage, path),
      task = uploadBytesResumable(target, file, { contentType: type });
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
          );
        },
        finish,
        () => finish(),
      );
    });
    const metadata = await getMetadata(target);
    if (metadata.size !== file.size || metadata.contentType !== type)
      throw new Error(
        "الملف المحفوظ لا يطابق الحجم أو النوع المطلوب؛ لم يتم اعتماد الرابط",
      );
    const url = await getDownloadURL(target);
    onProgress?.(100);
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
