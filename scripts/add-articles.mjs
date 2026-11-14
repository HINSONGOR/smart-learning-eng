// 把整理好的文章加入雲端（Firestore）或本機 data/articles.json。
// 同一個 id 的文章會被更新，其他文章保持不變。
//
// 用法：node scripts/add-articles.mjs content/某文章.json
// （設定從 .env.local 讀取；DATA_BACKEND=firestore 時寫入雲端，否則寫入本機）
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const file = process.argv[2];
if (!file) {
  console.error("用法：node scripts/add-articles.mjs 文章檔.json");
  process.exit(1);
}
const incoming = [JSON.parse(readFileSync(file, "utf8"))].flat();

// 基本檢查（完整格式檢查由系統讀取時進行）
for (const a of incoming) {
  const problems = [];
  if (!a.id) problems.push("id");
  if (!a.title) problems.push("title");
  if (!["ielts", "daily", "workplace"].includes(a.category)) problems.push("category");
  if (!a.createdAt) problems.push("createdAt");
  if (!Array.isArray(a.paragraphs) || a.paragraphs.length === 0) problems.push("paragraphs");
  for (const p of a.paragraphs ?? []) {
    if (!Array.isArray(p.sentences) || p.sentences.length === 0 || p.sentences.some((s) => !s.en)) {
      problems.push("paragraphs.sentences");
      break;
    }
  }
  for (const g of a.glossary ?? []) if (!g.word || !g.meaningZh) problems.push(`glossary(${g.word ?? "?"})`);
  if (problems.length) {
    console.error(`文章「${a.title ?? a.id}」欠缺或錯誤：${problems.join("、")}`);
    process.exit(1);
  }
}

function merge(existing) {
  const ids = new Set(incoming.map((a) => a.id));
  return [...existing.filter((a) => !ids.has(a.id)), ...incoming];
}

if (process.env.DATA_BACKEND === "firestore") {
  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT?.trim() || readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8");
  const json = JSON.parse(raw);
  const db = getFirestore(
    initializeApp({ credential: cert({ projectId: json.project_id, clientEmail: json.client_email, privateKey: json.private_key }) }),
  );
  db.settings({ ignoreUndefinedProperties: true });
  const ref = db.collection(`${process.env.FIRESTORE_COLLECTION_PREFIX ?? ""}appData`).doc("articles");
  const total = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const next = merge(snap.exists ? (snap.data().value ?? []) : []);
    tx.set(ref, { value: next });
    return next.length;
  });
  console.log(`✓ 已寫入雲端：${incoming.map((a) => a.title).join("、")}（文章總數 ${total}）`);
} else {
  const target = path.join(process.env.DATA_DIR ?? path.join(process.cwd(), "data"), "articles.json");
  const next = merge(existsSync(target) ? JSON.parse(readFileSync(target, "utf8")) : []);
  writeFileSync(target, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`✓ 已寫入本機：${target}（文章總數 ${next.length}）`);
}
