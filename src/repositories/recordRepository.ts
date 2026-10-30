// 練習紀錄 Repository。紀錄會一直增加，所以：
// - 每次練習的完整作答存成獨立資料
// - 另外為每位學習者保存一份「摘要清單」，列表及統計只需讀取一次
import "server-only";
import { z } from "zod";
import { practiceRecordSchema, type PracticeRecord } from "@/lib/schemas";
import { db } from "@/lib/firebaseAdmin";
import { collection } from "@/lib/firestoreCollections";
import { createJsonStore } from "./jsonFileStore";
import { createCollectionRepository } from "./collectionRepository";

export type PracticeRecordSummary = Omit<PracticeRecord, "answers">;

export interface RecordRepository {
  insert(record: PracticeRecord): Promise<PracticeRecord>;
  get(id: string): Promise<PracticeRecord | undefined>;
  remove(id: string): Promise<boolean>;
  /** 某位學習者的紀錄摘要，最新在前 */
  listSummaries(learnerId: string): Promise<PracticeRecordSummary[]>;
  /** 全部完整紀錄（只用於備份） */
  listAll(): Promise<PracticeRecord[]>;
}

export function toSummary(record: PracticeRecord): PracticeRecordSummary {
  const { answers: _answers, ...summary } = record;
  void _answers;
  return summary;
}

const byNewest = (a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date);

export function createJsonRecordRepository(): RecordRepository {
  const collection = createCollectionRepository(
    createJsonStore({ fileName: "practice-records.json", schema: z.array(practiceRecordSchema), seed: () => [] }),
  );
  return {
    insert: (record) => collection.insert(record),
    get: (id) => collection.get(id),
    remove: (id) => collection.remove(id),
    async listSummaries(learnerId) {
      const all = await collection.list();
      return all.filter((r) => r.learnerId === learnerId).map(toSummary).sort(byNewest);
    },
    listAll: () => collection.list(),
  };
}

const summarySchema = practiceRecordSchema.omit({ answers: true });

export function createFirestoreRecordRepository(): RecordRepository {
  const recordRef = (id: string) => collection("practiceRecords").doc(id);
  const indexRef = (learnerId: string) => collection("recordIndex").doc(learnerId);

  async function readIndex(learnerId: string, tx?: FirebaseFirestore.Transaction) {
    const snapshot = tx ? await tx.get(indexRef(learnerId)) : await indexRef(learnerId).get();
    const parsed = z.array(summarySchema).safeParse(snapshot.data()?.items ?? []);
    return parsed.success ? parsed.data : [];
  }

  return {
    async insert(record) {
      const valid = practiceRecordSchema.parse(record);
      await db().runTransaction(async (tx) => {
        const items = await readIndex(valid.learnerId, tx);
        tx.set(recordRef(valid.id), valid);
        tx.set(indexRef(valid.learnerId), { items: [toSummary(valid), ...items] });
      });
      return valid;
    },
    async get(id) {
      const snapshot = await recordRef(id).get();
      if (!snapshot.exists) return undefined;
      const parsed = practiceRecordSchema.safeParse(snapshot.data());
      return parsed.success ? parsed.data : undefined;
    },
    async remove(id) {
      return db().runTransaction(async (tx) => {
        const snapshot = await tx.get(recordRef(id));
        if (!snapshot.exists) return false;
        const learnerId = String(snapshot.data()?.learnerId ?? "");
        const items = await readIndex(learnerId, tx);
        tx.delete(recordRef(id));
        tx.set(indexRef(learnerId), { items: items.filter((s) => s.id !== id) });
        return true;
      });
    },
    async listSummaries(learnerId) {
      return (await readIndex(learnerId)).sort(byNewest);
    },
    async listAll() {
      const snapshot = await collection("practiceRecords").get();
      return snapshot.docs
        .map((doc) => practiceRecordSchema.safeParse(doc.data()))
        .filter((p) => p.success)
        .map((p) => p.data)
        .sort(byNewest);
    },
  };
}
