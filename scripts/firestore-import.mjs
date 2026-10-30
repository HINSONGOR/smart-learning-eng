// 把本機 data/ 資料夾或備份檔匯入 Firebase Firestore（搬移資料或從備份還原）。
//
// 用法：
//   node scripts/firestore-import.mjs                     匯入本機 data/ 資料夾
//   node scripts/firestore-import.mjs 備份檔.json          從「下載全部資料備份」的檔案還原
//   加上 --force 才會覆蓋雲端已有的資料
//
// 金鑰從 .env.local 的 FIREBASE_SERVICE_ACCOUNT_PATH 或 FIREBASE_SERVICE_ACCOUNT 讀取。
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const NAMES = ["vocabulary", "articles", "reading-exercises", "learning-resources", "settings", "learner-progress"];

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const args = process.argv.slice(2);
const force = args.includes("--force");
const source = args.find((a) => !a.startsWith("--"));

function loadCredentials() {
  const raw =
    process.env.FIREBASE_SERVICE_ACCOUNT?.trim() ||
    (process.env.FIREBASE_SERVICE_ACCOUNT_PATH ? readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8") : "");
  if (!raw) throw new Error("請在 .env.local 設定 FIREBASE_SERVICE_ACCOUNT_PATH");
  const json = JSON.parse(raw);
  return { projectId: json.project_id, clientEmail: json.client_email, privateKey: json.private_key };
}

function loadSource() {
  if (source) {
    const backup = JSON.parse(readFileSync(source, "utf8"));
    if (backup.format !== "smart-english-backup-v1") throw new Error("這不是 Smart English 備份檔");
    return backup.data;
  }
  const dir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
  const data = {};
  for (const name of [...NAMES, "practice-records"]) {
    const file = path.join(dir, `${name}.json`);
    if (existsSync(file)) data[name] = JSON.parse(readFileSync(file, "utf8"));
  }
  return data;
}

const db = getFirestore(initializeApp({ credential: cert(loadCredentials()) }));
db.settings({ ignoreUndefinedProperties: true });

const existing = await db.collection("appData").limit(1).get();
if (!existing.empty && !force) {
  console.error("雲端已有資料。如確定要覆蓋，請加上 --force。（建議先在系統「設定」頁下載備份）");
  process.exit(1);
}

const data = loadSource();
let count = 0;
for (const name of NAMES) {
  if (data[name] === undefined) continue;
  await db.collection("appData").doc(name).set({ value: data[name] });
  console.log(`✓ ${name}`);
  count++;
}

const records = data["practice-records"] ?? [];
if (records.length > 0) {
  const indexes = {};
  for (const record of records) {
    await db.collection("practiceRecords").doc(record.id).set(record);
    const summary = { ...record };
    delete summary.answers;
    (indexes[record.learnerId] ??= []).push(summary);
  }
  for (const [learnerId, items] of Object.entries(indexes)) {
    items.sort((a, b) => b.date.localeCompare(a.date));
    await db.collection("recordIndex").doc(learnerId).set({ items });
  }
  console.log(`✓ practice-records（${records.length} 筆）`);
}
console.log(`完成：匯入 ${count} 份資料${records.length ? ` 及 ${records.length} 筆練習紀錄` : ""}。`);
