import { initializeServerApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { headers } from "next/headers";
import { firebaseConfig } from "./config";
export async function studentDatabase(token?: string) {
  if (!token) throw new Error("سجل الدخول أولاً");
  const app = initializeServerApp(firebaseConfig, {
    authIdToken: token,
    releaseOnDeref: headers(),
  });
  const auth = getAuth(app);
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error("انتهت الجلسة");
  return { db: getFirestore(app), uid: auth.currentUser.uid };
}
