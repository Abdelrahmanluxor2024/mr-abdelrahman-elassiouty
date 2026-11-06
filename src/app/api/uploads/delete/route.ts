import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import {
  UPLOAD_AREAS,
  assertPathForTarget,
  storedPathFromUrl,
  uploadTarget,
  type UploadArea,
} from "@/lib/uploads/policy";
import { bearerToken, verifyUploader } from "@/lib/uploads/authorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deletes one of our own blobs. Used to clean up a demo/test file or a file the
 * user removed before saving. Only the account that owns the folder may delete
 * from it, and only paths inside a known folder are accepted, so this cannot be
 * used to remove another teacher's or student's file.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      url?: string;
      area?: UploadArea;
      courseId?: string;
      lessonId?: string;
      examId?: string;
    } | null;
    if (!body?.url || !body.area || !UPLOAD_AREAS.includes(body.area))
      return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });

    const uploader = await verifyUploader(bearerToken(request.headers));
    const target = uploadTarget(body.area, body, uploader);
    assertPathForTarget(storedPathFromUrl(body.url), target);
    await del(body.url);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر حذف الملف" },
      { status: 403 },
    );
  }
}
