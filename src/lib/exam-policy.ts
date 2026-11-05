/** Missing policy means ordinary practice. Zero attempts means unlimited. */
export function examPolicy(exam: Record<string, any>) {
  return {
    maxAttempts:
      exam.maxAttempts == null
        ? 0
        : Number.isSafeInteger(exam.maxAttempts) &&
            exam.maxAttempts >= 0 &&
            exam.maxAttempts <= 1000
          ? exam.maxAttempts
          : 1,
    antiCheat: exam.antiCheat === true,
  };
}
export function questionMarks(type: string) {
  return type === "essay" ? 2 : 1;
}
