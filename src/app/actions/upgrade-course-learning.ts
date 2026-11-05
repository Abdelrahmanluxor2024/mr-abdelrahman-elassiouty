"use server";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  runTransaction,
} from "firebase/firestore";
import { adminDatabase } from "@/lib/firebase/admin-database";
import { ARABIC_COURSE_ID, ARABIC_LESSON_ID } from "@/lib/arabic-fourth-lesson";
import { courseExplanations } from "@/lib/learning-explanations";
import { fourthLessonDocuments } from "@/lib/arabic-fourth-lesson";
import {
  comprehensiveDocuments,
  foundationExplanation,
} from "@/lib/comprehensive-exam";
/** Explicit versioned migration. Never writes attempts/results or overwrites later policy edits. */
export async function upgradeCourseLearning(token?: string) {
  try {
    const { db, uid } = await adminDatabase(token);
    const courseRef = doc(db, "courses", ARABIC_COURSE_ID);
    const course = await getDoc(courseRef);
    if (!course.exists()) return { ok: true, changed: false };
    const markerRef = doc(
      db,
      "course_migrations",
      `${ARABIC_COURSE_ID}_learning_v2`,
    );
    if ((await getDoc(markerRef)).exists()) return { ok: true, changed: false };
    const [exams, lessons, questions] = await Promise.all(
      ["exams", "lessons", "questions"].map((name) =>
        getDocs(
          name === "questions"
            ? collection(db, name)
            : query(
                collection(db, name),
                where("courseId", "==", ARABIC_COURSE_ID),
              ),
        ),
      ),
    );
    const rows = comprehensiveDocuments();
    const explanationMap = { ...courseExplanations };
    fourthLessonDocuments()
      .filter((r) => r.collection === "questions")
      .forEach((q) => {
        const index = q.data.examId.endsWith("-1") ? 1 : 2;
        explanationMap[q.data.questionText] = foundationExplanation(
          q.data.orderIndex,
          index,
        );
      });
    const changes = exams.docs.filter((e) => e.id !== rows[1].id);
    const examIds = new Set(changes.map((e) => e.id));
    const qs = questions.docs.filter((q) => examIds.has(q.data().examId));
    if (qs.length + rows.length + changes.length > 440)
      throw new Error("عدد الأسئلة كبير؛ يلزم تقسيم التحديث بأمان");
    return await runTransaction(db, async (tx) => {
      const [marker, admin, live, ...existing] = await Promise.all([
        tx.get(markerRef),
        tx.get(doc(db, "users", uid)),
        tx.get(courseRef),
        ...rows.map((r) => tx.get(doc(db, r.collection, r.id))),
      ]);
      if (admin.data()?.role !== "admin") throw new Error("غير مصرح");
      if (marker.exists()) return { ok: true, changed: false };
      existing.forEach((snap, i) => {
        if (
          snap.exists() &&
          (rows[i].collection === "lessons"
            ? snap.data()?.courseId !== ARABIC_COURSE_ID
            : rows[i].collection === "exams"
              ? snap.data()?.lessonId !== rows[0].id
              : snap.data()?.examId !== rows[1].id)
        )
          throw new Error("تعارض مع محتوى موجود؛ لم نغيره");
      });
      if ((live.data()?.revision || 0) !== (course.data()?.revision || 0))
        throw new Error("الكورس اتعدل؛ حدث الصفحة");
      // Read every target before writes, preserve concurrent teacher edits.
      const current = await Promise.all(
        [...changes, ...qs].map((s) => tx.get(s.ref)),
      );
      rows.forEach((r, i) => {
        if (!existing[i].exists()) tx.set(doc(db, r.collection, r.id), r.data);
      });
      changes.forEach((e, i) => {
        if (current[i].exists())
          tx.update(e.ref, { maxAttempts: 0, antiCheat: false });
      });
      qs.forEach((q, i) => {
        const d = current[changes.length + i].data();
        if (d && !d.explanation && explanationMap[d.questionText])
          tx.update(q.ref, { explanation: explanationMap[d.questionText] });
      });
      tx.update(courseRef, {
        lessonsCount: lessons.size + (existing[0].exists() ? 0 : 1),
        homeworkCount: exams.size + (existing[1].exists() ? 0 : 1),
        revision: (live.data()?.revision || 0) + 1,
      });
      tx.set(markerRef, {
        version: 2,
        createdAt: new Date().toISOString(),
        createdBy: uid,
      });
      return { ok: true, changed: true };
    });
  } catch (e) {
    return {
      ok: false,
      changed: false,
      error: e instanceof Error ? e.message : "تعذر تحديث الكورس",
    };
  }
}
