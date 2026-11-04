export function normalizeStudentPhone(value: string) {
  if (typeof value !== "string") return "";
  let digits = value
    .trim()
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 1776))
    .replace(/[\s()+-]/g, "");
  if (digits.startsWith("0020")) digits = "0" + digits.slice(4);
  else if (digits.startsWith("20")) digits = "0" + digits.slice(2);
  return /^01[0125]\d{8}$/.test(digits) ? digits : "";
}
