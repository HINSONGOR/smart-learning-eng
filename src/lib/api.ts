// Route Handler 共用工具：統一錯誤處理及回應格式。
import "server-only";
import { connection } from "next/server";
import { DataFileError, NotFoundError, ValidationError } from "./errors";

export async function handle(fn: () => Promise<unknown>, successStatus = 200): Promise<Response> {
  try {
    // 確保每次請求都即時讀取 JSON，不會在建置時被預先產生
    await connection();
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
