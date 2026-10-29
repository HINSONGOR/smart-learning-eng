import type { ZodType } from "zod";
import { ValidationError } from "./errors";

/** 驗證輸入；失敗時拋出包含各欄位中文訊息的 ValidationError */
export function parseInput<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  const first = Object.values(fieldErrors)[0] ?? "輸入資料不正確";
  throw new ValidationError(first, fieldErrors);
}
