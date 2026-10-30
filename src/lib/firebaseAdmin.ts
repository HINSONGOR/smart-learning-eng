// Firebase Admin SDK（只在伺服器使用）。金鑰來源：
// - 本機：.env.local 的 FIREBASE_SERVICE_ACCOUNT_PATH（金鑰檔路徑，檔案放在專案資料夾以外）
// - Vercel：環境變數 FIREBASE_SERVICE_ACCOUNT（貼上金鑰檔的完整內容）
import "server-only";
import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function loadServiceAccount(): ServiceAccount {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  const raw = inline || (path ? readFileSync(path, "utf8") : "");
  if (!raw) {
    throw new Error("未設定 Firebase 金鑰：請設定 FIREBASE_SERVICE_ACCOUNT 或 FIREBASE_SERVICE_ACCOUNT_PATH");
  }
  const json = JSON.parse(raw) as { project_id: string; client_email: string; private_key: string };
  return { projectId: json.project_id, clientEmail: json.client_email, privateKey: json.private_key };
}

function app(): App {
  return getApps()[0] ?? initializeApp({ credential: cert(loadServiceAccount()) });
}

let firestore: Firestore | null = null;

export function db(): Firestore {
  if (!firestore) {
    firestore = getFirestore(app());
    // Zod 的選填欄位可能是 undefined，Firestore 預設不接受
    firestore.settings({ ignoreUndefinedProperties: true });
  }
  return firestore;
}

export function adminAuth() {
  return getAuth(app());
}
