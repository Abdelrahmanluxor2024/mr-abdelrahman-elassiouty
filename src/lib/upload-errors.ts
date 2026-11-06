export function uploadErrorMessage(error: unknown) {
  const code =
    typeof error === "object" && error
      ? String((error as { code?: unknown }).code || "")
      : "";
  const messages: Record<string, string> = {
    "storage/unauthorized":
      "Firebase Storage رفض الرفع: راجع قواعد التخزين وصلاحية الحساب للمسار المطلوب.",
    "storage/unauthenticated":
      "جلسة الدخول غير صالحة لرفع الملفات. سجل الدخول مرة أخرى.",
    "storage/bucket-not-found":
      "دلو Firebase Storage غير موجود. فعّل Storage وتحقق من اسم الدلو في إعدادات الموقع.",
    "storage/project-not-found":
      "مشروع التخزين غير موجود أو إعداداته غير صحيحة.",
    "storage/quota-exceeded":
      "تجاوز التخزين الحصة المتاحة. راجع مساحة التخزين وخطة الفوترة في Firebase.",
    "storage/retry-limit-exceeded":
      "تعذر الاتصال بالتخزين خلال المهلة. تحقق من الشبكة وCORS وإعدادات Storage.",
    "storage/canceled":
      "توقف الرفع لعدم تقدم الاتصال. أعد المحاولة وتحقق من إعدادات التخزين.",
    "storage/invalid-checksum": "الملف لم يصل سليماً للتخزين؛ أعد رفعه.",
    "storage/object-not-found":
      "لم يوجد الملف بعد الرفع؛ لم يتم اعتماد الرابط.",
  };
  return messages[code]
    ? `${messages[code]} (${code})`
    : typeof error === "object" &&
        error &&
        typeof (error as { message?: unknown }).message === "string"
      ? String((error as { message: string }).message)
      : "تعذر رفع الملف. تحقق من الشبكة وإعدادات Firebase Storage.";
}
