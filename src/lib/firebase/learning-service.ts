import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "./config";
import { normalizeCourse } from "./services";
import { hasCourseAccess } from "./course-payment";
import { learningStats } from "../learning-stats";
export async function loadMyLearning() {
  await auth.authStateReady();
  const uid = auth.currentUser?.uid;
  if (!uid) return { courses: [], ...learningStats([], [], [], []) };
  const snap = await getDocs(collection(db, "courses"));
  const all = snap.docs
    .map((d) => normalizeCourse(d.id, d.data()))
    .filter((c) => c.isPublished);
  const access = await Promise.all(
    all.map((c) => hasCourseAccess(db, uid, c.id)),
  );
  const courses = all.filter((_, i) => access[i]);
  const [progress, attempts, ...content] = await Promise.all([
    getDocs(
      query(collection(db, "lesson_progress"), where("studentId", "==", uid)),
    ),
    getDocs(
      query(collection(db, "exam_attempts"), where("studentId", "==", uid)),
    ),
    ...courses.flatMap((c) => [
      getDocs(query(collection(db, "lessons"), where("courseId", "==", c.id))),
      getDocs(query(collection(db, "exams"), where("courseId", "==", c.id))),
    ]),
  ]);
  const lessons: string[] = [],
    exams: { id: string; lessonId: string }[] = [];
  content.forEach((snap, i) => {
    if (i % 2 === 0)
      snap.docs
        .filter((d) => d.data().isPublished !== false)
        .forEach((d) => lessons.push(d.id));
    else
      snap.docs
        .filter((d) => d.data().isActive !== false)
        .forEach((d) => exams.push({ id: d.id, lessonId: d.data().lessonId }));
  });
  return {
    courses,
    ...learningStats(
      lessons,
      exams.filter((e) => lessons.includes(e.lessonId)).map((e) => e.id),
      progress.docs.map(
        (d) => d.data() as { lessonId: string; completedAt: string },
      ),
      attempts.docs.map(
        (d) =>
          ({ id: d.id, ...d.data() }) as {
            id: string;
            examId: string;
            status: string;
            submittedAt?: string;
            createdAt: string;
          },
      ),
    ),
  };
}
