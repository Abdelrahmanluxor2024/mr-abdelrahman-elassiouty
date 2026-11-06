import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const DEFAULT_STORAGE_BUCKET = "mr-ass-4fc50.firebasestorage.app";
export const firebaseConfig = {
  apiKey: "AIzaSyDMt3ultpdMtIX6mvUN_YigLf8d30QlR7A",
  authDomain: "mr-ass-4fc50.firebaseapp.com",
  projectId: "mr-ass-4fc50",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ||
    DEFAULT_STORAGE_BUCKET,
  messagingSenderId: "27487804656",
  appId: "1:27487804656:web:216073275f20d16b167635",
  measurementId: "G-R438E7BPJ9",
};

// This project created storage for the custom domain <project>.firebasestorage.app.
// It has no appspot.com bucket, so an unset/empty env value must not win:
// the SDK defaults to <project>.appspot.com in that case, which does not exist
// here and answers every upload with storage/unknown at 0%.
export const storageBucket =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() ||
  DEFAULT_STORAGE_BUCKET;

const app = !getApps().length
  ? initializeApp({ ...firebaseConfig, storageBucket })
  : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
// Bound retries so a denied/misconfigured bucket does not appear to upload forever.
storage.maxUploadRetryTime = 60000;
storage.maxOperationRetryTime = 30000;
