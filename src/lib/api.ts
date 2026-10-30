// Route Handler 共用工具：統一錯誤處理、登入檢查及回應格式。
import "server-only";
import { connection } from "next/server";
import { isAuthEnabled, requireSession } from "./auth";
import { DataFileError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "./errors";

function errorResponse(error: unknown): Response {
  if (error instanceof ValidationError) {
    return Response.json({ error: error.message, fieldErrors: error.fieldErrors }, { status: 400 });
  }
  if (error instanceof UnauthorizedError) {
    return Response.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return Response.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof NotFoundError) {
    return Response.json({ error: error.message }, { status: 404 });
  }
  console.error(error);
  if (error instanceof DataFileError) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ error: "伺服器發生錯誤，請稍後再試" }, { status: 500 });
}

/** 雲端版需要登入；登入及查詢登入狀態的 API 設為 public */
async function guard(options: { public?: boolean }) {
  if (!options.public && isAuthEnabled()) await requireSession();
}

export async function handle(
  fn: () => Promise<unknown>,
  successStatus = 200,
  options: { public?: boolean } = {},
): Promise<Response> {
  // 確保每次請求都即時讀取資料，不會在建置時被預先產生。
  // 必須放在 try 之外：建置時 Next.js 會用它中止預先產生，不可被下面的錯誤處理攔截。
  await connection();
  try {
    await guard(options);
    const data = await fn();
    return Response.json(data ?? { ok: true }, { status: successStatus });
  } catch (error) {
    return errorResponse(error);
  }
}

/** 回傳可下載的檔案（Word、備份等） */
export async function handleFile(
  fn: () => Promise<{ buffer: Buffer | Uint8Array; filename: string; contentType: string }>,
): Promise<Response> {
  await connection();
  try {
    await guard({});
    const { buffer, filename, contentType } = await fn();
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        // 中文檔名需要用 RFC 5987 格式編碼
        "Content-Disposition": `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export const DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** 回傳 Word 檔 */
export function handleDocx(fn: () => Promise<{ buffer: Buffer; filename: string }>): Promise<Response> {
  return handleFile(async () => ({ ...(await fn()), contentType: DOCX_TYPE }));
}

export async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ValidationError("請求資料格式不正確");
  }
}

export function queryObject(request: Request): Record<string, string> {
  return Object.fromEntries(new URL(request.url).searchParams.entries());
}

export function learnerIdFrom(request: Request): string {
  return new URL(request.url).searchParams.get("learnerId") ?? "";
}

/** 經 HTTPS 連線時才設定 secure cookie（本機及 Wi-Fi 的 http 連線仍可登入） */
export function isHttps(request: Request): boolean {
  return new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
}
