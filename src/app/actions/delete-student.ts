"use server";

import { FieldPath, type Query } from "firebase-admin/firestore";
import { del, list } from "@vercel/blob";
import { adminAuth, adminDb } from "@/lib/firebase/admin-sdk";

/** Collections that hold a `studentId` field pointing at the student. */
const STUDENT_COLLECTIONS = [
  "enrollments",
  "wallet_transactions",
  "exam_attempts",
  "student_answers",
  "lesson_progress",
  "exam_attempt_grants",
  "course_forum_posts",
] as const;

/** Deletes every document matched by the query, in batches of 400. */
async function deleteQuery(q: Query): Promise<number> {
  const db = adminDb();
  let total = 0;
  for (;;) {
    const snap = await q.limit(400).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    total += snap.size;
  }
  return total;
}

/**
 * Removes the student's uploaded files: the profile avatar and forum images.
 * Course forum images live under course-forums/{courseId}/{uid}/, so the
 * listing filters on the uid segment.
 */
async function deleteStudentBlobs(uid: string): Promise<number> {
  const matches = (pathname: string) =>
    pathname.startsWith(`avatars/${uid}/`) ||
    (pathname.startsWith("course-forums/") &&
      pathname.includes(`/${uid}/`));

  const urls: string[] = [];
  for (const prefix of ["avatars/", "course-forums/"]) {
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, limit: 1000 });
      for (const b of page.blobs) if (matches(b.pathname)) urls.push(b.url);
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
  }
  for (let i = 0; i < urls.length; i += 100) {
    await del(urls.slice(i, i + 100));
  }
  return urls.length;
}

/**
 * Permanently deletes a student account: their data, their uploaded files,
 * their Firebase Auth login, and their profile. Admins only.
 *
 * Order matters for retries. Data and files go first, the Auth login next,
 * and the profile last. If a step fails the profile still exists, so the
 * admin can press delete again from the students list.
 */
export async function deleteStudentAccount(input: {
  idToken: string;
  targetUid: string;
}) {
  const targetUid = (input.targetUid || "").trim();
  if (!input.idToken) throw new Error("سجّل الدخول بحساب المسؤول");
  if (!targetUid || targetUid.includes("/"))
    throw new Error("معرّف الطالب غير صالح");

  let callerUid: string;
  try {
    callerUid = (await adminAuth().verifyIdToken(input.idToken)).uid;
  } catch {
    throw new Error("انتهت الجلسة؛ سجّل الدخول من جديد");
  }

  const db = adminDb();
  const callerProfile = await db.doc(`users/${callerUid}`).get();
  if (callerProfile.data()?.role !== "admin")
    throw new Error("هذا الإجراء للمسؤول فقط");
  if (targetUid === callerUid)
    throw new Error("لا يمكنك حذف حسابك الشخصي");

  const targetProfile = await db.doc(`users/${targetUid}`).get();
  if (targetProfile.data()?.role === "admin")
    throw new Error("لا يمكن حذف حساب مسؤول من هذه الصفحة");

  const counts: Record<string, number> = {};
  for (const name of STUDENT_COLLECTIONS) {
    counts[name] = await deleteQuery(
      db.collection(name).where("studentId", "==", targetUid),
    );
  }
  // Exam attempt counters are keyed `${uid}_${examId}`, so match by ID prefix.
  counts.exam_attempt_counters = await deleteQuery(
    db
      .collection("exam_attempt_counters")
      .where(FieldPath.documentId(), ">=", `${targetUid}_`)
      .where(FieldPath.documentId(), "<", `${targetUid}_\uf8ff`),
  );

  counts.blobs = await deleteStudentBlobs(targetUid);

  try {
    await adminAuth().deleteUser(targetUid);
    counts.auth = 1;
  } catch (err: any) {
    if (err?.code !== "auth/user-not-found") throw err;
    counts.auth = 0;
  }

  await db.doc(`users/${targetUid}`).delete();
  return { ok: true as const, counts };
}
