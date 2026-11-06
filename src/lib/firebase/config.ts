import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyDMt3ultpdMtIX6mvUN_YigLf8d30QlR7A",
  authDomain: "mr-ass-4fc50.firebaseapp.com",
  projectId: "mr-ass-4fc50",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "mr-ass-4fc50.firebasestorage.app",
  messagingSenderId: "27487804656",
  appId: "1:27487804656:web:216073275f20d16b167635",
  measurementId: "G-R438E7BPJ9",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
// Bound retries so a denied/misconfigured bucket does not appear to upload forever.
storage.maxUploadRetryTime = 60000;
storage.maxOperationRetryTime = 30000;
