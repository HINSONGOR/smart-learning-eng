// 全系統共用型別。資料型別由 Zod schema 推導，避免重複定義。
export type {
  Article,
  ArticleProgress,
  ChoiceOption,
  ExerciseQuestion,
  GlossaryItem,
  LearnerProgress,
  Learner,
  LearningResource,
  PracticeAnswer,
  PracticeRecord,
  PracticeRecordInput,
  ReadingExercise,
  ResourceInput,
  Settings,
  VocabProgress,
  Vocabulary,
  VocabularyInput,
} from "@/lib/schemas";

import type {
  Article,
  ArticleProgress,
  PracticeRecord,
  ReadingExercise,
  VocabProgress,
  Vocabulary,
} from "@/lib/schemas";
import type { CategoryId, ExerciseType, VocabPracticeMode } from "@/lib/constants";

/** 生字內容 + 目前學習者的進度 */
export interface VocabularyView extends Vocabulary {
  progress: VocabProgress;
}

export interface ArticleView extends Article {
  progress: ArticleProgress;
}

/** 不含答案的 Reading Lab 題目，作答前傳給瀏覽器 */
export type PublicExercise = Omit<ReadingExercise, "questions"> & {
  questions: Array<Omit<ReadingExercise["questions"][number], "answers" | "explanation">>;
};

export interface ExerciseSummary {
  id: string;
  title: string;
  type: ExerciseType;
  category: CategoryId;
  level: string;
  ieltsBand: string;
  questionCount: number;
  /** 目前學習者最近一次成績 */
  lastRecord: Pick<PracticeRecord, "id" | "date" | "total" | "correct"> | null;
}

export interface TypeAccuracy {
  type: string;
  attempts: number;
  total: number;
  correct: number;
}

/** 生字選擇題 */
export interface QuizQuestion {
  id: string;
  vocabId: string;
  format: Exclude<VocabPracticeMode, "review" | "wrong-redo">;
  /** 題目主要文字 */
  prompt: string;
  /** 次要提示，例如詞性 */
  hint: string;
  /** 需要朗讀的英文，例如生字或例句 */
  speakText: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface QuizResult {
  questions: QuizQuestion[];
  /** 無法出題時的原因 */
  message: string;
}

export interface PracticeSentence {
  key: string;
  en: string;
  zh: string;
  sourceLabel: string;
  category: CategoryId;
}

export interface LookupResult {
  text: string;
  source: "glossary" | "vocabulary" | "gemini" | "none";
  partOfSpeech: string;
  meaningZh: string;
  definitionEn: string;
  exampleEn: string;
  exampleZh: string;
  /** 已存在生字庫中的生字 id */
  existingVocabId: string;
  /** 例如 Gemini 未設定或連線失敗的說明 */
  notice: string;
}

export interface HomeStats {
  totalVocabulary: number;
  practicedVocabulary: number;
  reviewCount: number;
  masteredCount: number;
  favoriteCount: number;
  wrongListCount: number;
  totalAnswers: number;
  correctAnswers: number;
  /** 0–100；沒有作答時為 null */
  accuracy: number | null;
  practiceCount: number;
  recentRecords: Array<Pick<PracticeRecord, "id" | "kind" | "mode" | "title" | "date" | "total" | "correct" | "scored">>;
  byCategory: Record<CategoryId, { vocabulary: number; articles: number; exercises: number }>;
}
