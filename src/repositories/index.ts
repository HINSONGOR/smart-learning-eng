// 所有 Repository 實例。Service 層只透過這裡存取資料。
import "server-only";
import {
  articleSchema,
  practiceRecordSchema,
  progressFileSchema,
  readingExerciseSchema,
  resourceSchema,
  settingsSchema,
  vocabularySchema,
} from "@/lib/schemas";
import type { LearningResource, ProgressFile, Settings, Vocabulary } from "@/lib/schemas";
// 初始資料：Daily 及 Workplace 的示範生字（標示 isDemo）、示範網址及學習者設定。
// 讀取時會再經 schema 驗證，所以這裡只做型別轉換。
import seedVocabulary from "@/data/seed/vocabulary.json";
import seedResources from "@/data/seed/learning-resources.json";
import seedSettings from "@/data/seed/settings.json";
import { createJsonCollectionRepository, createJsonDocumentRepository } from "./collectionRepository";

export const vocabularyRepository = createJsonCollectionRepository(
  "vocabulary.json",
  vocabularySchema,
  () => structuredClone(seedVocabulary) as unknown as Vocabulary[],
);

/** IELTS 文章由使用者日後提供，初始為空 */
export const articleRepository = createJsonCollectionRepository("articles.json", articleSchema);

/** Reading Lab 題目由使用者日後提供，初始為空 */
export const exerciseRepository = createJsonCollectionRepository(
  "reading-exercises.json",
  readingExerciseSchema,
);

export const resourceRepository = createJsonCollectionRepository(
  "learning-resources.json",
  resourceSchema,
  () => structuredClone(seedResources) as unknown as LearningResource[],
);

export const recordRepository = createJsonCollectionRepository(
  "practice-records.json",
  practiceRecordSchema,
);

export const progressRepository = createJsonDocumentRepository(
  "learner-progress.json",
  progressFileSchema,
  (): ProgressFile => ({}),
);

export const settingsRepository = createJsonDocumentRepository(
  "settings.json",
  settingsSchema,
  () => structuredClone(seedSettings) as Settings,
);
