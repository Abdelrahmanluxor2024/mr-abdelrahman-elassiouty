"use server";
import { initializeServerApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, runTransaction } from "firebase/firestore";
import { headers } from "next/headers";
import { firebaseConfig } from "@/lib/firebase/config";
import { hasCourseAccess } from "@/lib/firebase/course-payment";
export async function completeLesson(
  lessonId: string,
  token?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!token) throw new Error("سجّل الدخول أولاً");
    const app = initializeServerApp(firebaseConfig, {
      authIdToken: token,
      releaseOnDeref: headers(),
    });
    const auth = getAuth(app);
    await auth.authStateReady();
    if (!auth.currentUser) throw new Error("انتهت الجلسة");
    const db = getFirestore(app),
      uid = auth.currentUser.uid;
    const lesson = await getDoc(doc(db, "lessons", lessonId));
    if (
      !lesson.exists() ||
      lesson.data().isPublished === false ||
      !(await hasCourseAccess(db, uid, lesson.data().courseId))
    )
      throw new Error("الدرس غير متاح لحسابك");
    const ref = doc(db, "lesson_progress", `${uid}_${lessonId}`);
    await runTransaction(db, async (tx) => {
      const prior = await tx.get(ref);
      if (!prior.exists())
        tx.set(ref, {
          studentId: uid,
          lessonId,
          courseId: lesson.data().courseId,
          completedAt: new Date().toISOString(),
          source: "student_confirmation",
        });
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "تعذر حفظ تقدمك",
    };
  }
}
