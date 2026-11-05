import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  runTransaction,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "./config";
import { normalizeCourse } from "./services";
import {
  builderLesson,
  validateCourseDraft,
  type CourseDraft,
} from "../course-builder";
import type { FirebaseLesson } from "./types";
async function requireAdmin() {
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error("سجّل الدخول بحساب الأدمن");
  const user = await getDoc(doc(db, "users", auth.currentUser.uid));
  if (!user.exists() || user.data().role !== "admin")
    throw new Error("هذا الإجراء للأدمن فقط");
}
export async function loadCourseDraft(id: string): Promise<CourseDraft> {
  await requireAdmin();
  const [course, lessons, exams] = await Promise.all([
    getDoc(doc(db, "courses", id)),
    getDocs(query(collection(db, "lessons"), where("courseId", "==", id))),
    getDocs(query(collection(db, "exams"), where("courseId", "==", id))),
  ]);
  if (!course.exists()) throw new Error("الكورس غير موجود");
  const c = normalizeCourse(id, course.data());
  return {
    id,
    revision: course.data().revision || 0,
    title: c.title,
    description: c.description || "",
    price: Number(c.price) || 0,
    isFree: c.isFree,
    thumbnailUrl: c.thumbnailUrl || "",
    durationHours: c.durationHours,
    modules: c.modules || [],
    originalLessonIds: lessons.docs.map((d) => d.id),
    originalExamIds: exams.docs.map((d) => d.id),
    lessons: lessons.docs
      .filter((d) => d.data().isPublished !== false)
      .map((d) =>
        builderLesson(
          { id: d.id, ...d.data() } as FirebaseLesson,
          exams.docs
            .filter(
              (e) => e.data().lessonId === d.id && e.data().isActive !== false,
            )
            .map((e) => e.id),
        ),
      )
      .sort(
        (a, b) =>
          (lessons.docs.find((d) => d.id === a.id)?.data().orderIndex || 0) -
          (lessons.docs.find((d) => d.id === b.id)?.data().orderIndex || 0),
      ),
  };
}
export async function saveCourseDraft(draft: CourseDraft, publish: boolean) {
  await requireAdmin();
  const errors = validateCourseDraft(draft, publish);
  if (errors.length) throw new Error(errors.join(" — "));
  const ref = doc(db, "courses", draft.id);
  const selected = draft.lessons.flatMap((l) =>
    l.examIds.map((id) => ({ id, lessonId: l.id })),
  );
  await runTransaction(db, async (tx) => {
    const current = await tx.get(ref);
    if ((current.data()?.revision || 0) !== draft.revision)
      throw new Error(
        "الكورس اتعدل من مكان آخر. أعد فتحه قبل الحفظ لحماية التعديلات",
      );
    const examDocs = await Promise.all(
      selected.map((e) => tx.get(doc(db, "exams", e.id))),
    );
    if (
      examDocs.some(
        (e) =>
          !e.exists() || (e.data().courseId && e.data().courseId !== draft.id),
      )
    )
      throw new Error("أحد الامتحانات غير موجود أو مرتبط بكورس آخر");
    const now = new Date().toISOString();
    tx.set(
      ref,
      {
        title: draft.title.trim(),
        description: draft.description.trim(),
        price: draft.isFree ? 0 : draft.price,
        is_free: draft.isFree,
        isFree: draft.isFree,
        is_published: publish,
        isPublished: publish,
        duration_hours: draft.durationHours,
        durationHours: draft.durationHours,
        thumbnail_url: draft.thumbnailUrl,
        thumbnailUrl: draft.thumbnailUrl,
        modules: draft.modules,
        lessonsCount: draft.lessons.length,
        homeworkCount: selected.length,
        revision: draft.revision + 1,
        updatedAt: now,
        ...(!current.exists() ? { createdAt: now, created_at: now } : {}),
      },
      { merge: true },
    );
    draft.lessons.forEach((l, i) =>
      tx.set(
        doc(db, "lessons", l.id),
        {
          courseId: draft.id,
          title: l.title.trim(),
          description: l.description,
          imageUrl: l.imageUrl || "",
          moduleId: l.moduleId,
          moduleTitle:
            draft.modules.find((m) => m.id === l.moduleId)?.title || "",
          orderIndex: i + 1,
          videos: l.videos,
          files: l.files,
          videoUrl: l.videos[0]?.url || "",
          pdfUrl: l.files[0]?.url || "",
          isPdfLocked: !!l.files[0]?.locked,
          isPublished: true,
          updatedAt: now,
          ...(!draft.originalLessonIds.includes(l.id)
            ? { createdAt: now }
            : {}),
        },
        { merge: true },
      ),
    );
    draft.originalLessonIds
      .filter((id) => !draft.lessons.some((l) => l.id === id))
      .forEach((id) =>
        tx.update(doc(db, "lessons", id), { isPublished: false }),
      );
    selected.forEach((e) =>
      tx.update(doc(db, "exams", e.id), {
        courseId: draft.id,
        lessonId: e.lessonId,
        isActive: true,
      }),
    );
    draft.originalExamIds
      .filter((id) => !selected.some((e) => e.id === id))
      .forEach((id) => tx.update(doc(db, "exams", id), { isActive: false }));
  });
}
export async function uploadLessonPdf(courseId: string, file: File) {
  await requireAdmin();
  if (file.type !== "application/pdf" || file.size > 20 * 1024 * 1024)
    throw new Error("اختر PDF بحجم لا يزيد عن ٢٠ ميجابايت");
  const path = ref(
    storage,
    `courses/${courseId}/pdf/${crypto.randomUUID()}.pdf`,
  );
  await uploadBytes(path, file, { contentType: "application/pdf" });
  return getDownloadURL(path);
}
