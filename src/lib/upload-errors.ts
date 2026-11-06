export function uploadErrorMessage(error: unknown) {
  const raw =
    typeof error === "object" && error
      ? (error as {
          code?: unknown;
          name?: unknown;
          message?: unknown;
          serverResponse?: unknown;
          status?: unknown;
        })
      : {};
  // The Blob client reports its failures through the error name; keep the
  // Firebase-style `code` for the paths that still throw one.
  const code = String(raw.code || raw.name || "");
  const server = String(raw.serverResponse ?? "");
  const messages: Record<string, string> = {
    "no-token":
      "لم يُضبط Vercel Blob في هذا النشر: أنشئ Blob store من Vercel واربطه بالمشروع ثم أعد النشر.",
    BlobStoreNotFoundError:
      "مخزن الملفات في Vercel غير موجود أو غير مربوط بهذا المشروع. راجع Storage ← Blob في Vercel.",
    BlobStoreSuspendedError:
      "تم تعليق مخزن Vercel Blob. راجع لوحة Vercel ← Storage.",
    BlobAccessError:
      "Vercel رفض الكتابة في المخزن. السبب الأشهر: المخزن أُنشئ بصلاحية Private والموقع يرفع ملفات عامة. " +
      "أنشئ Blob store من نوع Public (Public: من يملك الرابط يفتحه، وهو المطلوب للصور وملفات PDF)، " +
      "أو تحقق من BLOB_READ_WRITE_TOKEN إن كان المخزن Public بالفعل.",
    BlobContentTypeNotAllowedError:
      "نوع الملف غير مسموح لهذا المسار (صور JPG/PNG/WebP أو PDF فقط).",
    BlobFileTooLargeError:
      "حجم الملف أكبر من الحد المسموح لهذا المسار.",
    BlobServiceRateLimited:
      "تم تجاوز حد الطلبات إلى Vercel Blob مؤقتاً؛ حاول بعد قليل.",
    BlobServiceNotAvailable:
      "خدمة Vercel Blob غير متاحة الآن؛ حاول بعد قليل.",
    "upload/client-token":
      "تعذر الحصول على تصريح الرفع من الخادم. أعد تسجيل الدخول وتأكد من صلاحيتك.",
    "storage/unauthorized":
      "Firebase Storage رفض الرفع: راجع قواعد التخزين وصلاحية الحساب للمسار المطلوب.",
    "storage/unauthenticated":
      "جلسة الدخول غير صالحة لرفع الملفات. سجل الدخول مرة أخرى.",
    "storage/unauthorized-app":
      "Firebase App Check رفض الطلب. راجع تفعيل App Check للموقع أو أوقفه للتخزين.",
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
    "storage/server-file-wrong-size":
      "التخزين استلم حجماً مختلفاً عن الملف؛ لم يتم اعتماد الرابط.",
    "upload/bucket-not-found":
      "دلو Firebase Storage المستخدم في الموقع غير موجود. راجع اسم الدلو في إعدادات Firebase.",
  };
  // `storage/unknown` is what the SDK throws when the bucket name does not
  // exist, because it only maps 401/402/403/404 for object reads. Show the
  // server body so the real cause is visible instead of "unknown error".
  if (code === "storage/unknown" && /does not exist|no such bucket|not ?found/i.test(server))
    return (
      "Firebase Storage رفض اسم الدلو المستخدم في الموقع (الدلو غير موجود). " +
      `هذا خلل إعدادات في Firebase وليس شبكة أو صلاحيات. (${code})`
    );
  return messages[code]
    ? `${messages[code]} (${code})`
    : typeof raw.message === "string"
      ? String(raw.message)
      : "تعذر رفع الملف. تحقق من الشبكة وإعدادات Firebase Storage.";
}
