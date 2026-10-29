// Zod 資料結構：同時用作 TypeScript 型別、API 輸入驗證及讀取 JSON 時的格式檢查。
import { z } from "zod";
import {
  CATEGORY_IDS,
  EXERCISE_TYPE_IDS,
  IELTS_BANDS,
  LEVELS,
  PRACTICE_KIND_IDS,
  RESOURCE_TYPE_IDS,
} from "./constants";

const idSchema = z.string().min(1).max(100);
const optionalText = (max: number) => z.string().trim().max(max).default("");
const requiredText = (max: number, message: string) =>
  z.string({ error: message }).trim().min(1, message).max(max, `不可超過 ${max} 個字元`);

export const categorySchema = z.enum(CATEGORY_IDS, { error: "請選擇學習分類" });
export const levelSchema = z.union([z.enum(LEVELS), z.literal("")]).default("");
export const ieltsBandSchema = z.union([z.enum(IELTS_BANDS), z.literal("")]).default("");

/* ---------- 生字 ---------- */

export const vocabularyInputSchema = z.object({
  word: requiredText(100, "請輸入英文生字"),
  partOfSpeech: requiredText(30, "請選擇詞性"),
  meaningZh: requiredText(300, "請輸入中文解釋"),
  definitionEn: optionalText(500),
  exampleEn: requiredText(500, "請輸入英文例句"),
  exampleZh: optionalText(500),
  category: categorySchema,
  topic: requiredText(60, "請輸入主題"),
  level: levelSchema,
  ieltsBand: ieltsBandSchema,
  sourceArticleId: optionalText(100),
});
export type VocabularyInput = z.infer<typeof vocabularyInputSchema>;

export const vocabularySchema = vocabularyInputSchema.extend({
  id: idSchema,
  isDemo: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Vocabulary = z.infer<typeof vocabularySchema>;

/* ---------- 文章 ---------- */

export const sentenceSchema = z.object({
  en: z.string().min(1),
  zh: z.string().default(""),
});

export const glossaryItemSchema = z.object({
  word: z.string().min(1),
  partOfSpeech: z.string().default(""),
  meaningZh: z.string().min(1),
  definitionEn: z.string().default(""),
  exampleEn: z.string().default(""),
  exampleZh: z.string().default(""),
});
export type GlossaryItem = z.infer<typeof glossaryItemSchema>;

export const articleSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  titleZh: z.string().default(""),
  /** 文章整體中文解釋或重點 */
  summaryZh: z.string().default(""),
  category: categorySchema,
  topic: z.string().default(""),
  level: levelSchema,
  ieltsBand: ieltsBandSchema,
  source: z.string().default(""),
  paragraphs: z.array(z.object({ sentences: z.array(sentenceSchema).min(1) })).min(1),
  glossary: z.array(glossaryItemSchema).default([]),
  createdAt: z.string(),
});
export type Article = z.infer<typeof articleSchema>;

/* ---------- Reading Lab 題目 ---------- */

export const choiceOptionSchema = z.object({
  key: z.string().min(1),
  text: z.string().min(1),
});
export type ChoiceOption = z.infer<typeof choiceOptionSchema>;

export const exerciseQuestionSchema = z.object({
  id: idSchema,
  number: z.number().int(),
  /** 題目文字；填充題用 ___ 表示空格位置 */
  prompt: z.string().min(1),
  /** 可接受的答案。選擇題及配對題填選項代號，例如 "B" */
  answers: z.array(z.string().min(1)).min(1),
  /** 只用於 Multiple Choice */
  options: z.array(choiceOptionSchema).default([]),
  explanation: z.string().default(""),
});
export type ExerciseQuestion = z.infer<typeof exerciseQuestionSchema>;

export const readingExerciseSchema = z.object({
  id: idSchema,
  title: z.string().min(1),
  type: z.enum(EXERCISE_TYPE_IDS),
  category: categorySchema.default("ielts"),
  level: levelSchema,
  ieltsBand: ieltsBandSchema,
  instructions: z.string().default(""),
  passage: z
    .object({
      title: z.string().default(""),
      paragraphs: z.array(z.string()).default([]),
    })
    .default({ title: "", paragraphs: [] }),
  questions: z.array(exerciseQuestionSchema).min(1),
  /** 只用於 Matching：所有題目共用的選項 */
  matchingOptions: z.array(choiceOptionSchema).default([]),
  /** 只用於 Flow-chart：流程步驟，questionId 表示該步驟有空格 */
  flowSteps: z
    .array(z.object({ text: z.string().min(1), questionId: z.string().default("") }))
    .default([]),
  /** 只用於 Diagram Labelling：圖片檔名（放在 data/images/）及標籤位置（百分比） */
  diagram: z
    .object({
      image: z.string().default(""),
      labels: z
        .array(
          z.object({
            questionId: z.string().min(1),
            x: z.number().min(0).max(100),
            y: z.number().min(0).max(100),
          }),
        )
        .default([]),
    })
    .optional(),
  source: z.string().default(""),
  createdAt: z.string(),
});
export type ReadingExercise = z.infer<typeof readingExerciseSchema>;

