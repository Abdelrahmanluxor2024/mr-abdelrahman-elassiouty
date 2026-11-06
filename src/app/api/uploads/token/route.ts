import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import {
  UPLOAD_AREAS,
  assertPathForTarget,
  uploadRules,
  uploadTarget,
  type UploadArea,
} from "@/lib/uploads/policy";
import {
  assertForumAccess,
  bearerToken,
  verifyUploader,
} from "@/lib/uploads/authorize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Issues a short-lived Vercel Blob token for exactly one pathname.
 *
 * The browser talks to Vercel Blob directly, so a 20 MiB PDF never has to pass
 * through a serverless function body limit. The price of that is this route:
 * it decides who may write where, and the token it hands out is bound to that
 * single path, content type, size and a 10 minute window.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  const token = bearerToken(request.headers);

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let payload: {
          area?: UploadArea;
          courseId?: string;
          lessonId?: string;
          examId?: string;
        };
        try {
          payload = JSON.parse(clientPayload || "{}");
        } catch {
          throw new Error("بيانات الرفع غير صالحة");
        }
        const area = payload.area;
        if (!area || !UPLOAD_AREAS.includes(area))
          throw new Error("نوع الرفع غير معروف");

        const uploader = await verifyUploader(token);
        const target = uploadTarget(area, payload, uploader);
        assertPathForTarget(pathname, target);
        if (area === "forum") {
          if (!token) throw new Error("سجّل الدخول قبل رفع الملفات");
          await assertForumAccess(token, payload.courseId || "");
        }
        const rules = uploadRules(area);
        return {
          allowedContentTypes: rules.types,
          maximumSizeInBytes: rules.maxBytes,
          addRandomSuffix: true,
          cacheControlMaxAge: 60 * 60 * 24 * 30,
          validUntil: Date.now() + 10 * 60 * 1000,
          tokenPayload: JSON.stringify({ area, uploader: uploader.uid, pathname }),
        };
      },
      // Nothing is linked to a course, lesson, post or account here. The caller
      // saves the returned URL itself, after its own permission checks, so a
      // callback cannot attach a file to somebody else's content.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "تعذر تجهيز طلب الرفع";
    // The Blob SDK hides this body from the browser, so keep the real reason in
    // the server logs (Vercel → Logs) where it can be read.
    console.error("[uploads/token] refused:", message, error);
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
