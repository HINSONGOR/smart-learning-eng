// 聽寫及跟讀用的句子：來自生字例句及文章句子（不會自行產生內容）。
import "server-only";
import { z } from "zod";
import { CATEGORY_IDS } from "@/lib/constants";
import { parseInput } from "@/lib/validation";
import { articleRepository, vocabularyRepository } from "@/repositories";
import type { PracticeSentence } from "@/types";

const sentenceFilterSchema = z.object({
  source: z.enum(["all", "vocabulary", "articles"]).default("all"),
  category: z.union([z.enum(CATEGORY_IDS), z.literal("")]).default(""),
  articleId: z.string().max(100).default(""),
});

export async function listPracticeSentences(input: unknown): Promise<PracticeSentence[]> {
  const filter = parseInput(sentenceFilterSchema, input);
  const sentences: PracticeSentence[] = [];

  if (filter.source !== "articles" && !filter.articleId) {
    const vocabulary = await vocabularyRepository.list();
    for (const v of vocabulary) {
      if (filter.category && v.category !== filter.category) continue;
      sentences.push({
        key: `vocab:${v.id}`,
        en: v.exampleEn,
        zh: v.exampleZh,
        sourceLabel: `生字例句：${v.word}`,
        category: v.category,
      });
    }
  }

  if (filter.source !== "vocabulary") {
    const articles = await articleRepository.list();
    for (const article of articles) {
      if (filter.category && article.category !== filter.category) continue;
      if (filter.articleId && article.id !== filter.articleId) continue;
      article.paragraphs.forEach((paragraph, p) =>
        paragraph.sentences.forEach((sentence, s) =>
          sentences.push({
            key: `article:${article.id}:${p}:${s}`,
            en: sentence.en,
            zh: sentence.zh,
            sourceLabel: `文章：${article.title}`,
            category: article.category,
          }),
        ),
      );
    }
  }

  // 去除重複句子
  const seen = new Set<string>();
  return sentences.filter((s) => {
    const key = s.en.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
