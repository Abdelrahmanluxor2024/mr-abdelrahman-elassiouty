import { ref, listAll } from "firebase/storage";
import { storage } from "./config";

/**
 * The bucket name in the deployed config can be wrong or the bucket can be
 * missing entirely. When that happens the Firebase SDK hides the real HTTP 404
 * behind `storage/unknown`, so the UI kept showing a generic transfer failure
 * and every retry looked like a network problem.
 *
 * This probe asks the bucket itself (one cheap listing request). `listAll` on a
 * missing bucket answers HTTP 404; on a healthy bucket it answers 200 or 403.
 * That is the only reliable way to tell "wrong/missing bucket" apart from
 * "permission", "network" or "quota" without a service account.
 */
export const CONFIGURED_STORAGE_BUCKET = storage.app.options.storageBucket || "";

/** Firebase Storage endpoint for the bucket the app is actually configured to use. */
export function storageBucketEndpoint(bucket = CONFIGURED_STORAGE_BUCKET) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o`;
}

function probeText(error: unknown) {
  const raw = error as {
    code?: unknown;
    status?: unknown;
    serverResponse?: unknown;
    message?: unknown;
  };
  return {
    code: String(raw?.code || ""),
    status: Number(raw?.status || 0),
    text: `${String(raw?.serverResponse ?? "")} ${String(raw?.message ?? "")}`.toLowerCase(),
  };
}

/**
 * True only when the bucket positively answered "I do not exist".
 * Offline errors, timeouts, quota and permission answers all return false so a
 * flaky probe can never invent a failure that the real transfer would not have.
 */
export function isMissingBucketError(error: unknown) {
  const { status, text } = probeText(error);
  if (status === 402) return false;
  if (status === 404 || status === 400) return true;
  return (
    text.includes("does not exist") ||
    text.includes("no such bucket") ||
    text.includes("nosuchbucket") ||
    text.includes("bucket not found")
  );
}

// A healthy answer is cached briefly: one listing request per upload burst, not
// one per file. A failure is never cached, so fixing the bucket takes effect on
// the next attempt without a reload.
let healthyUntil = 0;
const HEALTHY_TTL_MS = 5 * 60 * 1000;

export type BucketProbe =
  | { ok: true; bucket: string }
  | { ok: false; bucket: string; missing: boolean; code: string };

/** Never throws: reports what the bucket answered so the UI can show it verbatim. */
export async function checkStorageBucket(): Promise<BucketProbe> {
  const bucket = CONFIGURED_STORAGE_BUCKET;
  // An empty bucket name makes the SDK throw `storage/no-default-bucket` on the
  // very first request, which used to surface as a bare "know more" message.
  if (!bucket) return { ok: false, bucket: "", missing: true, code: "no-default-bucket" };
  if (Date.now() < healthyUntil) return { ok: true, bucket };
  try {
    await listAll(ref(storage, "upload-check"));
    healthyUntil = Date.now() + HEALTHY_TTL_MS;
    return { ok: true, bucket };
  } catch (error) {
    const { code } = probeText(error);
    if (code === "storage/unknown" && isMissingBucketError(error))
      return { ok: false, bucket, missing: true, code };
    if (isMissingBucketError(error) && code !== "storage/unauthorized")
      return { ok: false, bucket, missing: true, code };
    // Permission answers still prove the bucket exists; anything else is a
    // transport problem: the real upload reports it with its own error code.
    return { ok: true, bucket };
  }
}

export function missingBucketMessage(bucket: string) {
  if (!bucket)
    return (
      "لم يُضبط اسم دلو Firebase Storage في الموقع (NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET فارغ)، " +
      "لذلك لا يستطيع المتصفح الاتصال بأي دلو. ضع اسم الدلو من Firebase Console ← Storage ثم أعد النشر."
    );
  return (
    `Firebase Storage يرفض اسم الدلو «${bucket}»: الدلو غير موجود في المشروع mr-ass-4fc50 أو لم يُفعّل التخزين بعد. ` +
    "هذا خلل إعدادات في Firebase، وليس شبكة أو صلاحيات الحساب. افتح Firebase Console ← Storage، فعّل/أعد ربط التخزين، " +
    "انسخ اسم الدلو كما هو (عادة mr-ass-4fc50.firebasestorage.app) وضعه في NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ثم أعد النشر."
  );
}
