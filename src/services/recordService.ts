// 練習紀錄：保存、列出、統計。
import "server-only";
import { recordRepository } from "@/repositories";
import type { PracticeRecordSummary } from "@/repositories/recordRepository";
import {
  practiceRecordInputSchema,
  type PracticeAnswer,
  type PracticeRecord,
} from "@/lib/schemas";
import type { PracticeKind } from "@/lib/constants";
import { NotFoundError } from "@/lib/errors";
import { parseInput } from "@/lib/validation";
import { createId } from "@/lib/text";
import type { TypeAccuracy } from "@/types";
import { applyVocabAnswers } from "./progressService";
import { assertLearner } from "./settingsService";

export function summarize(answers: PracticeAnswer[]): { total: number; correct: number } {
  return {
    total: answers.length,
    correct: answers.filter((a) => a.isCorrect === true).length,
  };
}

/** 保存生字練習、聽寫或跟讀結果（Reading Lab 由伺服器評分，見 readingLabService） */
export async function saveClientRecord(input: unknown): Promise<PracticeRecord> {
  const data = parseInput(practiceRecordInputSchema, input);
  await assertLearner(data.learnerId);
  const scored = data.kind !== "shadowing";
  const answers = scored
    ? data.answers
    : data.answers.map((a) => ({ ...a, isCorrect: null }));
  const record = await recordRepository.insert({
    id: createId("record"),
    learnerId: data.learnerId,
    kind: data.kind,
    mode: data.mode,
    title: data.title,
    category: data.category,
    exerciseId: "",
    date: new Date().toISOString(),
    ...summarize(answers),
    scored,
    answers,
  });
  if (data.kind === "vocabulary") {
    await applyVocabAnswers(
      data.learnerId,
      answers
        .filter((a) => a.refId && a.isCorrect !== null)
        .map((a) => ({ vocabId: a.refId, isCorrect: a.isCorrect === true })),
      data.mode,
    );
  }
  return record;
}

export async function insertRecord(record: PracticeRecord): Promise<PracticeRecord> {
  return recordRepository.insert(record);
}

/** 紀錄摘要（不含每題作答），最新在前 */
export async function listRecords(learnerId: string, kind?: PracticeKind | ""): Promise<PracticeRecordSummary[]> {
  const records = await recordRepository.listSummaries(learnerId);
  return kind ? records.filter((r) => r.kind === kind) : records;
}

export async function getRecord(learnerId: string, id: string): Promise<PracticeRecord> {
  const record = await recordRepository.get(id);
  if (!record || record.learnerId !== learnerId) {
    throw new NotFoundError("找不到這次練習紀錄");
  }
  return record;
}

export async function deleteRecord(learnerId: string, id: string): Promise<void> {
  await getRecord(learnerId, id);
  await recordRepository.remove(id);
}

/** 按模式或題型統計正確率 */
export function accuracyByMode(records: PracticeRecordSummary[]): TypeAccuracy[] {
  const map = new Map<string, TypeAccuracy>();
  for (const r of records) {
    if (!r.scored) continue;
    const entry = map.get(r.mode) ?? { type: r.mode, attempts: 0, total: 0, correct: 0 };
    entry.attempts += 1;
    entry.total += r.total;
    entry.correct += r.correct;
    map.set(r.mode, entry);
  }
  return [...map.values()];
}
