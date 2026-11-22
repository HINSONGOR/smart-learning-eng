// 把整理好的 Reading Lab 題目加入雲端（Firestore）或本機 data/reading-exercises.json。
// 同一個 id 的題目會被更新，其他題目保持不變。
//
// 用法：node scripts/add-exercises.mjs content/某題目.json
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const file = process.argv[2];
if (!file) {
  console.error("用法：node scripts/add-exercises.mjs 題目檔.json");
  process.exit(1);
}
const incoming = [JSON.parse(readFileSync(file, "utf8"))].flat();

const TYPES = ["sentence-completion", "flow-chart", "diagram-labelling", "matching", "multiple-choice"];
for (const e of incoming) {
  const problems = [];
  if (!e.id || !e.title || !e.createdAt) problems.push("id／title／createdAt");
  if (!TYPES.includes(e.type)) problems.push("type");
  if (!Array.isArray(e.questions) || e.questions.length === 0) problems.push("questions");
  for (const q of e.questions ?? []) {
    if (!q.id || !q.prompt || !q.answers?.length) problems.push(`題目 ${q.number ?? "?"}`);
    if (e.type === "multiple-choice" && !q.options?.some((o) => q.answers.includes(o.key))) problems.push(`題目 ${q.number} 的答案不在選項內`);
  }
  if (problems.length) {
    console.error(`「${e.title ?? e.id}」欠缺或錯誤：${problems.join("、")}`);
    process.exit(1);
  }
}

const merge = (existing) => {
  const ids = new Set(incoming.map((e) => e.id));
  return [...existing.filter((e) => !ids.has(e.id)), ...incoming];
};

if (process.env.DATA_BACKEND === "firestore") {
  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT?.trim() || readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8");
  const json = JSON.parse(raw);
  const db = getFirestore(
    initializeApp({ credential: cert({ projectId: json.project_id, clientEmail: json.client_email, privateKey: json.private_key }) }),
  );
  db.settings({ ignoreUndefinedProperties: true });
  const ref = db.collection(`${process.env.FIRESTORE_COLLECTION_PREFIX ?? ""}appData`).doc("reading-exercises");
  const total = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const next = merge(snap.exists ? (snap.data().value ?? []) : []);
    tx.set(ref, { value: next });
    return next.length;
  });
  console.log(`✓ 已寫入雲端：${incoming.map((e) => e.title).join("、")}（題目總數 ${total} 份）`);
} else {
  const target = path.join(process.env.DATA_DIR ?? path.join(process.cwd(), "data"), "reading-exercises.json");
  const next = merge(existsSync(target) ? JSON.parse(readFileSync(target, "utf8")) : []);
  writeFileSync(target, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`✓ 已寫入本機：${target}（題目總數 ${next.length} 份）`);
}
