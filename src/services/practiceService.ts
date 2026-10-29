// 生字練習出題。
import "server-only";
import { z } from "zod";
import { VOCAB_PRACTICE_MODE_IDS } from "@/lib/constants";
import { buildQuiz } from "@/lib/quiz";
import { parseInput } from "@/lib/validation";
import { recordRepository } from "@/repositories";
import type { QuizResult } from "@/types";
import { listVocabulary, vocabularyFilterSchema } from "./vocabularyService";

export const quizRequestSchema = vocabularyFilterSchema.extend({
  mode: z.enum(VOCAB_PRACTICE_MODE_IDS, { error: "請選擇練習類型" }),
  count: z.coerce.number().int().min(1).max(50).default(10),
  /** 重新練習某次紀錄的錯題 */
  redoRecordId: z.string().max(100).default(""),
});

export async function createVocabularyQuiz(learnerId: string, input: unknown): Promise<QuizResult> {
  const request = parseInput(quizRequestSchema, input);
  const pool = await listVocabulary(learnerId);

  let targets;
  if (request.redoRecordId) {
    const record = await recordRepository.get(request.redoRecordId);
    const owned = record && record.learnerId === learnerId ? record : undefined;
    const wrongIds = new Set(
      owned?.answers.filter((a) => a.isCorrect === false).map((a) => a.refId) ?? [],
    );
    targets = pool.filter((v) => wrongIds.has(v.id));
    if (targets.length === 0) {
      return { questions: [], message: "這次紀錄沒有錯題，或相關生字已被刪除。" };
    }
  } else {
    const scope =
      request.mode === "review" ? "review" : request.mode === "wrong-redo" ? "wrong" : request.scope;
    targets = await listVocabulary(learnerId, { ...request, scope });
  }

  return buildQuiz(targets, pool, { mode: request.mode, count: request.count });
}
