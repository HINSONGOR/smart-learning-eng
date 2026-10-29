import "server-only";
import { z } from "zod";
import { resourceRepository, vocabularyRepository } from "@/repositories";
import {
  ieltsBandSchema,
  levelSchema,
  vocabularyInputSchema,
  type Vocabulary,
  type VocabProgress,
} from "@/lib/schemas";
import { CATEGORY_IDS } from "@/lib/constants";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { parseInput } from "@/lib/validation";
import { createId, normalizeAnswer } from "@/lib/text";
import type { VocabularyView } from "@/types";
import {
  emptyVocabProgress,
  getLearnerProgress,
  removeVocabProgress,
  updateVocabProgress,
} from "./progressService";

export const vocabularyFilterSchema = z.object({
  search: z.string().trim().max(100).default(""),
  category: z.union([z.enum(CATEGORY_IDS), z.literal("")]).default(""),
  topic: z.string().max(60).default(""),
  level: levelSchema,
  ieltsBand: ieltsBandSchema,
  /** all = 全部；favorites = 收藏；review = 待重溫；wrong = 錯題；mastered = 已掌握；learning = 未掌握 */
  scope: z.enum(["all", "favorites", "review", "wrong", "mastered", "learning"]).default("all"),
});
export type VocabularyFilter = z.infer<typeof vocabularyFilterSchema>;

export function matchesFilter(item: VocabularyView, filter: VocabularyFilter): boolean {
  if (filter.category && item.category !== filter.category) return false;
  if (filter.topic && item.topic !== filter.topic) return false;
  if (filter.level && item.level !== filter.level) return false;
  if (filter.ieltsBand && item.ieltsBand !== filter.ieltsBand) return false;
  const p = item.progress;
  if (filter.scope === "favorites" && !p.isFavorite) return false;
  if (filter.scope === "review" && !p.needsReview) return false;
  if (filter.scope === "wrong" && !p.inWrongList) return false;
  if (filter.scope === "mastered" && !p.isMastered) return false;
  if (filter.scope === "learning" && p.isMastered) return false;
  if (filter.search) {
    const q = filter.search.toLowerCase();
    const haystack = [item.word, item.meaningZh, item.definitionEn, item.exampleEn, item.topic]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

function withProgress(items: Vocabulary[], progress: Record<string, VocabProgress>): VocabularyView[] {
  return items.map((item) => ({ ...item, progress: progress[item.id] ?? emptyVocabProgress() }));
}

export async function listVocabulary(
  learnerId: string,
  filterInput: unknown = {},
): Promise<VocabularyView[]> {
  const filter = parseInput(vocabularyFilterSchema, filterInput);
  const [items, progress] = await Promise.all([
    vocabularyRepository.list(),
    getLearnerProgress(learnerId),
  ]);
  return withProgress(items, progress.vocab)
    .filter((item) => matchesFilter(item, filter))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.word.localeCompare(b.word));
}

export async function getVocabulary(learnerId: string, id: string): Promise<VocabularyView> {
  const [item, progress] = await Promise.all([
    vocabularyRepository.get(id),
    getLearnerProgress(learnerId),
  ]);
  if (!item) throw new NotFoundError("找不到這個生字，可能已被刪除");
  return { ...item, progress: progress.vocab[id] ?? emptyVocabProgress() };
}

export async function findVocabularyByWord(word: string): Promise<Vocabulary | undefined> {
  const target = normalizeAnswer(word);
  const items = await vocabularyRepository.list();
  return items.find((item) => normalizeAnswer(item.word) === target);
}

async function assertNoDuplicate(word: string, category: string, exceptId?: string) {
  const target = normalizeAnswer(word);
  const items = await vocabularyRepository.list();
  const duplicate = items.find(
    (item) =>
      item.id !== exceptId && item.category === category && normalizeAnswer(item.word) === target,
  );
  if (duplicate) {
    throw new ValidationError(`這個分類已經有生字「${duplicate.word}」`, {
      word: `這個分類已經有生字「${duplicate.word}」`,
    });
  }
}

export async function createVocabulary(
  input: unknown,
  options: { learnerId?: string; markForReview?: boolean } = {},
): Promise<Vocabulary> {
  const data = parseInput(vocabularyInputSchema, input);
  await assertNoDuplicate(data.word, data.category);
  const now = new Date().toISOString();
  const created = await vocabularyRepository.insert({
    ...data,
    id: createId("vocab"),
    isDemo: false,
    createdAt: now,
    updatedAt: now,
  });
  if (options.learnerId && options.markForReview) {
    await updateVocabProgress(options.learnerId, created.id, { needsReview: true });
  }
  return created;
}

export async function updateVocabulary(id: string, input: unknown): Promise<Vocabulary> {
  const data = parseInput(vocabularyInputSchema, input);
  await assertNoDuplicate(data.word, data.category, id);
  const updated = await vocabularyRepository.update(id, (current) => ({
    ...current,
    ...data,
    updatedAt: new Date().toISOString(),
  }));
  if (!updated) throw new NotFoundError("找不到這個生字，可能已被刪除");
  return updated;
}

export async function deleteVocabulary(id: string): Promise<void> {
  const removed = await vocabularyRepository.remove(id);
  if (!removed) throw new NotFoundError("找不到這個生字，可能已被刪除");
  await removeVocabProgress([id]);
}

export const vocabProgressPatchSchema = z
  .object({
    isFavorite: z.boolean(),
    needsReview: z.boolean(),
    isMastered: z.boolean(),
  })
  .partial();

export async function setVocabularyFlags(learnerId: string, id: string, input: unknown) {
  const patch = parseInput(vocabProgressPatchSchema, input);
  const item = await vocabularyRepository.get(id);
  if (!item) throw new NotFoundError("找不到這個生字，可能已被刪除");
  return updateVocabProgress(learnerId, id, patch);
}

export async function listTopics(): Promise<string[]> {
  const items = await vocabularyRepository.list();
  return [...new Set(items.map((item) => item.topic))].sort();
}

/** 刪除所有示範生字及示範資源 */
export async function removeDemoData(): Promise<{ vocabulary: number; resources: number }> {
  const items = await vocabularyRepository.list();
  const demoIds = items.filter((item) => item.isDemo).map((item) => item.id);
  const vocabulary = await vocabularyRepository.removeWhere((item) => item.isDemo);
  await removeVocabProgress(demoIds);
  const resources = await resourceRepository.removeWhere((item) => item.isDemo);
  return { vocabulary, resources };
}

export async function countDemoData(): Promise<{ vocabulary: number; resources: number }> {
  const [items, resources] = await Promise.all([
    vocabularyRepository.list(),
    resourceRepository.list(),
  ]);
  return {
    vocabulary: items.filter((item) => item.isDemo).length,
    resources: resources.filter((item) => item.isDemo).length,
  };
}
