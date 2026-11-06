/**
 * Uploads run through Vercel Blob Hobby, not Firebase Storage.
 *
 * There is no bucket in the mr-ass-4fc50 project, and since February 2026
 * Firebase refuses to create (or grant access to) any bucket unless the project
 * is on the Blaze plan with a billing account. Vercel Blob Hobby needs no card.
 *
 * This module is the one place that answers "is the upload store usable?" so the
 * diagnostics UI and the error messages cannot drift apart.
 */
export const UPLOAD_PROVIDER = "vercel-blob";

export type StoreProbe =
  | { ok: true; provider: string }
  | { ok: false; provider: string; code: string };

export function missingStoreMessage(code: string) {
  if (code === "no-token")
    return (
      "لم يُضبط Vercel Blob في هذا النشر. افتح Vercel ← Storage ← Create Database ← Blob، " +
      "واربطه بالمشروع (Vercel يضيف BLOB_READ_WRITE_TOKEN تلقائياً)، ثم أعد النشر."
    );
  return `تعذر تجهيز التخزين (${code}). راجع Blob store في Vercel ثم أعد المحاولة.`;
}

/** Never throws: reports what the deployment's upload store answered. */
export async function checkStorageBucket(): Promise<StoreProbe> {
  try {
    const response = await fetch("/api/uploads/health", { cache: "no-store" });
    const body = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      code?: string;
    };
    if (response.ok && body.ok) return { ok: true, provider: UPLOAD_PROVIDER };
    return {
      ok: false,
      provider: UPLOAD_PROVIDER,
      code: body.code || `http-${response.status}`,
    };
  } catch {
    return { ok: false, provider: UPLOAD_PROVIDER, code: "network" };
  }
}
