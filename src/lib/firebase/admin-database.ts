import { initializeServerApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { headers } from "next/headers";
import { firebaseConfig } from "./config";
export async function adminDatabase(token?: string) {
  if (!token) throw new Error("سجّل الدخول بحساب المسؤول");
  const app = initializeServerApp(firebaseConfig, {
    authIdToken: token,
    releaseOnDeref: headers(),
  });
  const auth = getAuth(app);
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error("انتهت الجلسة");
  const db = getFirestore(app),
    uid = auth.currentUser.uid;
  const profile = await getDoc(doc(db, "users", uid));
  if (!profile.exists() || profile.data().role !== "admin")
    throw new Error("هذا الإجراء للمسؤول فقط");
  return { db, uid };
}
