// 聽寫逐字比對（純函數，方便測試）。
import { normalizeAnswer } from "./text";

export interface WordResult {
  word: string;
  status: "correct" | "missing";
}

export interface DictationComparison {
  /** 原句每個字的結果 */
  words: WordResult[];
  /** 使用者多打或打錯的字 */
  extraWords: string[];
  correctCount: number;
  totalCount: number;
  accuracy: number;
  isPerfect: boolean;
}

function tokenize(text: string): string[] {
  return normalizeAnswer(text).split(" ").filter(Boolean);
}

/** 用最長公共子序列對齊原句及使用者輸入 */
export function compareDictation(expected: string, actual: string): DictationComparison {
  const displayWords = expected.split(/\s+/).filter(Boolean);
  const target = displayWords.map((w) => normalizeAnswer(w));
  const typed = tokenize(actual);

  const rows = target.length + 1;
  const cols = typed.length + 1;
  const table: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = target.length - 1; i >= 0; i--) {
    for (let j = typed.length - 1; j >= 0; j--) {
      table[i][j] =
        target[i] === typed[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const matchedTarget = new Set<number>();
  const matchedTyped = new Set<number>();
  let i = 0;
  let j = 0;
  while (i < target.length && j < typed.length) {
    if (target[i] === typed[j]) {
      matchedTarget.add(i);
      matchedTyped.add(j);
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }

  // 只有標點的「字」（例如 "-"）不計算
  const counted = target.map((t) => t !== "");
  const words: WordResult[] = displayWords.map((word, index) => ({
    word,
    status: matchedTarget.has(index) || !counted[index] ? "correct" : "missing",
  }));
  const totalCount = counted.filter(Boolean).length;
  const correctCount = words.filter((w, index) => counted[index] && w.status === "correct").length;
  const extraWords = typed.filter((_, index) => !matchedTyped.has(index));
  const accuracy = totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100);

  return {
    words,
    extraWords,
    correctCount,
    totalCount,
    accuracy,
    isPerfect: correctCount === totalCount && extraWords.length === 0 && totalCount > 0,
  };
}
