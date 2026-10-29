// 每位學習者的學習進度：收藏、待重溫、已掌握、錯題、答對及答錯次數、文章已學習。
import "server-only";
import { progressRepository } from "@/repositories";
import {
  articleProgressSchema,
  learnerProgressSchema,
  vocabProgressSchema,
  type ArticleProgress,
  type LearnerProgress,
  type VocabProgress,
} from "@/lib/schemas";

export const emptyVocabProgress = (): VocabProgress => vocabProgressSchema.parse({});
export const emptyArticleProgress = (): ArticleProgress => articleProgressSchema.parse({});
const emptyLearnerProgress = (): LearnerProgress => learnerProgressSchema.parse({});

export async function getLearnerProgress(learnerId: string): Promise<LearnerProgress> {
  const file = await progressRepository.read();
  return file[learnerId] ?? emptyLearnerProgress();
}

export async function updateVocabProgress(
  learnerId: string,
  vocabId: string,
  patch: Partial<VocabProgress>,
): Promise<VocabProgress> {
  return progressRepository.update((file) => {
    const learner = file[learnerId] ?? emptyLearnerProgress();
    const current = learner.vocab[vocabId] ?? emptyVocabProgress();
    const next: VocabProgress = { ...current, ...patch };
    // 已掌握的生字不再需要重溫
    if (patch.isMastered) next.needsReview = false;
    return {
      data: { ...file, [learnerId]: { ...learner, vocab: { ...learner.vocab, [vocabId]: next } } },
      result: next,
    };
  });
}

export async function updateArticleProgress(
  learnerId: string,
  articleId: string,
  patch: Partial<ArticleProgress>,
): Promise<ArticleProgress> {
  return progressRepository.update((file) => {
    const learner = file[learnerId] ?? emptyLearnerProgress();
    const next = { ...(learner.articles[articleId] ?? emptyArticleProgress()), ...patch };
    return {
      data: {
        ...file,
        [learnerId]: { ...learner, articles: { ...learner.articles, [articleId]: next } },
      },
      result: next,
    };
  });
}

/**
 * 根據生字練習結果更新進度：
 * - 答對：答對次數 +1；如果是錯題重做，從錯題清單移除
 * - 答錯：答錯次數 +1，加入錯題清單並標記待重溫，取消已掌握
 */
export async function applyVocabAnswers(
  learnerId: string,
  results: Array<{ vocabId: string; isCorrect: boolean }>,
  mode: string,
): Promise<void> {
  if (results.length === 0) return;
  const now = new Date().toISOString();
  await progressRepository.update((file) => {
    const learner = file[learnerId] ?? emptyLearnerProgress();
    const vocab = { ...learner.vocab };
    for (const { vocabId, isCorrect } of results) {
      const current = vocab[vocabId] ?? emptyVocabProgress();
      vocab[vocabId] = isCorrect
        ? {
            ...current,
            correctCount: current.correctCount + 1,
            inWrongList: mode === "wrong-redo" ? false : current.inWrongList,
            lastPracticedAt: now,
          }
        : {
            ...current,
            wrongCount: current.wrongCount + 1,
            inWrongList: true,
            needsReview: true,
            isMastered: false,
            lastPracticedAt: now,
          };
    }
    return { data: { ...file, [learnerId]: { ...learner, vocab } }, result: undefined };
  });
}

/** 刪除生字後，清除所有學習者對應的進度 */
export async function removeVocabProgress(vocabIds: string[]): Promise<void> {
  if (vocabIds.length === 0) return;
  const ids = new Set(vocabIds);
  await progressRepository.update((file) => {
    const next: typeof file = {};
    for (const [learnerId, learner] of Object.entries(file)) {
      next[learnerId] = {
        ...learner,
        vocab: Object.fromEntries(Object.entries(learner.vocab).filter(([id]) => !ids.has(id))),
      };
    }
    return { data: next, result: undefined };
  });
}
