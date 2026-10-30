// 通用 Repository。資料實際存放在哪裏（本機 JSON 或 Firestore）由 DocumentStore 決定，
// 上層 Service 不需要知道分別。
import "server-only";

/** 一份完整資料（例如全部生字）的讀取及「讀取 → 修改 → 寫回」 */
export interface DocumentStore<T> {
  read(): Promise<T>;
  update<R = void>(updater: (data: T) => { data: T; result: R } | Promise<{ data: T; result: R }>): Promise<R>;
}

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

export type DocumentRepository<T> = DocumentStore<T>;

export function createCollectionRepository<T extends { id: string }>(
  store: DocumentStore<T[]>,
): CollectionRepository<T> {
  return {
    list: () => store.read(),
    async get(id) {
      const items = await store.read();
      return items.find((item) => item.id === id);
    },
    insert(item) {
      return store.update((items) => ({ data: [...items, item], result: item }));
    },
    update(id, updater) {
      return store.update((items) => {
        const index = items.findIndex((item) => item.id === id);
        if (index === -1) return { data: items, result: undefined };
        const updated = updater(items[index]);
        const next = [...items];
        next[index] = updated;
        return { data: next, result: updated };
      });
    },
    remove(id) {
      return store.update((items) => {
        const next = items.filter((item) => item.id !== id);
        return { data: next, result: next.length !== items.length };
      });
    },
    removeWhere(predicate) {
      return store.update((items) => {
        const next = items.filter((item) => !predicate(item));
        return { data: next, result: items.length - next.length };
      });
    },
  };
}
