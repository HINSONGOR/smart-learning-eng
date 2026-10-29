"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge, ChipGroup, EmptyState, ErrorMessage, LinkButton, LoadingState, Notice, PageHeader, Select, TextInput } from "@/components/ui";
import { CATEGORIES, CATEGORY_LIST, RESOURCE_TYPES, type ResourceType } from "@/lib/constants";
import { api, withQuery } from "@/lib/apiClient";
import { useApi } from "@/lib/useApi";
import type { LearningResource } from "@/types";

export function ResourceList() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [favorites, setFavorites] = useState<"all" | "favorites">("all");
  const deferredSearch = useDeferredValue(search);
  const { data, error, loading, reload, setData } = useApi<LearningResource[]>(
    withQuery("/api/resources", { search: deferredSearch, category, resourceType, favorites: favorites === "favorites" ? "1" : "" }),
  );
  const [toDelete, setToDelete] = useState<LearningResource | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  async function toggleFavorite(item: LearningResource) {
    try {
      const updated = await api<LearningResource>(`/api/resources/${item.id}`, {
        method: "PATCH",
        json: { isFavorite: !item.isFavorite },
      });
      setData((list) => list?.map((r) => (r.id === item.id ? updated : r)) ?? null);
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api(`/api/resources/${toDelete.id}`, { method: "DELETE" });
      setToDelete(null);
      reload();
    } catch (e) {
      setActionError((e as Error).message);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const list = data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="資源庫 Authentic English Library"
        subtitle="收藏 YouTube、BBC 等英文學習網址及個人筆記。"
        actions={<LinkButton href="/resources/new">＋ 新增資源</LinkButton>}
      />
      <Notice tone="info">這裏只儲存網址及你的筆記，不會下載影片或複製網站內容。按「開啟」會在新分頁開啟原網站。</Notice>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <TextInput type="search" placeholder="搜尋標題、主題、筆記…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="搜尋資源" />
        <div className="grid grid-cols-2 gap-2">
          <Select aria-label="分類" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">全部分類</option>
            {CATEGORY_LIST.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select aria-label="資源類型" value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
            <option value="">全部類型</option>
            {Object.entries(RESOURCE_TYPES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <ChipGroup label="收藏" value={favorites} onChange={setFavorites} options={[{ value: "all", label: "全部" }, { value: "favorites", label: "★ 收藏" }]} />
      </div>

      <ErrorMessage message={error || actionError} onRetry={error ? reload : undefined} />

      {loading && !data ? (
        <LoadingState />
      ) : list.length === 0 ? (
        <EmptyState title="沒有資源" description="按「新增資源」加入 YouTube 或 BBC 網址。" action={<LinkButton href="/resources/new">新增資源</LinkButton>} />
      ) : (
        <ul className="space-y-3">
          {list.map((r) => {
            const c = CATEGORIES[r.category];
            return (
              <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{r.title}</p>
                    <p className="truncate text-xs text-slate-500">{r.url}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge className={c.color.badge}>{c.label}</Badge>
                      <Badge>{RESOURCE_TYPES[r.resourceType as ResourceType]}</Badge>
                      <Badge>{r.topic}</Badge>
                      {r.isDemo && <Badge className="bg-amber-100 text-amber-800">示範資料</Badge>}
                    </div>
                    {r.notes && <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{r.notes}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleFavorite(r)}
                    aria-pressed={r.isFavorite}
                    aria-label={r.isFavorite ? "取消收藏" : "收藏"}
                    className="text-2xl text-amber-500"
                  >
                    {r.isFavorite ? "★" : "☆"}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
                  >
                    開啟 ↗
                  </a>
                  <span className="flex-1" />
                  <Link href={`/resources/${r.id}/edit`} className="rounded-lg px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
                    修改
                  </Link>
                  <button type="button" onClick={() => setToDelete(r)} className="rounded-lg px-3 py-1.5 text-sm text-rose-700 hover:bg-rose-50">
                    刪除
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="刪除資源？"
        message={<>確定要刪除「<strong>{toDelete?.title}</strong>」嗎？刪除後無法還原。</>}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
