// 本機 JSON 檔案的底層讀寫。只在伺服器端使用。
//
// 安全措施：
// 1. 檔案不存在時用初始資料建立。
// 2. 讀取時檢查 JSON 格式及資料結構；損壞時拋出錯誤，絕不自動覆蓋原檔。
// 3. 寫入時先寫暫存檔再改名，避免寫到一半令檔案損壞；舊版本保留為 .bak。
// 4. 同一檔案的「讀取 → 修改 → 寫入」排隊執行，避免兩位學習者同時操作時互相覆蓋。
import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ZodType } from "zod";
import { DataFileError } from "@/lib/errors";

export function getDataDir(): string {
  // turbopackIgnore：資料夾在執行時才讀取，不需要在建置時追蹤整個專案
  return process.env.DATA_DIR ?? path.join(/* turbopackIgnore: true */ process.cwd(), "data");
}

function filePath(fileName: string): string {
  return path.join(getDataDir(), fileName);
}

export interface JsonFileOptions<T> {
  fileName: string;
  schema: ZodType<T>;
  /** 首次啟動時使用的初始資料 */
  seed: () => T;
}

async function fileExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

/** Windows 上如果檔案正被讀取，改名可能暫時失敗（EPERM/EBUSY），稍等後重試 */
async function renameWithRetry(from: string, to: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.rename(from, to);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      const retryable = code === "EPERM" || code === "EACCES" || code === "EBUSY";
      if (!retryable || attempt >= 10) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20 * (attempt + 1)));
    }
  }
}

async function writeAtomic(fileName: string, data: unknown): Promise<void> {
  const target = filePath(fileName);
  const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
  const content = `${JSON.stringify(data, null, 2)}\n`;
  try {
    await fs.mkdir(getDataDir(), { recursive: true });
    await fs.writeFile(temp, content, "utf8");
    if (await fileExists(target)) {
      await fs.copyFile(target, `${target}.bak`);
    }
    await renameWithRetry(temp, target);
  } catch (error) {
    await fs.rm(temp, { force: true }).catch(() => undefined);
    throw new DataFileError(
      `無法寫入資料檔 ${fileName}：${(error as Error).message}`,
      fileName,
    );
  }
}

const seeding = new Map<string, Promise<void>>();

/** 檔案不存在時建立初始資料；同時多個請求只會建立一次 */
async function ensureSeeded<T>({ fileName, schema, seed }: JsonFileOptions<T>): Promise<void> {
  const key = filePath(fileName);
  let pending = seeding.get(key);
  if (!pending) {
    pending = (async () => {
      if (!(await fileExists(key))) await writeAtomic(fileName, schema.parse(seed()));
    })().finally(() => seeding.delete(key));
    seeding.set(key, pending);
  }
  await pending;
}

export async function readJsonFile<T>(options: JsonFileOptions<T>): Promise<T> {
  const { fileName, schema } = options;
  const target = filePath(fileName);
  let text: string;
  try {
    text = await fs.readFile(target, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      await ensureSeeded(options);
      return readJsonFile(options);
    }
    throw new DataFileError(`無法讀取資料檔 ${fileName}：${(error as Error).message}`, fileName);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new DataFileError(
      `資料檔 ${fileName} 格式損壞，無法解析。請從備份或同資料夾的 ${fileName}.bak 還原。`,
      fileName,
    );
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new DataFileError(
      `資料檔 ${fileName} 內容不符合格式（位置：${issue.path.join(".") || "根層"}；${issue.message}）。請修正或從備份還原。`,
      fileName,
    );
  }
  return parsed.data;
}

const locks = new Map<string, Promise<unknown>>();

/** 在檔案鎖內讀取、修改並寫回。updater 回傳的新資料會先經過 schema 驗證才寫入。 */
export async function updateJsonFile<T, R = void>(
  options: JsonFileOptions<T>,
  updater: (data: T) => { data: T; result: R } | Promise<{ data: T; result: R }>,
): Promise<R> {
  const key = filePath(options.fileName);
  const previous = locks.get(key) ?? Promise.resolve();
  const run = previous
    .catch(() => undefined)
    .then(async () => {
      const current = await readJsonFile(options);
      const { data, result } = await updater(current);
      const validated = options.schema.parse(data);
      await writeAtomic(options.fileName, validated);
      return result;
    });
  locks.set(key, run);
  try {
    return await run;
  } finally {
    if (locks.get(key) === run) locks.delete(key);
  }
}
