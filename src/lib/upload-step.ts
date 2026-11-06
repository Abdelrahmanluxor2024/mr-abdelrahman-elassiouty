export type UploadProgress = (percent: number, stage?: string) => void;
/** Bound prerequisites as well as transfers. A late read must never start a late upload. */
export async function runUploadStep<T>(
  stage: string,
  work: () => Promise<T>,
  progress?: UploadProgress,
  percent = 0,
  timeout = 15000,
): Promise<T> {
  progress?.(percent, stage);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(work),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(
                `تعذر إكمال مرحلة «${stage}» خلال ${timeout / 1000} ثانية. لم يتم اعتماد الملف. تحقق من الاتصال بخدمات Firebase وأعد المحاولة. [upload/step-timeout]`,
              ),
            ),
          timeout,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
