/**
 * Server-side rules for every uploaded file.
 *
 * Files live in Vercel Blob (no Firebase Storage bucket exists in this project:
 * Firebase has required the Blaze plan for any bucket since February 2026, and
 * Vercel Blob Hobby is usable without a card). Because Blob is served from a
 * plain public URL, nothing about a path is proof of anything: the only place
 * that decides whether a write may happen is the server, before it hands the
 * browser a short-lived token.
 *
 * A path is only accepted when its owner (an admin, or the signed-in account
 * for its own avatar/forum folder) is the account asking for the token.
 */

export const UPLOAD_AREAS = [
  "course-cover",
  "lesson-image",
  "lesson-pdf",
  "exam-question",
  "community",
  "notification",
  "avatar",
  "forum",
] as const;

export type UploadArea = (typeof UPLOAD_AREAS)[number];

export type UploadRules = { types: string[]; maxBytes: number };

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_PDF_BYTES = 20 * 1024 * 1024;

/** Space left for the random suffix Vercel Blob appends to the pathname. */
const SUFFIX_SLACK = 32;

export function uploadRules(area: UploadArea): UploadRules {
  return area === "lesson-pdf"
    ? { types: ["application/pdf"], maxBytes: MAX_PDF_BYTES }
    : { types: IMAGE_TYPES, maxBytes: MAX_IMAGE_BYTES };
}

export function maxPathLength(area: UploadArea) {
  // Vercel Blob rejects pathnames over 950 characters.
  return 900;
}

const SAFE_SEGMENT = /^[A-Za-z0-9_-]{1,128}$/;
const SAFE_FILE = /^[A-Za-z0-9_-]{1,120}\.(jpg|png|webp|pdf)$/;

function segments(pathname: string) {
  const parts = pathname.split("/");
  if (parts.some((part) => !part || part === "." || part === ".."))
    throw new Error("مسار الملف غير صالح");
  return parts;
}

function expectId(value: string | undefined, label: string) {
  if (!value || !SAFE_SEGMENT.test(value))
    throw new Error(`معرّف ${label} غير صالح`);
  return value;
}

export type UploadTarget = {
  area: UploadArea;
  /** Folder the file must live in; the uploader cannot choose another one. */
  prefix: string;
};

/**
 * Builds that folder without any role check, so the browser can validate its own
 * path shape. Permission is decided only on the server (uploadTarget below);
 * this function must never be treated as an authorization step.
 */
export function uploadPrefix(
  area: UploadArea,
  input: Record<string, string | undefined>,
  uid: string,
): string {
  switch (area) {
    case "course-cover":
      return `courses/${expectId(input.courseId, "الكورس")}/images`;
    case "lesson-image":
      return `courses/${expectId(input.courseId, "الكورس")}/lessons/${expectId(input.lessonId, "الدرس")}/images`;
    case "lesson-pdf":
      return `courses/${expectId(input.courseId, "الكورس")}/pdf`;
    case "exam-question": {
      const examId = input.examId?.trim();
      if (!examId || !SAFE_SEGMENT.test(examId))
        throw new Error("معرّف الامتحان غير صالح");
      return `questions/${examId}`;
    }
    case "community":
      return "admin/community/images";
    case "notification":
      return "admin/notifications/images";
    case "avatar":
      return `avatars/${expectId(uid, "الحساب")}`;
    case "forum":
      return `course-forums/${expectId(input.courseId, "الكورس")}/${expectId(uid, "الحساب")}`;
    default:
      throw new Error("نوع الرفع غير معروف");
  }
}

/**
 * Maps an upload request to the exact folder it may write to.
 * `owner` is the account that owns the content (a student for their avatar and
 * forum images, an admin for everything else).
 */