/* ---------- 資源庫 ---------- */

export const resourceInputSchema = z.object({
  title: requiredText(200, "請輸入資源標題"),
  url: z
    .string({ error: "請輸入網址" })
    .trim()
    .min(1, "請輸入網址")
    .max(1000)
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }, "網址格式不正確，必須以 http:// 或 https:// 開頭"),
  category: categorySchema,
  resourceType: z.enum(RESOURCE_TYPE_IDS, { error: "請選擇資源類型" }),
  topic: requiredText(60, "請輸入主題"),
  notes: optionalText(2000),
  isFavorite: z.boolean().default(false),
});
export type ResourceInput = z.infer<typeof resourceInputSchema>;

export const resourceSchema = resourceInputSchema.extend({
  id: idSchema,
  isDemo: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type LearningResource = z.infer<typeof resourceSchema>;

/* ---------- 設定 ---------- */

export const learnerSchema = z.object({
  id: idSchema,
  name: requiredText(20, "請輸入學習者名稱"),
});
export type Learner = z.infer<typeof learnerSchema>;

export const settingsSchema = z.object({
  learners: z.array(learnerSchema).min(1),
  gemini: z
    .object({
      /** 查字時是否把文章原句一併傳送至 Gemini */
      includeSentence: z.boolean().default(true),
    })
    .default({ includeSentence: true }),
});
export type Settings = z.infer<typeof settingsSchema>;

/* ---------- 學習進度（每位學習者分開） ---------- */

export const vocabProgressSchema = z.object({
  isFavorite: z.boolean().default(false),
  needsReview: z.boolean().default(false),
  isMastered: z.boolean().default(false),
  /** 在錯題清單中；錯題重做答對後移除 */
  inWrongList: z.boolean().default(false),
  correctCount: z.number().int().min(0).default(0),
  wrongCount: z.number().int().min(0).default(0),
  lastPracticedAt: z.string().default(""),
});
export type VocabProgress = z.infer<typeof vocabProgressSchema>;

export const articleProgressSchema = z.object({
  isLearned: z.boolean().default(false),
  isFavorite: z.boolean().default(false),
});
export type ArticleProgress = z.infer<typeof articleProgressSchema>;

export const learnerProgressSchema = z.object({
  vocab: z.record(z.string(), vocabProgressSchema).default({}),
  articles: z.record(z.string(), articleProgressSchema).default({}),
});
export type LearnerProgress = z.infer<typeof learnerProgressSchema>;

export const progressFileSchema = z.record(z.string(), learnerProgressSchema);
export type ProgressFile = z.infer<typeof progressFileSchema>;

/* ---------- 練習紀錄 ---------- */

export const practiceAnswerSchema = z.object({
  questionId: z.string().max(200),
  /** 生字 id 或句子文字，用於重做 */
  refId: z.string().max(1000).default(""),
  prompt: z.string().max(3000),
  userAnswer: z.string().max(3000).default(""),
  correctAnswer: z.string().max(3000).default(""),
  /** 跟讀沒有對錯，記為 null */
  isCorrect: z.boolean().nullable(),
  explanation: z.string().max(3000).default(""),
});
export type PracticeAnswer = z.infer<typeof practiceAnswerSchema>;

export const practiceRecordSchema = z.object({
  id: idSchema,
  learnerId: idSchema,
  kind: z.enum(PRACTICE_KIND_IDS),
  /** 生字練習模式、Reading Lab 題型等 */
  mode: z.string().max(50),
  title: z.string().max(200),
  category: z.union([categorySchema, z.literal("")]).default(""),
  exerciseId: z.string().default(""),
  date: z.string(),
  total: z.number().int().min(0),
  correct: z.number().int().min(0),
  /** 跟讀不計分 */
  scored: z.boolean(),
  answers: z.array(practiceAnswerSchema),
});
export type PracticeRecord = z.infer<typeof practiceRecordSchema>;

/** 客戶端提交的練習結果（伺服器計算總數及正確數） */
export const practiceRecordInputSchema = z.object({
  learnerId: idSchema,
  kind: z.enum(["vocabulary", "dictation", "shadowing"]),
  mode: z.string().min(1).max(50),
  title: z.string().min(1).max(200),
  category: z.union([categorySchema, z.literal("")]).default(""),
  answers: z.array(practiceAnswerSchema).min(1, "沒有作答資料").max(200),
});
export type PracticeRecordInput = z.infer<typeof practiceRecordInputSchema>;
