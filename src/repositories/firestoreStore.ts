// 以 Firestore 實作 DocumentStore。
// 每份資料（例如全部生字）存成一份文件 appData/{名稱}，格式為 { value: ... }：
// - 讀取一次就取得全部資料，節省免費額度（每日 5 萬次讀取）
// - 修改使用 transaction，兩位學習者同時操作也不會互相覆蓋
// 單一文件上限 1 MiB；練習紀錄會不斷增加，所以另外分開存放（見 recordRepository）。
import "server-only";
import type { ZodType } from "zod";
import { DataFileError } from "@/lib/errors";
import { db } from "@/lib/firebaseAdmin";
import { collection } from "@/lib/firestoreCollections";
import type { DocumentStore } from "./collectionRepository";

export function createFirestoreStore<T>(docId: string, schema: ZodType<T>, seed: () => T): DocumentStore<T> {
  const ref = () => collection("appData").doc(docId);

  function parse(raw: unknown): T {
    const parsed = schema.safeParse((raw as { value?: unknown } | undefined)?.value);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new DataFileError(
        `雲端資料 ${docId} 內容不符合格式（位置：${issue.path.join(".") || "根層"}；${issue.message}）`,
        docId,
      );
    }
    return parsed.data;
  }

  return {
    async read() {
      const snapshot = await ref().get();
      if (!snapshot.exists) {
        // 首次使用：建立初始資料（transaction 確保只建立一次）
        return db().runTransaction(async (tx) => {
          const again = await tx.get(ref());
          if (again.exists) return parse(again.data());
          const initial = schema.parse(seed());
          tx.set(ref(), { value: initial });
          return initial;
        });
      }
      return parse(snapshot.data());
    },
    async update(updater) {
      return db().runTransaction(async (tx) => {
        const snapshot = await tx.get(ref());
        const current = snapshot.exists ? parse(snapshot.data()) : schema.parse(seed());
        const { data, result } = await updater(current);
        tx.set(ref(), { value: schema.parse(data) });
        return result;
      });
    },
  };
}
