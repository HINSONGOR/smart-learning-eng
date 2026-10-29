// Service + Repository 整合測試。每個測試使用獨立的暫存資料夾，不會影響 data/。
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DataFileError, ValidationError } from "@/lib/errors";

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "sle-test-"));
  process.env.DATA_DIR = dir;
});

afterEach(async () => {
  // 不刪除 DATA_DIR 設定：尚未完成的寫入只會落在暫存資料夾，不會寫入真正的 data/
  await fs.rm(dir, { recursive: true, force: true });
});

const sampleInput = {
  word: "placeholder",
  partOfSpeech: "noun",
  meaningZh: "佔位",
  exampleEn: "This placeholder is for testing.",
  category: "ielts",
  topic: "Test",
};

describe("first start", () => {
  it("creates data files with demo vocabulary and empty IELTS content", async () => {
    const { listVocabulary } = await import("./vocabularyService");
    const { listArticles } = await import("./articleService");
    const { listExerciseSummaries } = await import("./readingLabService");
    const vocab = await listVocabulary("me");
    expect(vocab.length).toBeGreaterThan(0);
    expect(vocab.every((v) => v.isDemo && v.category !== "ielts")).toBe(true);
    expect(await listArticles("me")).toEqual([]);
    expect((await listExerciseSummaries("me")).exercises).toEqual([]);
    const files = await fs.readdir(dir);
    expect(files).toEqual(
      expect.arrayContaining(["vocabulary.json", "articles.json", "reading-exercises.json"]),
    );
  });
});

describe("vocabulary CRUD", () => {
  it("creates, updates, searches and deletes, persisting to JSON", async () => {
    const svc = await import("./vocabularyService");
    const created = await svc.createVocabulary(sampleInput);
    const raw = JSON.parse(await fs.readFile(path.join(dir, "vocabulary.json"), "utf8"));
    expect(raw.some((v: { id: string }) => v.id === created.id)).toBe(true);

    await svc.updateVocabulary(created.id, { ...sampleInput, meaningZh: "已修改" });
    const found = await svc.listVocabulary("me", { search: "已修改" });
    expect(found).toHaveLength(1);

    await svc.deleteVocabulary(created.id);
    expect(await svc.listVocabulary("me", { category: "ielts" })).toHaveLength(0);
  });

  it("rejects invalid input and duplicates", async () => {
    const svc = await import("./vocabularyService");
    await expect(svc.createVocabulary({ ...sampleInput, word: "" })).rejects.toBeInstanceOf(ValidationError);
    await svc.createVocabulary(sampleInput);
    await expect(svc.createVocabulary({ ...sampleInput, word: "Placeholder" })).rejects.toThrow("已經有");
  });

  it("keeps progress separate per learner", async () => {
    const svc = await import("./vocabularyService");
    const created = await svc.createVocabulary(sampleInput);
    await svc.setVocabularyFlags("me", created.id, { isFavorite: true });
    expect((await svc.getVocabulary("me", created.id)).progress.isFavorite).toBe(true);
    expect((await svc.getVocabulary("son", created.id)).progress.isFavorite).toBe(false);
  });

  it("removes only demo data", async () => {
    const svc = await import("./vocabularyService");
    await svc.createVocabulary(sampleInput);
    const removed = await svc.removeDemoData();
    expect(removed.vocabulary).toBeGreaterThan(0);
    const rest = await svc.listVocabulary("me");
    expect(rest.map((v) => v.word)).toEqual(["placeholder"]);
  });
});

