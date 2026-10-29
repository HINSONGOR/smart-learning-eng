// Reading Practice Lab：列出題目、提供作答用（不含答案）的題目、伺服器評分及保存紀錄。
import "server-only";
import { z } from "zod";
import { exerciseRepository } from "@/repositories";
import { NotFoundError } from "@/lib/errors";
import { gradeExercise } from "@/lib/grading";
import { parseInput } from "@/lib/validation";
import { createId } from "@/lib/text";
import type { PracticeRecord } from "@/lib/schemas";
import type { ExerciseSummary, PublicExercise, TypeAccuracy } from "@/types";
import { accuracyByMode, insertRecord, listRecords, summarize } from "./recordService";
import { assertLearner } from "./settingsService";

export async function listExerciseSummaries(
  learnerId: string,
): Promise<{ exercises: ExerciseSummary[]; accuracy: TypeAccuracy[] }> {
  const [exercises, records] = await Promise.all([
    exerciseRepository.list(),
    listRecords(learnerId, "reading-lab"),
  ]);
  const summaries = exercises.map<ExerciseSummary>((exercise) => {
    const last = records.find((r) => r.exerciseId === exercise.id);
    return {
      id: exercise.id,
      title: exercise.title,
      type: exercise.type,
      category: exercise.category,
      level: exercise.level,
      ieltsBand: exercise.ieltsBand,
      questionCount: exercise.questions.length,
      lastRecord: last
        ? { id: last.id, date: last.date, total: last.total, correct: last.correct }
        : null,
    };
  });
  return { exercises: summaries, accuracy: accuracyByMode(records) };
}

export async function getPublicExercise(id: string): Promise<PublicExercise> {
  const exercise = await exerciseRepository.get(id);
  if (!exercise) throw new NotFoundError("找不到這份練習");
  return {
    ...exercise,
    // 作答前不把答案及解釋傳給瀏覽器
    questions: exercise.questions.map(({ answers: _answers, explanation: _explanation, ...rest }) => rest),
  };
}

const submissionSchema = z.object({
  learnerId: z.string().min(1),
  answers: z.record(z.string(), z.string().max(500)),
  onlyQuestionIds: z.array(z.string()).max(200).default([]),
});

export async function submitExercise(id: string, input: unknown): Promise<PracticeRecord> {
  const submission = parseInput(submissionSchema, input);
  await assertLearner(submission.learnerId);
  const exercise = await exerciseRepository.get(id);
  if (!exercise) throw new NotFoundError("找不到這份練習");

  const answers = gradeExercise(exercise, submission.answers, submission.onlyQuestionIds);
  if (answers.length === 0) throw new NotFoundError("找不到要評分的題目");

  return insertRecord({
    id: createId("record"),
    learnerId: submission.learnerId,
    kind: "reading-lab",
    mode: exercise.type,
    title: submission.onlyQuestionIds.length ? `${exercise.title}（錯題重做）` : exercise.title,
    category: exercise.category,
    exerciseId: exercise.id,
    date: new Date().toISOString(),
    ...summarize(answers),
    scored: true,
    answers,
  });
}
