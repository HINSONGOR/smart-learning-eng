// 所有 Repository 實例。Service 層只透過這裏存取資料。
// DATA_BACKEND=firestore 時使用 Firebase Firestore（雲端）；否則使用本機 data/*.json。
import "server-only";
import { z, type ZodType } from "zod";
import {
  articleSchema,
  progressFileSchema,
  readingExerciseSchema,
  resourceSchema,
  settingsSchema,
  vocabularySchema,
} from "@/lib/schemas";
import type { LearningResource, ProgressFile, Settings, Vocabulary } from "@/lib/schemas";
// 初始資料：Daily 及 Workplace 的示範生字（標示 isDemo）、示範網址及學習者設定。
// 讀取時會再經 schema 驗證，所以這裏只做型別轉換。
import seedVocabulary from "@/data/seed/vocabulary.json";
import seedResources from "@/data/seed/learning-resources.json";
import seedSettings from "@/data/seed/settings.json";
import { createCollectionRepository, type DocumentStore } from "./collectionRepository";
import { createFirestoreStore } from "./firestoreStore";
import { createJsonStore } from "./jsonFileStore";
import { createFirestoreRecordRepository, createJsonRecordRepository } from "./recordRepository";

export function isCloudBackend(): boolean {
  return process.env.DATA_BACKEND === "firestore";
}

/** 本機用檔名（例如 vocabulary.json），雲端用文件名稱（例如 vocabulary） */
function store<T>(name: string, schema: ZodType<T>, seed: () => T): DocumentStore<T> {
  return isCloudBackend()
    ? createFirestoreStore(name, schema, seed)
    : createJsonStore({ fileName: `${name}.json`, schema, seed });
}

export const vocabularyRepository = createCollectionRepository(
  store("vocabulary", z.array(vocabularySchema), () => structuredClone(seedVocabulary) as unknown as Vocabulary[]),
);

/** IELTS 文章由使用者日後提供，初始為空 */
export const articleRepository = createCollectionRepository(store("articles", z.array(articleSchema), () => []));

/** Reading Lab 題目由使用者日後提供，初始為空 */
export const exerciseRepository = createCollectionRepository(
  store("reading-exercises", z.array(readingExerciseSchema), () => []),
);

export const resourceRepository = createCollectionRepository(
  store(
    "learning-resources",
    z.array(resourceSchema),
    () => structuredClone(seedResources) as unknown as LearningResource[],
  ),
);

export const recordRepository = isCloudBackend() ? createFirestoreRecordRepository() : createJsonRecordRepository();

export const progressRepository = store("learner-progress", progressFileSchema, (): ProgressFile => ({}));

export const settingsRepository = store("settings", settingsSchema, () => structuredClone(seedSettings) as Settings);
