import {
  lessonFiles,
  lessonVideos,
  validContentUrl,
  type LessonVideo,
  type LessonFile,
} from "./learning-content";
import type { FirebaseLesson } from "./firebase/types";
export type BuilderLesson = {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  moduleId: string;
  videos: LessonVideo[];
  files: LessonFile[];
  examIds: string[];
};
export type CourseDraft = {
  id: string;
  revision: number;
  title: string;
  description: string;
  price: number;
  isFree: boolean;
  durationHours: number;
  thumbnailUrl: string;
  modules: { id: string; title: string }[];
  lessons: BuilderLesson[];
  originalLessonIds: string[];
  originalExamIds: string[];
};
export function builderLesson(
  lesson: FirebaseLesson,
  examIds: string[] = [],
): BuilderLesson {
  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description || "",
    imageUrl: lesson.imageUrl || "",
    moduleId: lesson.moduleId || "",
    videos: lesson.videos ?? lessonVideos(lesson),
    files: lesson.files ?? lessonFiles(lesson),
    examIds,
  };
}
export function validateCourseDraft(draft: CourseDraft, publish: boolean) {
  const errors: string[] = [];
  if (!draft.title.trim()) errors.push("اكتب اسم الكورس");
  if (
    !Number.isFinite(draft.price) ||
    draft.price < 0 ||
    !Number.isSafeInteger(Math.round(draft.price * 100)) ||
    Math.abs(draft.price - Math.round(draft.price * 100) / 100) > 0.000001 ||
    (!draft.isFree && draft.price <= 0)
  )
    errors.push("حدد سعراً صحيحاً أو اختر كورساً مجانياً");
  if (!Number.isFinite(draft.durationHours) || draft.durationHours < 0)
    errors.push("مدة الكورس غير صحيحة");
  if (
    draft.thumbnailUrl &&
    !validContentUrl(draft.thumbnailUrl) &&
    !draft.thumbnailUrl.startsWith("/images/")
  )
    errors.push("رابط غلاف الكورس غير صالح");
  if (publish && !draft.lessons.length)
    errors.push("أضف درساً واحداً على الأقل قبل النشر");
  const ids = new Set<string>(),
    exams = new Set<string>();
  draft.modules.forEach((m) => {
    if (!m.title.trim()) errors.push("اكتب عنوان كل وحدة");
  });
  draft.lessons.forEach((lesson, index) => {
    if (!lesson.id || ids.has(lesson.id))
      errors.push("توجد معرّفات دروس مكررة");
    ids.add(lesson.id);
    if (lesson.imageUrl && !validContentUrl(lesson.imageUrl))
      errors.push(`رابط صورة الدرس ${index + 1} غير صالح`);
    if (!lesson.title.trim()) errors.push(`اكتب عنوان الدرس ${index + 1}`);
    if (lesson.moduleId && !draft.modules.some((m) => m.id === lesson.moduleId))
      errors.push(`وحدة الدرس ${index + 1} غير موجودة`);
    if (
      publish &&
      !lesson.videos.length &&
      !lesson.files.length &&
      !lesson.examIds.length &&
      !lesson.imageUrl
    )
      errors.push(`أضف فيديو أو ملفاً للدرس ${index + 1}`);
    [...lesson.videos, ...lesson.files].forEach((resource) => {
      if (
        (publish && (!resource.title.trim() || !resource.url)) ||
        (resource.url && !validContentUrl(resource.url))
      )
        errors.push(`راجع عنوان ورابط المحتوى في الدرس ${index + 1}`);
    });
    lesson.examIds.forEach((id) => {
      if (exams.has(id)) errors.push("لا يمكن ربط نفس الامتحان بدرسين");
      exams.add(id);
    });
  });
  if (
    draft.lessons.length +
      exams.size +
      draft.originalLessonIds.length +
      draft.originalExamIds.length >
    440
  )
    errors.push("المحتوى تجاوز حد الحفظ الآمن. قسّم الكورس");
  return [...new Set(errors)];
}
