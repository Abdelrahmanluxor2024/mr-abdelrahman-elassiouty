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
  ARABIC_PDF_URL,
  fourthLessonDocuments,
} from "@/lib/arabic-fourth-lesson";
export async function addFourthLesson(token?: string) {
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
    const rows = fourthLessonDocuments();
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
      const missing = rows.filter((_, i) => !existing[i].exists());
      // A one-time migration replaces only this lesson's bundled PDF URL.
      // Later teacher edits/archives remain intact on repeated page visits.
      const prior = existing[0].data();
      const migratePdf = existing[0].exists() && prior?.bundledPdfVersion !== 1;
      if (!missing.length && !migratePdf) return 0;
      if (migratePdf) {
        const files = Array.isArray(prior?.files) ? [...prior.files] : [];
        const index = files.findIndex((f) => f.id === "arabic-pdf");
        if (index >= 0) files[index] = { ...files[index], url: ARABIC_PDF_URL };
        else
          files.push({
            id: "arabic-pdf",
            title: "المحاضرة التاسيسية عربي",
            url: ARABIC_PDF_URL,
            locked: !!prior?.isPdfLocked,
          });
        tx.update(doc(db, "lessons", ARABIC_LESSON_ID), {
          files,
          pdfUrl: files[0].url,
          bundledPdfVersion: 1,
        });
      }
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
      return missing.length + (migratePdf ? 1 : 0);
    });
    return {
      ok: true,
      changed: created > 0,
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
