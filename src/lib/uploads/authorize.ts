import { initializeServerApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { firebaseConfig } from "@/lib/firebase/config";
import { hasCourseAccess } from "@/lib/firebase/course-payment";

export type Uploader = { uid: string; isAdmin: boolean };

/**
 * Verifies the Firebase ID token the browser sent with an upload request and
 * reads the role from Firestore. Nothing is trusted from the request itself:
 * a caller cannot claim to be an admin by sending a path or a header.
 */
export async function verifyUploader(
  token: string | null,
): Promise<Uploader> {
  if (!token) throw new Error("سجّل الدخول قبل رفع الملفات");
  const app = initializeServerApp(firebaseConfig, { authIdToken: token });
  const auth = getAuth(app);
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error("انتهت الجلسة؛ سجّل الدخول من جديد");
  const db = getFirestore(app);
  const profile = await getDoc(doc(db, "users", user.uid));
  return { uid: user.uid, isAdmin: profile.data()?.role === "admin" };
}

/** Forum images are for the account that actually subscribed to the course. */
export async function assertForumAccess(token: string, courseId: string) {
  const app = initializeServerApp(firebaseConfig, { authIdToken: token });
  const auth = getAuth(app);
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error("انتهت الجلسة؛ سجّل الدخول من جديد");
  const allowed = await hasCourseAccess(
    getFirestore(app),
    user.uid,
    courseId,
  );
  if (!allowed) throw new Error("رفع الصور في المنتدى لمشتركي الكورس فقط");
}

/** Bearer token from the request headers, or null. */
export function bearerToken(headers: Headers) {
  const value = headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(value.trim());
  return match ? match[1] : null;
}
