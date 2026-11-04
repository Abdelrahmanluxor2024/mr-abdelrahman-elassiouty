import type { Question, StudentAnswer } from "@/types/supabase";
export const isChoiceQuestion = (q: Pick<Question, "question_type">) =>
  ["mcq", "multiple_choice"].includes(q.question_type);
export function reviewSummary(questions: Question[], answers: StudentAnswer[]) {
  const byQuestion = new Map(answers.map((a) => [a.question_id, a]));
  const choices = questions.filter(isChoiceQuestion);
  const essays = questions.filter((q) => !isChoiceQuestion(q));
  return {
    mcqTotal: choices.reduce((n, q) => n + Number(q.marks), 0),
    mcqScore: choices.reduce(
      (n, q) => n + Number(byQuestion.get(q.id)?.marks_obtained || 0),
      0,
    ),
    pendingEssays: essays.filter(
      (q) =>
        !byQuestion.get(q.id) || byQuestion.get(q.id)?.status === "pending",
    ).length,
  };
}
export function optionLabel(
  question: Question,
  key: string | null | undefined,
) {
  if (!key) return "لم تجب على هذا السؤال";
  const option = question.options?.find(
    (o) => o.key.toLowerCase() === key.toLowerCase(),
  );
  return option ? `${option.key.toUpperCase()} — ${option.text}` : key;
}
