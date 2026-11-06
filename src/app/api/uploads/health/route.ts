import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Confirms the deployment has a Blob store wired to it.
 *
 * It only reports whether the token exists and its store address is set; it
 * never echoes the token, so the answer is safe to show in the UI and to paste
 * into a bug report.
 */
export function GET() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return NextResponse.json({ ok: false, code: "no-token" });
  // The token encodes the store; expose only the id so a mismatch is visible.
  const storeId = /^vercel_blob_rw_([A-Za-z0-9]+)_/.exec(token)?.[1];
  return NextResponse.json({ ok: true, provider: "vercel-blob", storeId });
}
