// 文字處理小工具，伺服器及瀏覽器都可以使用。

/** 比對答案用：忽略大小寫、標點及多餘空格 */
export function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 在句子中找出生字（容許常見詞尾變化，例如 qualification → qualifications）。
 * 找不到時回傳 null。
 */
export function findWordInSentence(sentence: string, word: string): { start: number; end: number } | null {
  const pattern = new RegExp(`\\b${escapeRegExp(word.trim())}(?:s|es|d|ed|ing)?\\b`, "i");
  const match = pattern.exec(sentence);
  if (!match) return null;
  return { start: match.index, end: match.index + match[0].length };
}

/** 把句子中的生字換成空格 */
export function blankOutWord(sentence: string, word: string): string | null {
  const found = findWordInSentence(sentence, word);
  if (!found) return null;
  return `${sentence.slice(0, found.start)}_____${sentence.slice(found.end)}`;
}

/** 把文章段落拆成句子（用於使用者自行整理的純文字） */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function percent(correct: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((correct / total) * 100);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("zh-HK", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
