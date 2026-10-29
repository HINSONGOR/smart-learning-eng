// 練習紀錄的模式名稱
import { EXERCISE_TYPES, PRACTICE_KINDS, VOCAB_PRACTICE_MODES, type PracticeKind } from "./constants";

export function modeLabel(kind: PracticeKind, mode: string): string {
  if (kind === "vocabulary") {
    if (mode === "flashcards") return "單字卡溫習";
    return VOCAB_PRACTICE_MODES[mode as keyof typeof VOCAB_PRACTICE_MODES]?.label ?? mode;
  }
  if (kind === "reading-lab") return EXERCISE_TYPES[mode as keyof typeof EXERCISE_TYPES] ?? mode;
  return PRACTICE_KINDS[kind];
}
