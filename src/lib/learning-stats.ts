export type LearningDay = {
  day: string;
  date: string;
  lessons: number;
  exams: number;
};
export const cairoDate = (value: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
export function learningStats(
  lessonIds: string[],
  examIds: string[],
  completions: { lessonId: string; completedAt: string }[],
  attempts: {
    id?: string;
    examId: string;
    status: string;
    submittedAt?: string;
    createdAt?: string;
  }[],
  now = new Date(),
) {
  const lessons = new Set(lessonIds),
    exams = new Set(examIds);
  const done = new Map<string, string>();
  completions.forEach((c) => {
    if (lessons.has(c.lessonId) && !done.has(c.lessonId))
      done.set(c.lessonId, c.completedAt);
  });
  const passed = new Set(
    attempts
      .filter((a) => exams.has(a.examId) && a.status === "passed")
      .map((a) => a.examId),
  );
  const total = lessons.size + exams.size,
    completed = done.size + passed.size;
  const calendarAnchor = new Date(`${cairoDate(now)}T12:00:00Z`);
  const days: LearningDay[] = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(calendarAnchor.getTime() - (6 - i) * 86400000);
    return {
      date: cairoDate(date),
      day: new Intl.DateTimeFormat("ar-EG", {
        weekday: "short",
        timeZone: "Africa/Cairo",
      }).format(date),
      lessons: 0,
      exams: 0,
    };
  });
  const add = (stamp: string | undefined, type: "lessons" | "exams") => {
    if (!stamp || !Number.isFinite(Date.parse(stamp))) return;
    const day = days.find((d) => d.date === cairoDate(new Date(stamp)));
    if (day) day[type]++;
  };
  done.forEach((time) => add(time, "lessons"));
  const counted = new Set<string>();
  attempts.forEach((a) => {
    const key = a.id || a.examId;
    if (
      exams.has(a.examId) &&
      ["passed", "failed", "pending"].includes(a.status) &&
      !counted.has(key)
    ) {
      counted.add(key);
      add(a.submittedAt || a.createdAt, "exams");
    }
  });
  return {
    progress: total ? Math.round((completed / total) * 100) : 0,
    completedLessons: done.size,
    passedExams: passed.size,
    totalLessons: lessons.size,
    totalExams: exams.size,
    days,
  };
}
