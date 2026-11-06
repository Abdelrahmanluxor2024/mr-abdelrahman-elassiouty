"use client";
import { uploadStoredFile, type UploadProgress } from "./storage-upload";
import { runUploadStep } from "../upload-step";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./config";
import {
  validateImageFile,
  type ImageAttachment,
} from "@/lib/image-attachments";
import { authorizeForumImageUpload } from "@/app/actions/student-learning";
async function upload(
  file: File,
  prefix: string,
  onProgress?: UploadProgress,
): Promise<ImageAttachment> {
  const type = await runUploadStep(
    "فحص نوع وحجم الصورة",
    () => validateImageFile(file),
    onProgress,
  );
  const ext =
    type === "image/jpeg" ? "jpg" : type === "image/png" ? "png" : "webp";
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
  const result = await uploadStoredFile(path, file, type, (percent, stage) =>
    onProgress?.(Math.min(99, percent), stage),
  );
  onProgress?.(99, "فتح الصورة المرفوعة للتأكد من عرضها");
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    const finish = (error?: Error) => {
      clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      error ? reject(error) : resolve();
    };
    const timer = setTimeout(
      () =>
        finish(
          new Error(
            "تم رفع الصورة لكن عرضها لم يكتمل خلال ١٥ ثانية؛ تحقق من رابط التخزين والشبكة",
          ),
        ),
      15000,
    );
    image.onload = () => finish();
    image.onerror = () =>
      finish(
        new Error(
          "تم حفظ الملف في التخزين لكن المتصفح لم يستطع عرضه كصورة؛ لم يتم اعتماد الرابط",
        ),
      );
    image.src = result.url;
  });
  onProgress?.(100, "اكتمل رفع الصورة والتحقق من عرضها");
  return { url: result.url, path, name: file.name.slice(0, 120) };
}
export async function uploadLessonImage(
  courseId: string,
  lessonId: string,
  file: File,
  onProgress?: UploadProgress,
) {
  await runUploadStep(
    "التحقق من جلسة Firebase",
    () => auth.authStateReady(),
    onProgress,
  );
  if (!auth.currentUser) throw new Error("سجل الدخول");
  if (
    (
      await runUploadStep(
        "التحقق من صلاحية الأدمن",
        () => getDoc(doc(db, "users", auth.currentUser!.uid)),
        onProgress,
      )
    ).data()?.role !== "admin"
  )
    throw new Error("رفع صور الدروس للأدمن فقط");
  if (!courseId || !lessonId || /[\/]/.test(courseId + lessonId))
    throw new Error("درس غير صالح");
  return upload(
    file,
    `courses/${courseId}/lessons/${lessonId}/images`,
    onProgress,
  );
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
  if (!auth.currentUser) throw new Error("سجل الدخول");
  const token = await runUploadStep(
    "تجديد جلسة رفع صورة المنتدى",
    () => auth.currentUser!.getIdToken(),
    onProgress,
  );
  await runUploadStep(
    "التحقق من اشتراك المنتدى",
    () => authorizeForumImageUpload(courseId, token),
    onProgress,
  );
  return upload(
    file,
    `course-forums/${courseId}/${auth.currentUser.uid}`,
    onProgress,
  );
}

async function requireImageAdmin(onProgress?: UploadProgress) {
  await runUploadStep(
    "التحقق من جلسة Firebase",
    () => auth.authStateReady(),
    onProgress,
  );
  if (
    !auth.currentUser ||
    (
      await runUploadStep(
        "التحقق من صلاحية الأدمن",
        () => getDoc(doc(db, "users", auth.currentUser!.uid)),
        onProgress,
      )
    ).data()?.role !== "admin"
  )
    throw new Error("رفع هذه الصورة للأدمن فقط");
}
export async function uploadCourseImage(
  courseId: string,
  file: File,
  onProgress?: UploadProgress,
) {
  await requireImageAdmin(onProgress);
  if (!courseId || courseId.includes("/")) throw new Error("كورس غير صالح");
  return upload(file, `courses/${courseId}/images`, onProgress);
}
export async function uploadAdminImage(
  area: "community" | "notifications",
  file: File,
  onProgress?: UploadProgress,
) {
  await requireImageAdmin(onProgress);
  return upload(file, `admin/${area}/images`, onProgress);
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
  if (!auth.currentUser) throw new Error("سجل الدخول");
  return upload(file, `avatars/${auth.currentUser.uid}`, onProgress);
}
export async function uploadExamImage(
  file: File,
  examId: string,
  onProgress?: UploadProgress,
) {
  await requireImageAdmin(onProgress);
  if (!examId || examId.includes("/")) throw new Error("امتحان غير صالح");
  return upload(file, `questions/${examId}`, onProgress);
}
