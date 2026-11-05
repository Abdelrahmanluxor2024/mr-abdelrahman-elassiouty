export function normalizeStudentPhone(value: unknown) {
  if (
    typeof value !== "string" &&
    !(typeof value === "number" && Number.isSafeInteger(value) && value > 0)
  )
    return "";
  let digits = String(value)
    .trim()
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
    .replace(/[\s()+.\-\u200e\u200f\u061c]/g, "");
  if (digits.startsWith("0020")) digits = digits.slice(4);
  else if (digits.startsWith("20")) digits = digits.slice(2);
  if (/^1[0125]\d{8}$/.test(digits)) digits = "0" + digits;
  return /^01[0125]\d{8}$/.test(digits) ? digits : "";
}
/** Student's own numbers only: never use a parent/emergency number. */
export function studentPhoneMatches(
  profile: Record<string, unknown>,
  phone: string,
  documentId = "",
) {
  const values = [
    "phone",
    "phoneNumber",
    "phone_number",
    "mobile",
    "mobileNumber",
    "mobile_number",
    "studentPhone",
    "student_phone",
  ].map((key) => profile[key]);
  const email = typeof profile.email === "string" ? profile.email : "";
  if (/^[^@]+@(?:mr-ass|mrass)\.app$/i.test(email))
    values.push(email.split("@")[0]);
  // Some legacy profiles were keyed by phone rather than UID.
  values.push(documentId);
  return (
    !!phone && values.some((value) => normalizeStudentPhone(value) === phone)
  );
}
