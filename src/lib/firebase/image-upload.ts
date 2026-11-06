"use client";
import { uploadStoredFile, type UploadProgress } from "./storage-upload";
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
  const type = await validateImageFile(file);
  const ext =
    type === "image/jpeg" ? "jpg" : type === "image/png" ? "png" : "webp";
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
  const result = await uploadStoredFile(path, file, type, onProgress);
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
  return { url: result.url, path, name: file.name.slice(0, 120) };
}
export async function uploadLessonImage(
  courseId: string,
  lessonId: string,
  file: File,
  onProgress?: UploadProgress,
) {
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error("سجل الدخول");
  if (
    (await getDoc(doc(db, "users", auth.currentUser.uid))).data()?.role !==
    "admin"
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
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error("سجل الدخول");
  await authorizeForumImageUpload(
    courseId,
    await auth.currentUser.getIdToken(),
  );
  return upload(
    file,
    `course-forums/${courseId}/${auth.currentUser.uid}`,
    onProgress,
  );
}

async function requireImageAdmin() {
  await auth.authStateReady();
  if (
    !auth.currentUser ||
    (await getDoc(doc(db, "users", auth.currentUser.uid))).data()?.role !==
      "admin"
  )
    throw new Error("رفع هذه الصورة للأدمن فقط");
}
export async function uploadCourseImage(
  courseId: string,
  file: File,
  onProgress?: UploadProgress,
) {
  await requireImageAdmin();
  if (!courseId || courseId.includes("/")) throw new Error("كورس غير صالح");
  return upload(file, `courses/${courseId}/images`, onProgress);
}
export async function uploadAdminImage(
  area: "community" | "notifications",
  file: File,
  onProgress?: UploadProgress,
) {
  await requireImageAdmin();
  return upload(file, `admin/${area}/images`, onProgress);
}
export async function uploadAvatarImage(
  file: File,
  onProgress?: UploadProgress,
) {
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error("سجل الدخول");
  return upload(file, `avatars/${auth.currentUser.uid}`, onProgress);
}
export async function uploadExamImage(
  file: File,
  examId: string,
  onProgress?: UploadProgress,
) {
  await requireImageAdmin();
  if (!examId || examId.includes("/")) throw new Error("امتحان غير صالح");
  return upload(file, `questions/${examId}`, onProgress);
}
