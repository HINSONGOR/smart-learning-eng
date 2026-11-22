// 在句子中找出文章生字表的目標詞（容許常見詞尾變化及「…」中間插入的字），用來加底線。
import { escapeRegExp } from "./text";

export interface HighlightRange {
  start: number;
  end: number;
  /** 對應的生字表詞語，點擊時用它查詢 */
  term: string;
}

// 可以互換的字：代名詞、be 動詞
const POSSESSIVES = ["their", "his", "her", "my", "our", "your", "its"];
const BE_FORMS = ["be", "is", "are", "was", "were", "been", "being", "am"];
// 常見不規則動詞的各種形式
const IRREGULAR: string[][] = [
  ["make", "made", "makes", "making"],
  ["keep", "kept", "keeps", "keeping"],
  ["fall", "fell", "fallen", "falls", "falling"],
  ["come", "came", "comes", "coming"],
  ["break", "broke", "broken", "breaks", "breaking"],
  ["hold", "held", "holds", "holding"],
  ["shoot", "shot", "shoots", "shooting"],
  ["take", "took", "taken", "takes", "taking"],
  ["give", "gave", "given", "gives", "giving"],
  ["get", "got", "gotten", "gets", "getting"],
  ["go", "went", "gone", "goes", "going"],
  ["run", "ran", "runs", "running"],
  ["put", "puts", "putting"],
  ["set", "sets", "setting"],
  ["leave", "left", "leaves", "leaving"],
  ["bring", "brought", "brings", "bringing"],
  ["catch", "caught", "catches", "catching"],
  ["find", "found", "finds", "finding"],
  ["think", "thought", "thinks", "thinking"],
];

function wordPattern(w: string): string {
  const group = [POSSESSIVES, BE_FORMS, ...IRREGULAR].find((g) => g.includes(w));
  if (group) return `(?:${group.join("|")})`;
  const base = escapeRegExp(w).replace(/'/g, "['’]");
  const options = [`${base}(?:s|es|ed|d|ing|ings|['’]s)?`];
  // measure → measuring／measured
  if (w.endsWith("e") && w.length > 3) options.push(`${escapeRegExp(w.slice(0, -1))}(?:ing|ed|es)`);
  // apply → applies／applied
  if (/[^aeiou]y$/.test(w)) options.push(`${escapeRegExp(w.slice(0, -1))}(?:ies|ied)`);
  // 詞表用複數（patterns），文中用單數（pattern）
  if (/[^s]s$/.test(w) && w.length > 4) options.push(`${escapeRegExp(w.slice(0, -1))}`);
  // refers → refer／referred
  if (/[^aeiou][aeiou][^aeiouwxy]s?$/.test(w)) {
    const root = w.replace(/s$/, "");
    options.push(`${escapeRegExp(root)}${escapeRegExp(root.slice(-1))}(?:ed|ing)`);
  }
  return `(?:${options.join("|")})`;
}

function termPattern(term: string): RegExp | null {
  const segments = term
    .toLowerCase()
    .replace(/[’]/g, "'")
    .split(/\s*(?:…|\.\.\.)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length === 0) return null;
  const segment = (s: string) => s.split(/\s+/).map(wordPattern).join("\\s+");
  // 「feel … content with」：兩段之間容許最多三個字
  const body = segments.map(segment).join("(?:\\s+\\S+){0,3}?\\s+");
  return new RegExp(`(?<![A-Za-z])${body}(?![A-Za-z])`, "gi");
}

export function findGlossaryRanges(sentence: string, terms: string[]): HighlightRange[] {
  const found: HighlightRange[] = [];
  // 較長的詞語優先，例如 "in the distance" 先於 "distance"
  for (const term of [...terms].sort((a, b) => b.length - a.length)) {
    const pattern = termPattern(term);
    if (!pattern) continue;
    for (const m of sentence.matchAll(pattern)) {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      if (found.some((r) => start < r.end && end > r.start)) continue;
      found.push({ start, end, term });
    }
  }
  return found.sort((a, b) => a.start - b.start);
}
