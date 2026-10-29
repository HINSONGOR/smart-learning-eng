// Route Handler 共用工具：統一錯誤處理及回應格式。
import "server-only";
import { connection } from "next/server";
import { DataFileError, NotFoundError, ValidationError } from "./errors";

export async function handle(fn: () => Promise<unknown>, successStatus = 200): Promise<Response> {
  // 確保每次請求都即時讀取 JSON，不會在建置時被預先產生。
  // 必須放在 try 之外：建置時 Next.js 會用它中止預先產生，不可被下面的錯誤處理攔截。
  await connection();
  try {
    const data = await fn();
    return Response.json(data ?? { ok: true }, { status: successStatus });
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json({ error: error.message, fieldErrors: error.fieldErrors }, { status: 400 });
    }
    if (error instanceof NotFoundError) {
      return Response.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof DataFileError) {
      console.error(error);
      return Response.json({ error: error.message }, { status: 500 });
    }
    console.error(error);
    return Response.json({ error: "伺服器發生錯誤，請稍後再試" }, { status: 500 });
  }
}

/** 回傳可下載的 Word 檔；錯誤時沿用 handle 的 JSON 錯誤格式 */
export async function handleDocx(fn: () => Promise<{ buffer: Buffer; filename: string }>): Promise<Response> {
  await connection();
  try {
    const { buffer, filename } = await fn();
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        // 中文檔名需要用 RFC 5987 格式編碼
        "Content-Disposition": `attachment; filename="export.docx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handle(async () => {
      throw error;
    });
  }
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