describe("practice records", () => {
  it("saves a vocabulary record and updates wrong list / review", async () => {
    const vocab = await import("./vocabularyService");
    const records = await import("./recordService");
    const [first, second] = await vocab.listVocabulary("me");
    const record = await records.saveClientRecord({
      learnerId: "me",
      kind: "vocabulary",
      mode: "en-zh",
      title: "Test",
      answers: [
        { questionId: "a", refId: first.id, prompt: "p", isCorrect: true },
        { questionId: "b", refId: second.id, prompt: "p", isCorrect: false },
      ],
    });
    expect(record.total).toBe(2);
    expect(record.correct).toBe(1);
    const wrong = await vocab.getVocabulary("me", second.id);
    expect(wrong.progress.inWrongList).toBe(true);
    expect(wrong.progress.needsReview).toBe(true);

    // 錯題重做答對後從錯題清單移除
    await records.saveClientRecord({
      learnerId: "me",
      kind: "vocabulary",
      mode: "wrong-redo",
      title: "Redo",
      answers: [{ questionId: "c", refId: second.id, prompt: "p", isCorrect: true }],
    });
    expect((await vocab.getVocabulary("me", second.id)).progress.inWrongList).toBe(false);
    expect(await records.listRecords("me")).toHaveLength(2);
    expect(await records.listRecords("son")).toHaveLength(0);
  });

  it("rejects unknown learners", async () => {
    const records = await import("./recordService");
    await expect(
      records.saveClientRecord({
        learnerId: "nobody",
        kind: "dictation",
        mode: "dictation",
        title: "x",
        answers: [{ questionId: "a", prompt: "p", isCorrect: true }],
      }),
    ).rejects.toThrow("學習者");
  });
});

describe("reading lab", () => {
  it("hides answers before submit and grades on the server", async () => {
    await fs.writeFile(
      path.join(dir, "reading-exercises.json"),
      JSON.stringify([
        {
          id: "ex1",
          title: "Placeholder",
          type: "multiple-choice",
          createdAt: "2026-01-01T00:00:00.000Z",
          questions: [
            {
              id: "q1",
              number: 1,
              prompt: "Pick one",
              answers: ["B"],
              options: [
                { key: "A", text: "Option A" },
                { key: "B", text: "Option B" },
              ],
            },
          ],
        },
      ]),
    );
    const lab = await import("./readingLabService");
    const pub = await lab.getPublicExercise("ex1");
    expect(JSON.stringify(pub)).not.toContain('"answers"');
    const record = await lab.submitExercise("ex1", { learnerId: "son", answers: { q1: "b" } });
    expect(record.correct).toBe(1);
    expect(record.answers[0].correctAnswer).toBe("B. Option B");
    const summary = await lab.listExerciseSummaries("son");
    expect(summary.accuracy[0]).toMatchObject({ type: "multiple-choice", total: 1, correct: 1 });
  });
});

describe("lookup", () => {
  it("falls back to manual input when nothing is found and Gemini is not configured", async () => {
    delete process.env.GEMINI_API_KEY;
    const { lookupText } = await import("./lookupService");
    const result = await lookupText({ text: "unknownplaceholder" });
    expect(result.source).toBe("none");
    expect(result.notice).toContain("自行輸入");
  });

  it("finds words already in the vocabulary list", async () => {
    const { lookupText } = await import("./lookupService");
    const result = await lookupText({ text: "Receipt" });
    expect(result.source).toBe("vocabulary");
    expect(result.existingVocabId).not.toBe("");
  });
});

describe("file safety", () => {
  it("never overwrites a corrupted file", async () => {
    await fs.writeFile(path.join(dir, "vocabulary.json"), "{ broken");
    const { listVocabulary } = await import("./vocabularyService");
    await expect(listVocabulary("me")).rejects.toBeInstanceOf(DataFileError);
    expect(await fs.readFile(path.join(dir, "vocabulary.json"), "utf8")).toBe("{ broken");
  });

  it("serializes concurrent writes without losing data", async () => {
    const svc = await import("./vocabularyService");
    await Promise.all(
      [1, 2, 3, 4, 5].map((i) => svc.createVocabulary({ ...sampleInput, word: `placeholder${i}` })),
    );
    expect(await svc.listVocabulary("me", { category: "ielts" })).toHaveLength(5);
  });
});
