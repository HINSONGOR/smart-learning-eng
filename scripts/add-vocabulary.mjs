// 把整理好的生字加入雲端（Firestore）或本機 data/vocabulary.json。
// - 同一個 id 會被更新
// - 同一分類已有相同英文生字（不同 id）時會略過，避免重複
//
// 用法：node scripts/add-vocabulary.mjs content/某生字表.json
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const file = process.argv[2];
if (!file) {
  console.error("用法：node scripts/add-vocabulary.mjs 生字檔.json");
  process.exit(1);
}
const incoming = [JSON.parse(readFileSync(file, "utf8"))].flat();

const REQUIRED = ["id", "word", "partOfSpeech", "meaningZh", "category", "topic", "createdAt", "updatedAt"];
for (const v of incoming) {
  const missing = REQUIRED.filter((key) => !String(v[key] ?? "").trim());
  if (missing.length || !["ielts", "daily", "workplace"].includes(v.category)) {
    console.error(`生字「${v.word ?? v.id}」欠缺或錯誤：${missing.join("、") || "category"}`);
    process.exit(1);
  }
}

const norm = (w) => w.toLowerCase().replace(/\s+/g, " ").trim();
function merge(existing) {
  const byId = new Map(existing.map((v) => [v.id, v]));
  const keys = new Set(existing.map((v) => `${v.category}|${norm(v.word)}`));
  let added = 0;
  let updated = 0;
  let skipped = 0;
  for (const v of incoming) {
    if (byId.has(v.id)) {
      byId.set(v.id, v);
      updated++;
    } else if (keys.has(`${v.category}|${norm(v.word)}`)) {
      skipped++;
    } else {
      byId.set(v.id, v);
      keys.add(`${v.category}|${norm(v.word)}`);
      added++;
    }
  }
  return { next: [...byId.values()], added, updated, skipped };
}

let result;
if (process.env.DATA_BACKEND === "firestore") {
  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT?.trim() || readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8");
  const json = JSON.parse(raw);
  const db = getFirestore(
    initializeApp({ credential: cert({ projectId: json.project_id, clientEmail: json.client_email, privateKey: json.private_key }) }),
  );
  const ref = db.collection(`${process.env.FIRESTORE_COLLECTION_PREFIX ?? ""}appData`).doc("vocabulary");
  result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("雲端尚未建立生字庫，請先開啟網站一次");
    const merged = merge(snap.data().value ?? []);
    tx.set(ref, { value: merged.next });
    return merged;
  });
  console.log("寫入雲端");
} else {
  const target = path.join(process.env.DATA_DIR ?? path.join(process.cwd(), "data"), "vocabulary.json");
  result = merge(existsSync(target) ? JSON.parse(readFileSync(target, "utf8")) : []);
  writeFileSync(target, `${JSON.stringify(result.next, null, 2)}\n`);
  console.log(`寫入本機：${target}`);
}
console.log(`✓ 新增 ${result.added}、更新 ${result.updated}、略過重複 ${result.skipped}；生字庫共 ${result.next.length} 個`);
