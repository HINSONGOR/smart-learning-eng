import "server-only";
import { z } from "zod";
import { articleRepository } from "@/repositories";
import { NotFoundError } from "@/lib/errors";
import { parseInput } from "@/lib/validation";
import type { Article } from "@/lib/schemas";
import type { ArticleView } from "@/types";
import { emptyArticleProgress, getLearnerProgress, updateArticleProgress } from "./progressService";

export async function listArticles(learnerId: string): Promise<ArticleView[]> {
  const [articles, progress] = await Promise.all([
    articleRepository.list(),
    getLearnerProgress(learnerId),
  ]);
  return articles
    .map((a) => ({ ...a, progress: progress.articles[a.id] ?? emptyArticleProgress() }))
    .sort(byListOrder);
}

/** 文章庫的排列次序：較新在前（原書次序已用建立時間表示） */
const byListOrder = (a: Article, b: Article) => b.createdAt.localeCompare(a.createdAt);

export async function getArticle(learnerId: string, id: string): Promise<ArticleView> {
  const [articles, progress] = await Promise.all([articleRepository.list(), getLearnerProgress(learnerId)]);
  const article = articles.find((a) => a.id === id);
  if (!article) throw new NotFoundError("找不到這篇文章");
  // 上一篇／下一篇：同一分類、同一系列（主題以相同方式命名）中的相鄰文章
  const series = articles
    .filter((a) => a.category === article.category && a.source.split("》")[0] === article.source.split("》")[0])
    .sort(byListOrder);
  const index = series.findIndex((a) => a.id === id);
  const link = (a: Article | undefined) => (a ? { id: a.id, title: a.title } : null);
  return {
    ...article,
    progress: progress.articles[id] ?? emptyArticleProgress(),
    previous: link(series[index - 1]),
    next: link(series[index + 1]),
  };
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
