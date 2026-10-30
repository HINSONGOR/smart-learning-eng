// 瀏覽器端呼叫 API 的小工具。所有資料讀寫都經伺服器處理。

export const UNAUTHORIZED_EVENT = "sle-unauthorized";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  let response: Response;
  try {
    response = await fetch(url, {
      ...rest,
      headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      cache: "no-store",
    });
  } catch {
    throw new ApiError("無法連接系統伺服器。請確認程式仍在運行。", 0);
  }
  const data = await response.json().catch(() => null);
  if (response.status === 401 && typeof window !== "undefined") {
    // 雲端版登入過期：通知 LearnerProvider 顯示登入畫面
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  if (!response.ok) {
    throw new ApiError(
      (data as { error?: string } | null)?.error ?? `發生錯誤（${response.status}）`,
      response.status,
      (data as { fieldErrors?: Record<string, string> } | null)?.fieldErrors ?? {},
    );
  }
  return data as T;
}

/** 組合查詢字串，略過空值 */
export function withQuery(path: string, params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === false) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
