"use client";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, storage } from "./config";
import {
  validateImageFile,
  type ImageAttachment,
} from "@/lib/image-attachments";
import { authorizeForumImageUpload } from "@/app/actions/student-learning";
async function upload(file: File, prefix: string): Promise<ImageAttachment> {
  const type = await validateImageFile(file);
  const ext =
    type === "image/jpeg" ? "jpg" : type === "image/png" ? "png" : "webp";
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`,
    target = ref(storage, path);
  await uploadBytes(target, file, { contentType: type });
  return {
    url: await getDownloadURL(target),
    path,
    name: file.name.slice(0, 120),
  };
}
export async function uploadLessonImage(
  courseId: string,
  lessonId: string,
  file: File,
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
  return upload(file, `courses/${courseId}/lessons/${lessonId}/images`);
}
export async function uploadForumImage(courseId: string, file: File) {
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error("سجل الدخول");
  await authorizeForumImageUpload(
    courseId,
    await auth.currentUser.getIdToken(),
  );
  return upload(file, `course-forums/${courseId}/${auth.currentUser.uid}`);
}
