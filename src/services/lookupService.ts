// 文章選字查詢。查詢次序：
// 1. 文章附帶的生字表（老師筆記）
// 2. 生字庫
// 3. Gemini（只在設定了 API key 時使用）
// 4. 都查不到：由使用者自行輸入
import "server-only";
import { z } from "zod";
import { articleRepository } from "@/repositories";
import { parseInput } from "@/lib/validation";
import { normalizeAnswer } from "@/lib/text";
import { ValidationError } from "@/lib/errors";
import type { Article, GlossaryItem } from "@/lib/schemas";
import type { LookupResult } from "@/types";
import { GeminiError, geminiLookup, isGeminiConfigured } from "./geminiService";
import { getSettings } from "./settingsService";
import { findVocabularyByWord } from "./vocabularyService";

const lookupRequestSchema = z.object({
  text: z.string().trim().min(1, "請先選取英文字詞").max(80, "選取的文字太長，請選取較短的字詞或片語"),
  articleId: z.string().max(100).default(""),
  sentence: z.string().max(1000).default(""),
});

/** 生字表比對：完全相同，或只差常見詞尾（例如 impacts → impact） */
export function matchesWord(selected: string, entry: string): boolean {
  const a = normalizeAnswer(selected);
  const b = normalizeAnswer(entry);
  if (!a || !b) return false;
  if (a === b) return true;
  const stems = [a.replace(/(?:es|s|ed|d|ing)$/, ""), a.replace(/ies$/, "y"), a.replace(/ied$/, "y")];
  return stems.some((stem) => stem.length >= 3 && stem === b);
}

function findSentenceTranslation(article: Article | undefined, sentence: string): string {
  if (!article || !sentence) return "";
  const target = sentence.trim();
  for (const paragraph of article.paragraphs) {
    for (const s of paragraph.sentences) {
      if (s.en.trim() === target) return s.zh;
    }
  }
  return "";
}

function fromGlossary(item: GlossaryItem, sentence: string, sentenceZh: string) {
  // 有原句時優先用原句作例句，方便溫習時記得上下文
  const useSentence = Boolean(sentence);
  return {
    partOfSpeech: item.partOfSpeech,
    meaningZh: item.meaningZh,
    definitionEn: item.definitionEn,
    exampleEn: useSentence ? sentence : item.exampleEn,
    exampleZh: useSentence ? sentenceZh : item.exampleZh,
  };
}

export async function lookupText(input: unknown): Promise<LookupResult> {
  const request = parseInput(lookupRequestSchema, input);
  if (!/[a-z]/i.test(request.text)) {
    throw new ValidationError("請選取英文字詞");
  }
  const text = request.text.replace(/\s+/g, " ").replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
  const article = request.articleId ? await articleRepository.get(request.articleId) : undefined;
  const sentence = request.sentence.trim();
  const sentenceZh = findSentenceTranslation(article, sentence);
  const existing = await findVocabularyByWord(text);

  const base: LookupResult = {
    text,
    source: "none",
    partOfSpeech: "",
    meaningZh: "",
    definitionEn: "",
    exampleEn: sentence,
    exampleZh: sentenceZh,
    existingVocabId: existing?.id ?? "",
    notice: "",
  };

  const glossaryItem = article?.glossary.find((item) => matchesWord(text, item.word));
  if (glossaryItem) {
    return { ...base, source: "glossary", ...fromGlossary(glossaryItem, sentence, sentenceZh) };
  }

  if (existing) {
    return {
      ...base,
      source: "vocabulary",
      partOfSpeech: existing.partOfSpeech,
      meaningZh: existing.meaningZh,
      definitionEn: existing.definitionEn,
      exampleEn: sentence || existing.exampleEn,
      exampleZh: sentence ? sentenceZh : existing.exampleZh,
    };
  }

  if (!isGeminiConfigured()) {
    return { ...base, notice: "文章生字表及生字庫都沒有這個字。未設定 Gemini，請自行輸入中文解釋。" };
  }

  const settings = await getSettings();
  const sentenceToSend = settings.gemini.includeSentence ? sentence : "";
  try {
    const answer = await geminiLookup(text, sentenceToSend);
    return {
      ...base,
      source: "gemini",
      partOfSpeech: answer.partOfSpeech,
      meaningZh: answer.meaningZh,
      definitionEn: answer.definitionEn,
      exampleZh: sentenceZh || answer.sentenceZh,
      notice: "AI 解釋，可能有錯誤，請核對後再儲存。",
    };
  } catch (error) {
    const message = error instanceof GeminiError ? error.message : "Gemini 查詢失敗";
    return { ...base, notice: `${message}。請自行輸入中文解釋。` };
  }
}
