// 雲端版登入：揀名字 + 6 位數字 PIN。
// - 背後使用 Firebase Authentication（電郵／密碼），電郵只存放在伺服器環境變數，不會傳到瀏覽器。
// - 登入成功後發出 httpOnly session cookie（14 日有效），瀏覽器 JavaScript 無法讀取。
// - AUTH_MODE 不是 firebase 時（本機版），不需要登入。
import "server-only";
import { cookies } from "next/headers";
import { adminAuth } from "./firebaseAdmin";
import { UnauthorizedError, ValidationError } from "./errors";

export const SESSION_COOKIE = "sle_session";
const SESSION_DAYS = 14;

export function isAuthEnabled(): boolean {
  return process.env.AUTH_MODE === "firebase";
}

/** LEARNER_ACCOUNTS 格式：me=電郵1,son=電郵2 */
export function learnerAccounts(): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of (process.env.LEARNER_ACCOUNTS ?? "").split(",")) {
    const [learnerId, email] = pair.split("=").map((s) => s?.trim());
    if (learnerId && email) map.set(learnerId, email.toLowerCase());
  }
  return map;
}

function learnerIdForEmail(email: string | undefined): string | null {
  if (!email) return null;
  for (const [learnerId, mapped] of learnerAccounts()) {
    if (mapped === email.toLowerCase()) return learnerId;
  }
  return null;
}

/** 目前登入的學習者；未登入或 cookie 無效時回傳 null */
export async function getSessionLearnerId(): Promise<string | null> {
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(cookie);
    return learnerIdForEmail(decoded.email);
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<string> {
  const learnerId = await getSessionLearnerId();
  if (!learnerId) throw new UnauthorizedError();
  return learnerId;
}

const SIGN_IN_ERRORS: Record<string, string> = {
  INVALID_LOGIN_CREDENTIALS: "PIN 不正確",
  INVALID_PASSWORD: "PIN 不正確",
  EMAIL_NOT_FOUND: "PIN 不正確",
  USER_DISABLED: "這個帳戶已被停用",
  TOO_MANY_ATTEMPTS_TRY_LATER: "錯誤次數太多，請稍後再試",
};

/** 驗證 PIN，成功時回傳 session cookie 值 */
export async function signIn(learnerId: string, pin: string): Promise<{ cookie: string; maxAge: number }> {
  const email = learnerAccounts().get(learnerId);
  if (!email) throw new ValidationError("找不到這位學習者的帳戶設定");
  if (!/^\d{6,12}$/.test(pin)) throw new ValidationError("請輸入 6 位數字 PIN");

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("未設定 NEXT_PUBLIC_FIREBASE_API_KEY");
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pin, returnSecureToken: true }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  const body = (await response.json().catch(() => null)) as { idToken?: string; error?: { message?: string } } | null;
  if (!response.ok || !body?.idToken) {
    const code = body?.error?.message?.split(" ")[0] ?? "";
    // 稍作延遲，減慢猜 PIN 的速度
    await new Promise((resolve) => setTimeout(resolve, 600));
    throw new ValidationError(SIGN_IN_ERRORS[code] ?? "登入失敗，請稍後再試");
  }
  const expiresIn = SESSION_DAYS * 24 * 60 * 60 * 1000;
  const cookie = await adminAuth().createSessionCookie(body.idToken, { expiresIn });
  return { cookie, maxAge: expiresIn / 1000 };
}
