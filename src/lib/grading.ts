// Reading Lab 評分邏輯（純函數，方便測試）。
import type { ExerciseQuestion, PracticeAnswer, ReadingExercise } from "@/types";
import { normalizeAnswer } from "./text";

export type InputKind = "text" | "choice" | "matching";

export function inputKindFor(type: ReadingExercise["type"]): InputKind {
  if (type === "multiple-choice") return "choice";
  if (type === "matching") return "matching";
  return "text";
}

export function isAnswerCorrect(
  question: ExerciseQuestion,
  userAnswer: string,
  kind: InputKind,
): boolean {
  if (!userAnswer.trim()) return false;
  if (kind === "text") {
    const normalized = normalizeAnswer(userAnswer);
    return question.answers.some((answer) => normalizeAnswer(answer) === normalized);
  }
  const key = userAnswer.trim().toUpperCase();
  return question.answers.some((answer) => answer.trim().toUpperCase() === key);
}

function describeChoice(key: string, options: ReadingExercise["matchingOptions"]): string {
  if (!key) return "";
  const option = options.find((o) => o.key.toUpperCase() === key.trim().toUpperCase());
  return option ? `${option.key}. ${option.text}` : key;
}

/**
 * 評分並產生每題的作答紀錄。
 * @param onlyQuestionIds 重做錯題時只評這些題目
 */
export function gradeExercise(
  exercise: ReadingExercise,
  answers: Record<string, string>,
  onlyQuestionIds?: string[],
): PracticeAnswer[] {
  const kind = inputKindFor(exercise.type);
  const questions = onlyQuestionIds?.length
    ? exercise.questions.filter((q) => onlyQuestionIds.includes(q.id))
    : exercise.questions;

  return questions.map((question) => {
    const userAnswer = (answers[question.id] ?? "").trim();
    const options = kind === "choice" ? question.options : exercise.matchingOptions;
    const isCorrect = isAnswerCorrect(question, userAnswer, kind);
    return {
      questionId: question.id,
      refId: question.id,
      prompt: `${question.number}. ${question.prompt}`,
      userAnswer: kind === "text" ? userAnswer : describeChoice(userAnswer, options),
      correctAnswer:
        kind === "text"
          ? question.answers.join(" / ")
          : question.answers.map((a) => describeChoice(a, options)).join(" / "),
      isCorrect,
      explanation: question.explanation,
    };
  });
}