export function uploadTarget(
  area: UploadArea,
  input: Record<string, string | undefined>,
  owner: { uid: string; isAdmin: boolean },
): UploadTarget {
  const adminOnly = (allowed: boolean) => {
    if (!allowed) throw new Error("هذا الرفع للأدمن فقط");
  };
  switch (area) {
    case "course-cover":
      adminOnly(owner.isAdmin);
      return {
        area,
        prefix: `courses/${expectId(input.courseId, "الكورس")}/images`,
      };
    case "lesson-image":
      adminOnly(owner.isAdmin);
      return {
        area,
        prefix: `courses/${expectId(input.courseId, "الكورس")}/lessons/${expectId(input.lessonId, "الدرس")}/images`,
      };
    case "lesson-pdf":
      adminOnly(owner.isAdmin);
      return {
        area,
        prefix: `courses/${expectId(input.courseId, "الكورس")}/pdf`,
      };
    case "exam-question": {
      adminOnly(owner.isAdmin);
      const examId = input.examId?.trim();
      // The editor mints the exam id locally before the document exists, so the
      // id is an opaque token rather than a stored document id.
      if (!examId || !SAFE_SEGMENT.test(examId))
        throw new Error("معرّف الامتحان غير صالح");
      return { area, prefix: `questions/${examId}` };
    }
    case "community":
      adminOnly(owner.isAdmin);
      return { area, prefix: "admin/community/images" };
    case "notification":
      adminOnly(owner.isAdmin);
      return { area, prefix: "admin/notifications/images" };
    case "avatar":
      return { area, prefix: `avatars/${expectId(owner.uid, "الحساب")}` };
    case "forum":
      // Subscribing to the course is verified separately (forumAccess).
      return {
        area,
        prefix: `course-forums/${expectId(input.courseId, "الكورس")}/${expectId(owner.uid, "الحساب")}`,
      };
    default:
      throw new Error("نوع الرفع غير معروف");
  }
}

/** Full pathname validation: right folder, safe segments, allowed extension. */
export function assertPathForTarget(
  pathname: string,
  target: UploadTarget,
  rules = uploadRules(target.area),
) {
  if (!pathname || pathname.length > maxPathLength(target.area))
    throw new Error("مسار الملف طويل جداً");
  const parts = segments(pathname);
  const prefixParts = target.prefix.split("/");
  if (parts.length !== prefixParts.length + 1)
    throw new Error("مسار الملف خارج المجلد المسموح");
  prefixParts.forEach((expected, index) => {
    if (parts[index] !== expected)
      throw new Error("مسار الملف خارج المجلد المسموح");
  });
  const file = parts[parts.length - 1];
  if (!SAFE_FILE.test(file)) throw new Error("اسم الملف غير صالح");
  const ext = file.slice(file.lastIndexOf(".") + 1);
  const expectedExt =
    rules.types[0] === "application/pdf" ? "pdf" : null;
  if (expectedExt && ext !== expectedExt)
    throw new Error("امتداد الملف لا يطابق نوعه");
  if (!expectedExt && !["jpg", "png", "webp"].includes(ext))
    throw new Error("امتداد الملف لا يطابق نوعه");
  return pathname;
}

/** Extension a browser must use for a given accepted content type. */
export function extensionFor(contentType: string) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    default:
      throw new Error("نوع الملف غير مسموح");
  }
}

/**
 * Rejects a file whose declared type does not match its first bytes. A renamed
 * executable must not become a "PDF" just because the picker said so.
 */
export async function assertDeclaredType(file: Blob, contentType: string) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const startsWith = (...signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...bytes.slice(from, to));
  const jpeg = startsWith(0xff, 0xd8, 0xff);
  const png = startsWith(137, 80, 78, 71, 13, 10, 26, 10);
  const webp = ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  const pdf = ascii(0, 5) === "%PDF-";
  const matches =
    (contentType === "image/jpeg" && jpeg) ||
    (contentType === "image/png" && png) ||
    (contentType === "image/webp" && webp) ||
    (contentType === "application/pdf" && pdf);
  if (!matches)
    throw new Error(
      "محتوى الملف لا يطابق نوعه المعلن؛ لم يُقبل الملف",
    );
}

/** Only the store host may be recorded, so a stored URL can never be a trap. */
export function isStoredFileUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return (
    parsed.protocol === "https:" &&
    !parsed.username &&
    !parsed.password &&
    !parsed.port &&
    (parsed.hostname === "blob.vercel-storage.com" ||
      parsed.hostname.endsWith(".public.blob.vercel-storage.com"))
  );
}

export function isStoredPath(url: string) {
  if (!isStoredFileUrl(url)) return false;
  const path = new URL(url).pathname.replace(/^\//, "");
  return path.split("/").every((part) => part && !/[\\\s]/.test(part));
}

/** Path of one of our own blobs, used to delete it again. */
export function storedPathFromUrl(url: string) {
  if (!isStoredFileUrl(url)) throw new Error("رابط الملف غير صالح");
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
}
