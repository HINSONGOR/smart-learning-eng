import "server-only";
import { z } from "zod";
import { articleRepository } from "@/repositories";
import { NotFoundError } from "@/lib/errors";
import { parseInput } from "@/lib/validation";
import type { ArticleView } from "@/types";
import { emptyArticleProgress, getLearnerProgress, updateArticleProgress } from "./progressService";

export async function listArticles(learnerId: string): Promise<ArticleView[]> {
  const [articles, progress] = await Promise.all([
    articleRepository.list(),
    getLearnerProgress(learnerId),
  ]);
  return articles
    .map((a) => ({ ...a, progress: progress.articles[a.id] ?? emptyArticleProgress() }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getArticle(learnerId: string, id: string): Promise<ArticleView> {
  const [article, progress] = await Promise.all([
    articleRepository.get(id),
    getLearnerProgress(learnerId),
  ]);
  if (!article) throw new NotFoundError("找不到這篇文章");
  return { ...article, progress: progress.articles[id] ?? emptyArticleProgress() };
}

const articleProgressPatchSchema = z
  .object({ isLearned: z.boolean(), isFavorite: z.boolean() })
  .partial();

export async function setArticleFlags(learnerId: string, id: string, input: unknown) {
  const patch = parseInput(articleProgressPatchSchema, input);
  const article = await articleRepository.get(id);
  if (!article) throw new NotFoundError("找不到這篇文章");
  return updateArticleProgress(learnerId, id, patch);
}
