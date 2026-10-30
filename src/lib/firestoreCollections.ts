// Firestore 集合名稱。FIRESTORE_COLLECTION_PREFIX 只在測試時使用，令測試資料與正式資料分開。
import "server-only";
import { db } from "./firebaseAdmin";

export function collection(name: "appData" | "practiceRecords" | "recordIndex" | "images") {
  return db().collection(`${process.env.FIRESTORE_COLLECTION_PREFIX ?? ""}${name}`);
}
