export type ImageAttachment = { url: string; path: string; name: string };
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export async function validateImageFile(file: File) {
  if (!file.size || file.size > MAX_IMAGE_BYTES)
    throw new Error("اختر صورة بحجم لا يزيد عن ٣ ميجابايت");
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
  const webp =
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  const type = jpeg
    ? "image/jpeg"
    : png
      ? "image/png"
      : webp
        ? "image/webp"
        : "";
  if (!type || file.type !== type)
    throw new Error(
      "الصور المسموحة JPG أو PNG أو WebP فقط؛ نوع الملف غير صحيح",
    );
  return type;
}
/**
 * Files live in Vercel Blob (see uploads/policy). Because the store is public,
 * this check is not an authorization step on its own: it makes sure the saved
 * attachment points at our own store and at this student's folder in this
 * course, so a post cannot embed a foreign URL or somebody else's file.
 */
export function validateForumImage(
  image: ImageAttachment | undefined,
  courseId: string,
  uid: string,
): ImageAttachment | undefined {
  if (!image) return undefined;
  if (
    typeof image.path !== "string" ||
    typeof image.url !== "string" ||
    typeof image.name !== "string"
  )
    throw new Error("مرفق غير صالح");
  let url: URL;
  try {
    url = new URL(image.url);
  } catch {
    throw new Error("رابط الصورة غير صالح");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !(
      url.hostname === "blob.vercel-storage.com" ||
      url.hostname.endsWith(".public.blob.vercel-storage.com")
    )
  )
    throw new Error("رابط الصورة غير صالح");
  const prefix = `course-forums/${courseId}/${uid}/`;
  const storedPath = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (
    !storedPath.startsWith(prefix) ||
    storedPath !== image.path ||
    !/^[-a-zA-Z0-9]+\.(jpg|png|webp)$/.test(
      storedPath.slice(prefix.length),
    )
  )
    throw new Error("الصورة ليست مرفوعة لهذا الحساب والكورس");
  return {
    url: url.toString(),
    path: storedPath,
    name: image.name.slice(0, 120),
  };
}
