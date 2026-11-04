"use server";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  where,
  query,
  runTransaction,
} from "firebase/firestore";
import { adminDatabase } from "@/lib/firebase/admin-database";
import {
  ARABIC_COURSE_ID,
  ARABIC_LESSON_ID,
  fourthLessonDocuments,
} from "@/lib/arabic-fourth-lesson";
export async function addFourthLesson(token?: string, pdfUrl?: string) {
  try {
    const { db, uid } = await adminDatabase(token),
      courseRef = doc(db, "courses", ARABIC_COURSE_ID);
    const [course, lessons, exams] = await Promise.all([
      getDoc(courseRef),
      getDocs(
        query(
          collection(db, "lessons"),
          where("courseId", "==", ARABIC_COURSE_ID),
        ),
      ),
      getDocs(
        query(
          collection(db, "exams"),
          where("courseId", "==", ARABIC_COURSE_ID),
        ),
      ),
    ]);
    if (!course.exists())
      throw new Error("الكورس الأساسي غير موجود. لن ننشئ أو نستبدل أي كورس");
    if (pdfUrl) {
      const url = new URL(pdfUrl);
      if (
        url.protocol !== "https:" ||
        url.hostname !== "firebasestorage.googleapis.com" ||
        !decodeURIComponent(url.pathname).includes(
          `/o/courses/${ARABIC_COURSE_ID}/pdf/`,
        )
      )
        throw new Error("ارفع ملف PDF إلى مساحة الكورس أولاً");
    }
    const rows = fourthLessonDocuments(new Date().toISOString(), pdfUrl || "");
    const created = await runTransaction(db, async (tx) => {
      const [live, admin, ...existing] = await Promise.all([
        tx.get(courseRef),
        tx.get(doc(db, "users", uid)),
        ...rows.map((row) => tx.get(doc(db, row.collection, row.id))),
      ]);
      if (admin.data()?.role !== "admin")
        throw new Error("صلاحيات المسؤول تغيرت");
      if ((live.data()?.revision || 0) !== (course.data().revision || 0))
        throw new Error("الكورس اتعدل. أعد المحاولة بعد تحديث الصفحة");
      if (
        existing.some(
          (snap, i) =>
            snap.exists() &&
            (rows[i].collection === "lessons"
              ? snap.data().courseId !== ARABIC_COURSE_ID
              : rows[i].collection === "exams"
                ? snap.data().lessonId !== ARABIC_LESSON_ID
                : snap.data().examId !== rows[i].data.examId),
        )
      )
        throw new Error("تعارض مع محتوى موجود؛ لم يتم استبداله");
      if (!existing[0].exists() && !pdfUrl)
        throw new Error("اختر ملف المحاضرة التاسيسية عربي.pdf ثم أعد الإضافة");
      const missing = rows.filter((_, i) => !existing[i].exists());
      if (!missing.length) return 0;
      missing.forEach((row) =>
        tx.set(doc(db, row.collection, row.id), row.data),
      );
      const modules = live.data()?.modules || [];
      tx.update(courseRef, {
        modules: modules.some(
          (m: { id: string }) => m.id === "arabic-foundation",
        )
          ? modules
          : [
              ...modules,
              { id: "arabic-foundation", title: "المحاضرة التأسيسية — عربي" },
            ],
        lessonsCount:
          lessons.docs.filter((d) => d.data().isPublished !== false).length +
          (existing[0].exists() ? 0 : 1),
        homeworkCount:
          exams.docs.filter((d) => d.data().isActive !== false).length +
          missing.filter((r) => r.collection === "exams").length,
        revision: (live.data()?.revision || 0) + 1,
        updatedAt: new Date().toISOString(),
      });
      return missing.length;
    });
    return {
      ok: true,
      message: created
        ? "تمت إضافة الدرس الرابع وملفه وفيديوه وامتحانيه دون تغيير المحتوى القديم"
        : "الدرس الرابع موجود بالفعل؛ لم يتم تكراره أو تعديل نتائجه",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "تعذرت الإضافة",
    };
  }
}
