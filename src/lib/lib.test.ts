// 純函數測試：答案比對、出題、評分、聽寫比對。
// 測試資料全部是佔位文字（Test word 等），不是教材內容。
import { describe, expect, it } from "vitest";
import { blankOutWord, normalizeAnswer, percent } from "./text";
import { buildQuiz } from "./quiz";
import { gradeExercise, isAnswerCorrect } from "./grading";
import { compareDictation } from "./dictation";
import type { ReadingExercise, VocabularyView } from "@/types";

function word(i: number, extra: Partial<VocabularyView> = {}): VocabularyView {
  return {
    id: `w${i}`,
    word: `testword${i}`,
    partOfSpeech: "noun",
    meaningZh: `測試解釋${i}`,
    definitionEn: `test definition ${i}`,
    exampleEn: `This is testword${i} in a sentence.`,
    exampleZh: `測試句子${i}`,
    category: "daily",
    topic: "Test",
    level: "",
    ieltsBand: "",
    sourceArticleId: "",
    isDemo: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    progress: {
      isFavorite: false,
      needsReview: false,
      isMastered: false,
      inWrongList: false,
      correctCount: 0,
      wrongCount: 0,
      lastPracticedAt: "",
    },
    ...extra,
  };
}

describe("text", () => {
  it("normalizes answers ignoring case, punctuation and spaces", () => {
    expect(normalizeAnswer("  Sample   Answer! ")).toBe("sample answer");
    expect(normalizeAnswer("It’s")).toBe("it's");
  });

  it("blanks out a word including simple suffixes", () => {
    expect(blankOutWord("She has two placeholders here.", "placeholder")).toBe("She has two _____ here.");
    expect(blankOutWord("No match here.", "missing")).toBeNull();
  });

  it("calculates percent safely", () => {
    expect(percent(3, 4)).toBe(75);
    expect(percent(0, 0)).toBeNull();
  });
});

describe("buildQuiz", () => {
  const pool = [1, 2, 3, 4, 5].map((i) => word(i));

  it("returns an empty-state message when there are no words", () => {
    const result = buildQuiz([], [], { mode: "en-zh", count: 10 });
    expect(result.questions).toHaveLength(0);
    expect(result.message).not.toBe("");
  });

  it("needs at least 4 distinct options", () => {
    const small = pool.slice(0, 3);
    const result = buildQuiz(small, small, { mode: "en-zh", count: 10 });
    expect(result.questions).toHaveLength(0);
    expect(result.message).toContain("4");
  });

  it("creates questions with the answer among 4 unique options", () => {
    const result = buildQuiz(pool, pool, { mode: "en-zh", count: 3 });
    expect(result.questions).toHaveLength(3);
    for (const q of result.questions) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(q.answer);
    }
  });

  it("builds fill-blank questions with a blank", () => {
    const result = buildQuiz(pool, pool, { mode: "fill-blank", count: 5 });
    expect(result.questions.length).toBe(5);
    expect(result.questions.every((q) => q.prompt.includes("_____"))).toBe(true);
  });

  it("skips definition questions when not enough definitions exist", () => {
    const noDef = pool.map((w) => ({ ...w, definitionEn: "" }));
    const result = buildQuiz(noDef, noDef, { mode: "definition", count: 5 });
    expect(result.questions).toHaveLength(0);
    expect(result.message).toContain("英文解釋");
  });
});

const exercise: ReadingExercise = {
  id: "ex1",
  title: "Placeholder exercise",
  type: "sentence-completion",
  category: "ielts",
  level: "",
  ieltsBand: "",
  instructions: "",
  passage: { title: "", paragraphs: ["Placeholder passage."] },
  questions: [
    { id: "q1", number: 1, prompt: "The answer is ___.", answers: ["sample answer", "sample"], options: [], explanation: "Test explanation" },
    { id: "q2", number: 2, prompt: "Second ___.", answers: ["option"], options: [], explanation: "" },
  ],
  matchingOptions: [],
  flowSteps: [],
  source: "",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("grading", () => {
  it("accepts any listed answer, ignoring case and punctuation", () => {
    expect(isAnswerCorrect(exercise.questions[0], "Sample Answer.", "text")).toBe(true);
    expect(isAnswerCorrect(exercise.questions[0], "SAMPLE", "text")).toBe(true);
    expect(isAnswerCorrect(exercise.questions[0], "wrong", "text")).toBe(false);
    expect(isAnswerCorrect(exercise.questions[0], "", "text")).toBe(false);
  });

  it("compares choice keys case-insensitively", () => {
    const q = { ...exercise.questions[0], answers: ["B"] };
    expect(isAnswerCorrect(q, "b", "choice")).toBe(true);
    expect(isAnswerCorrect(q, "C", "choice")).toBe(false);
  });

  it("grades a whole exercise and supports redo of selected questions", () => {
    const all = gradeExercise(exercise, { q1: "sample", q2: "nope" });
    expect(all.map((a) => a.isCorrect)).toEqual([true, false]);
    expect(all[1].correctAnswer).toBe("option");
    const redo = gradeExercise(exercise, { q2: "option" }, ["q2"]);
    expect(redo).toHaveLength(1);
    expect(redo[0].isCorrect).toBe(true);
  });
});

describe("compareDictation", () => {
  it("marks a perfect answer", () => {
    const result = compareDictation("This is a test.", "this is a test");
    expect(result.isPerfect).toBe(true);
    expect(result.accuracy).toBe(100);
  });

  it("finds missing and extra words", () => {
    const result = compareDictation("One two three four", "one three four five");
    expect(result.words.find((w) => w.word === "two")?.status).toBe("missing");
    expect(result.extraWords).toEqual(["five"]);
    expect(result.correctCount).toBe(3);
    expect(result.accuracy).toBe(75);
    expect(result.isPerfect).toBe(false);
  });
});
