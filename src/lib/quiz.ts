// 生字選擇題出題邏輯（純函數，方便測試）。
import { MIN_CHOICES, PART_OF_SPEECH_ZH, type VocabPracticeMode } from "./constants";
import { blankOutWord, shuffle } from "./text";
import type { QuizQuestion, QuizResult, VocabularyView } from "@/types";

type Format = QuizQuestion["format"];

interface FormatSpec {
  label: string;
  /** 這個生字可否用此格式出題 */
  eligible: (v: VocabularyView) => boolean;
  /** 選項值（同時是答案） */
  value: (v: VocabularyView) => string;
  build: (v: VocabularyView) => Pick<QuizQuestion, "prompt" | "hint" | "speakText">;
}

const posZh = (pos: string) => PART_OF_SPEECH_ZH[pos] ?? pos;

const FORMATS: Record<Format, FormatSpec> = {
  "en-zh": {
    label: "英文選中文",
    eligible: () => true,
    value: (v) => v.meaningZh,
    build: (v) => ({ prompt: v.word, hint: posZh(v.partOfSpeech), speakText: v.word }),
  },
  "zh-en": {
    label: "中文選英文",
    eligible: () => true,
    value: (v) => v.word,
    build: (v) => ({ prompt: v.meaningZh, hint: posZh(v.partOfSpeech), speakText: "" }),
  },
  "fill-blank": {
    label: "填充題",
    eligible: (v) => blankOutWord(v.exampleEn, v.word) !== null,
    value: (v) => v.word,
    build: (v) => ({
      prompt: blankOutWord(v.exampleEn, v.word) ?? v.exampleEn,
      hint: v.exampleZh,
      speakText: "",
    }),
  },
  "sentence-reading": {
    label: "例句閱讀",
    eligible: (v) => v.exampleZh.trim() !== "",
    value: (v) => v.exampleZh,
    build: (v) => ({ prompt: v.exampleEn, hint: "選出這句英文的正確中文翻譯", speakText: v.exampleEn }),
  },
  definition: {
    label: "English Definition Quiz",
    eligible: (v) => v.definitionEn.trim() !== "",
    value: (v) => v.definitionEn,
    build: (v) => ({ prompt: v.word, hint: v.partOfSpeech, speakText: v.word }),
  },
};

function explanationFor(v: VocabularyView): string {
  const parts = [`${v.word}（${posZh(v.partOfSpeech)}）：${v.meaningZh}`];
  if (v.definitionEn) parts.push(`English: ${v.definitionEn}`);
  parts.push(`例句：${v.exampleEn}${v.exampleZh ? `（${v.exampleZh}）` : ""}`);
  return parts.join("\n");
}

/** 為一個生字揀選錯誤選項：優先同分類，不足時用全部生字 */
function pickDistractors(
  target: VocabularyView,
  pool: VocabularyView[],
  spec: FormatSpec,
  random: () => number,
): string[] | null {
  const answer = spec.value(target);
  const collect = (candidates: VocabularyView[]) => {
    const values = new Set<string>();
    for (const v of shuffle(candidates, random)) {
      if (v.id === target.id || !spec.eligible(v)) continue;
      const value = spec.value(v).trim();
      if (value && value.toLowerCase() !== answer.trim().toLowerCase()) values.add(value);
    }
    return [...values];
  };
  let distractors = collect(pool.filter((v) => v.category === target.category));
  if (distractors.length < MIN_CHOICES - 1) {
    const extra = collect(pool).filter((d) => !distractors.includes(d));
    distractors = [...distractors, ...extra];
  }
  if (distractors.length < MIN_CHOICES - 1) return null;
  return distractors.slice(0, MIN_CHOICES - 1);
}

export interface BuildQuizOptions {
  mode: VocabPracticeMode;
  count: number;
  random?: () => number;
}

/**
 * @param targets 要練習的生字（已按篩選條件選好）
 * @param pool    所有生字，用來產生錯誤選項
 */
export function buildQuiz(
  targets: VocabularyView[],
  pool: VocabularyView[],
  { mode, count, random = Math.random }: BuildQuizOptions,
): QuizResult {
  if (targets.length === 0) {
    const message =
      mode === "review"
        ? "目前沒有「待重溫」的生字。練習時答錯或在生字庫標記「待重溫」後，就會出現在這裡。"
        : mode === "wrong-redo"
          ? "目前沒有錯題。太好了！"
          : "沒有符合篩選條件的生字。請先新增生字或調整篩選條件。";
    return { questions: [], message };
  }

  // 重溫及錯題重做：每題隨機使用英選中、中選英或填充
  const formatsFor = (v: VocabularyView): Format[] => {
    if (mode === "review" || mode === "wrong-redo") {
      return shuffle<Format>(["en-zh", "zh-en", "fill-blank"], random).filter((f) =>
        FORMATS[f].eligible(v),
      );
    }
    return FORMATS[mode].eligible(v) ? [mode] : [];
  };

  const questions: QuizQuestion[] = [];
  for (const target of shuffle(targets, random)) {
    if (questions.length >= count) break;
    for (const format of formatsFor(target)) {
      const spec = FORMATS[format];
      const distractors = pickDistractors(target, pool, spec, random);
      if (!distractors) continue;
      const answer = spec.value(target).trim();
      questions.push({
        id: `${target.id}-${format}`,
        vocabId: target.id,
        format,
        ...spec.build(target),
        options: shuffle([answer, ...distractors], random),
        answer,
        explanation: explanationFor(target),
      });
      break;
    }
  }

  if (questions.length === 0) {
    const spec = mode === "review" || mode === "wrong-redo" ? null : FORMATS[mode];
    const needs =
      mode === "definition"
        ? "有英文解釋的生字"
        : mode === "sentence-reading"
          ? "有例句中文翻譯的生字"
          : "生字";
    return {
      questions: [],
      message: `可用來出題的${needs}不足。每題需要 ${MIN_CHOICES} 個不同選項，請先在生字庫加入至少 ${MIN_CHOICES} 個${needs}${spec ? `（${spec.label}）` : ""}。`,
    };
  }
  return { questions, message: "" };
}
