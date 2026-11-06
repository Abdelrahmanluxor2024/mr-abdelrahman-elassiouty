"use client";
import { uploadStoredFile, type UploadProgress } from "@/lib/uploads/storage-upload";
import { runUploadStep } from "../upload-step";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./config";
import {
  validateImageFile,
  type ImageAttachment,
} from "@/lib/image-attachments";
import { authorizeForumImageUpload } from "@/app/actions/student-learning";

async function upload(
  area:
    | "course-cover"
    | "lesson-image"
    | "exam-question"
    | "avatar"
    | "community"
    | "notification"
    | "forum",
  input: Record<string, string | undefined>,
  file: File,
  onProgress?: UploadProgress,
): Promise<ImageAttachment> {
  const type = await runUploadStep(
    "فحص نوع وحجم الصورة",
    () => validateImageFile(file),
    onProgress,
  );
  const result = await uploadStoredFile(area, input, file, (percent, stage) =>
    onProgress?.(percent, stage),
  );
  const name = file.name.slice(0, 120) || `image.${type.split("/")[1]}`;
  onProgress?.(100, "اكتمل رفع الصورة والتحقق من عرضها");
  return { url: result.url, path: result.path, name };
}

async function requireAdmin() {
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error("سجّل الدخول");
  const profile = await getDoc(doc(db, "users", auth.currentUser.uid));
  if (profile.data()?.role !== "admin")
    throw new Error("رفع هذه الصورة للأدمن فقط");
}

export async function uploadCourseImage(
  courseId: string,
  file: File,
  onProgress?: UploadProgress,
) {
  await requireAdmin();
  if (!courseId || courseId.includes("/")) throw new Error("كورس غير صالح");
  return upload("course-cover", { courseId }, file, onProgress);
}

export async function uploadLessonImage(
  courseId: string,
  lessonId: string,
  file: File,
  onProgress?: UploadProgress,
) {
  await requireAdmin();
  if (!courseId || !lessonId || /[\\/]/.test(courseId + lessonId))
    throw new Error("درس غير صالح");
  return upload("lesson-image", { courseId, lessonId }, file, onProgress);
}

export async function uploadAdminImage(
  area: "community" | "notifications",
  file: File,
  onProgress?: UploadProgress,
) {
  await requireAdmin();
  return upload(
    area === "community" ? "community" : "notification",
    {},
    file,
    onProgress,
  );
}

export async function uploadAvatarImage(
  file: File,
  onProgress?: UploadProgress,
) {
  await runUploadStep(
    "التحقق من جلسة Firebase",
    () => auth.authStateReady(),
    onProgress,
  );
  if (!auth.currentUser) throw new Error("سجّل الدخول");
  return upload("avatar", {}, file, onProgress);
}

export async function uploadExamImage(
  file: File,
  examId: string,
  onProgress?: UploadProgress,
) {
  await requireAdmin();
  if (!examId || examId.includes("/")) throw new Error("امتحان غير صالح");
  return upload("exam-question", { examId }, file, onProgress);
}

export async function uploadForumImage(
  courseId: string,
  file: File,
  onProgress?: UploadProgress,
) {
  await runUploadStep(
    "التحقق من جلسة Firebase",
    () => auth.authStateReady(),
    onProgress,
  );
  if (!auth.currentUser) throw new Error("سجّل الدخول");
  const token = await runUploadStep(
    "تجديد جلسة رفع صورة المنتدى",
    () => auth.currentUser!.getIdToken(),
    onProgress,
  );
  // The server checks the subscription again when it issues the upload token.
  await runUploadStep(
    "التحقق من اشتراك المنتدى",
    () => authorizeForumImageUpload(courseId, token),
    onProgress,
  );
  return upload("forum", { courseId }, file, onProgress);
}
