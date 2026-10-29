// 通用 Repository：一個 JSON 檔案存放一個陣列（每筆資料有 id）。
// 日後轉用資料庫時，只需提供同一個介面的新實作。
import "server-only";
import { z, type ZodType } from "zod";
import { readJsonFile, updateJsonFile } from "./jsonFileStore";

export interface CollectionRepository<T extends { id: string }> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  insert(item: T): Promise<T>;
  /** 找不到時回傳 undefined */
  update(id: string, updater: (item: T) => T): Promise<T | undefined>;
  remove(id: string): Promise<boolean>;
  /** 回傳刪除數量 */
  removeWhere(predicate: (item: T) => boolean): Promise<number>;
}

export interface DocumentRepository<T> {
  read(): Promise<T>;
  update<R = void>(updater: (data: T) => { data: T; result: R }): Promise<R>;
}

export function createJsonCollectionRepository<T extends { id: string }>(
  fileName: string,
  itemSchema: ZodType<T>,
  seed: () => T[] = () => [],
): CollectionRepository<T> {
  const options = { fileName, schema: z.array(itemSchema) as unknown as ZodType<T[]>, seed };

  return {
    list: () => readJsonFile(options),
    async get(id) {
      const items = await readJsonFile(options);
      return items.find((item) => item.id === id);
    },
    insert(item) {
      return updateJsonFile(options, (items) => ({ data: [...items, item], result: item }));
    },
    update(id, updater) {
      return updateJsonFile(options, (items) => {
        const index = items.findIndex((item) => item.id === id);
        if (index === -1) return { data: items, result: undefined };
        const updated = updater(items[index]);
        const next = [...items];
        next[index] = updated;
        return { data: next, result: updated };
      });
    },
    remove(id) {
      return updateJsonFile(options, (items) => {
        const next = items.filter((item) => item.id !== id);
        return { data: next, result: next.length !== items.length };
      });
    },
    removeWhere(predicate) {
      return updateJsonFile(options, (items) => {
        const next = items.filter((item) => !predicate(item));
        return { data: next, result: items.length - next.length };
      });
    },
  };
}

export function createJsonDocumentRepository<T>(
  fileName: string,
  schema: ZodType<T>,
  seed: () => T,
): DocumentRepository<T> {
  const options = { fileName, schema, seed };
  return {
    read: () => readJsonFile(options),
    update: (updater) => updateJsonFile(options, updater),
  };
}
