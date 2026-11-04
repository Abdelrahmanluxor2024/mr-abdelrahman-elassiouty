import type { FirebaseLesson } from "@/lib/firebase/types";
export type LessonVideo = { id: string; title: string; url: string };
export type LessonFile = {
  id: string;
  title: string;
  url: string;
  locked?: boolean;
};
export function lessonVideos(lesson: Partial<FirebaseLesson>): LessonVideo[] {
  if (Array.isArray(lesson.videos)) return lesson.videos.filter((v) => !!v.url);
  return lesson.videoUrl
    ? [{ id: "legacy-video", title: "فيديو الشرح", url: lesson.videoUrl }]
    : [];
}
export function lessonFiles(lesson: Partial<FirebaseLesson>): LessonFile[] {
  if (Array.isArray(lesson.files)) return lesson.files.filter((f) => !!f.url);
  return lesson.pdfUrl
    ? [
        {
          id: "legacy-pdf",
          title: "مذكرة الدرس",
          url: lesson.pdfUrl,
          locked: !!lesson.isPdfLocked,
        },
      ]
    : [];
}
export function validContentUrl(url: string) {
  if (url.startsWith("/files/") && !url.includes("..") && !/[\\\s]/.test(url))
    return true;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}
