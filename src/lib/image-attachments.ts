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
export function validateForumImage(
  image: ImageAttachment | undefined,
  courseId: string,
  uid: string,
  bucket: string,
): ImageAttachment | undefined {
  if (!image) return undefined;
  if (
    typeof image.path !== "string" ||
    typeof image.url !== "string" ||
    typeof image.name !== "string"
  )
    throw new Error("مرفق غير صالح");
  const prefix = `course-forums/${courseId}/${uid}/`;
  if (
    !image.path.startsWith(prefix) ||
    !/^[-a-zA-Z0-9]+\.(jpg|png|webp)$/.test(image.path.slice(prefix.length))
  )
    throw new Error("الصورة ليست مرفوعة لهذا الحساب والكورس");
  const url = new URL(image.url);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "firebasestorage.googleapis.com" ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== `/v0/b/${bucket}/o/${encodeURIComponent(image.path)}` ||
    url.searchParams.get("alt") !== "media"
  )
    throw new Error("رابط الصورة غير صالح");
  return {
    url: url.toString(),
    path: image.path,
    name: image.name.slice(0, 120),
  };
}
