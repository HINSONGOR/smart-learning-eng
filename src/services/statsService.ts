import "server-only";
import { CATEGORY_IDS, type CategoryId } from "@/lib/constants";
import { percent } from "@/lib/text";
import { articleRepository, exerciseRepository } from "@/repositories";
import type { HomeStats } from "@/types";
import { listRecords } from "./recordService";
import { listVocabulary } from "./vocabularyService";

export async function getHomeStats(learnerId: string): Promise<HomeStats> {
  const [vocabulary, records, articles, exercises] = await Promise.all([
    listVocabulary(learnerId),
    listRecords(learnerId),
    articleRepository.list(),
    exerciseRepository.list(),
  ]);

  const scored = records.filter((r) => r.scored);
  const totalAnswers = scored.reduce((sum, r) => sum + r.total, 0);
  const correctAnswers = scored.reduce((sum, r) => sum + r.correct, 0);

  const byCategory = Object.fromEntries(
    CATEGORY_IDS.map((id) => [
      id,
      {
        vocabulary: vocabulary.filter((v) => v.category === id).length,
        articles: articles.filter((a) => a.category === id).length,
        exercises: exercises.filter((e) => e.category === id).length,
      },
    ]),
  ) as Record<CategoryId, HomeStats["byCategory"][CategoryId]>;

  return {
    totalVocabulary: vocabulary.length,
    practicedVocabulary: vocabulary.filter(
      (v) => v.progress.correctCount + v.progress.wrongCount > 0,
    ).length,
    reviewCount: vocabulary.filter((v) => v.progress.needsReview).length,
    masteredCount: vocabulary.filter((v) => v.progress.isMastered).length,
    favoriteCount: vocabulary.filter((v) => v.progress.isFavorite).length,
    wrongListCount: vocabulary.filter((v) => v.progress.inWrongList).length,
    totalAnswers,
    correctAnswers,
    accuracy: percent(correctAnswers, totalAnswers),
    practiceCount: records.length,
    recentRecords: records.slice(0, 5).map(({ id, kind, mode, title, date, total, correct, scored }) => ({
      id,
      kind,
      mode,
      title,
      date,
      total,
      correct,
      scored,
    })),
    byCategory,
  };
}
