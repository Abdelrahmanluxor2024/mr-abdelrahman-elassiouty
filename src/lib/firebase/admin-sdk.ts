import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { firebaseConfig } from "./config";

/**
 * Firebase Admin SDK for server-only work that the client SDK cannot do:
 * deleting another user's Auth account and bypassing client-side rules.
 *
 * The service account key lives only in the FIREBASE_SERVICE_ACCOUNT_KEY
 * environment variable (JSON). It is never sent to the browser.
 */
let cachedApp: App | undefined;

function adminApp(): App {
  if (cachedApp) return cachedApp;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw)
    throw new Error(
      "لم يُضبط FIREBASE_SERVICE_ACCOUNT_KEY في Vercel. أضف مفتاح Service Account ثم أعد النشر.",
    );
  let creds: ServiceAccount & { project_id?: string };
  try {
    creds = JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY ليس JSON صالحاً");
  }
  if (creds.project_id !== firebaseConfig.projectId)
    throw new Error(
      "مفتاح Service Account ليس لمشروع الموقع. تأكد إنه من مشروع mr-ass-4fc50.",
    );
  cachedApp =
    getApps()[0] ??
    initializeApp({
      credential: cert(creds),
      projectId: firebaseConfig.projectId,
    });
  return cachedApp;
}

export function adminAuth() {
  return getAuth(adminApp());
}

export function adminDb() {
  return getFirestore(adminApp());
}
