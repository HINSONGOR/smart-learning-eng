"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useLearner } from "@/components/providers/LearnerProvider";
import { SpeakButton } from "@/components/SpeakButton";
import { Button, DownloadButton, EmptyState, ErrorMessage, LinkButton, LoadingState, PageHeader } from "@/components/ui";
import { api, withQuery } from "@/lib/apiClient";
import { useApi } from "@/lib/useApi";
import type { VocabProgress, VocabularyView } from "@/types";
import { useVocabularyFlags } from "./useVocabularyFlags";
import { VocabularyBadges } from "./VocabularyBadges";
import { EMPTY_FILTER, VocabularyFilters, type VocabularyFilterState } from "./VocabularyFilters";

export function VocabularyList() {
  const params = useSearchParams();
  const { learnerId, ready } = useLearner();
  const [filter, setFilter] = useState<VocabularyFilterState>({
    ...EMPTY_FILTER,
    category: params.get("category") ?? "",
    topic: params.get("topic") ?? "",
  });
  const deferredFilter = useDeferredValue(filter);
  const { data, error, loading, reload, setData } = useApi<VocabularyView[]>(
    ready ? withQuery("/api/vocabulary", { learnerId, ...deferredFilter }) : null,
  );
  const topics = useApi<string[]>("/api/vocabulary/topics");
  const flags = useVocabularyFlags(learnerId);
  const [toDelete, setToDelete] = useState<VocabularyView | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  async function toggle(item: VocabularyView, key: keyof Pick<VocabProgress, "isFavorite" | "needsReview" | "isMastered">) {
    const progress = await flags.setFlags(item.id, { [key]: !item.progress[key] });
    if (progress) {
      setData((list) => list?.map((v) => (v.id === item.id ? { ...v, progress } : v)) ?? null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api(`/api/vocabulary/${toDelete.id}`, { method: "DELETE" });
      setToDelete(null);
      reload();
      topics.reload();
    } catch (e) {
      setActionError((e as Error).message);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const list = data ?? [];
  const isFiltered = JSON.stringify(filter) !== JSON.stringify(EMPTY_FILTER);

  return (
    <div className="space-y-4">
      <PageHeader
        title="生字庫 Vocabulary"
        subtitle="新增、修改、搜尋及管理所有生字。收藏、待重溫及已掌握按學習者分開記錄。"
        actions={
          <>
            <LinkButton href={withQuery("/vocabulary/new", { category: filter.category })}>＋ 新增生字</LinkButton>
            <LinkButton href="/vocabulary/cards" variant="secondary">
              單字卡
            </LinkButton>
            {ready && (
              <DownloadButton
                href={withQuery("/api/export/vocabulary", { learnerId, ...filter })}
                title="按目前的篩選條件匯出 Word 檔"
              >
                匯出 Word
              </DownloadButton>
            )}
          </>
        }
      />

      <VocabularyFilters value={filter} onChange={setFilter} topics={topics.data ?? []} />
      <ErrorMessage message={error || flags.error || actionError} onRetry={error ? reload : undefined} />

      {loading && !data ? (
        <LoadingState />
      ) : list.length === 0 ? (
        <EmptyState
          title={isFiltered ? "沒有符合條件的生字" : "生字庫是空的"}
          description={
            filter.category === "ielts"
              ? "尚未加入 IELTS 內容，請日後匯入或新增自己的教材。"
              : isFiltered
                ? "試試清除部分篩選條件。"
                : "按「新增生字」加入第一個生字。"
          }
          action={
            isFiltered ? (
              <Button variant="secondary" onClick={() => setFilter(EMPTY_FILTER)}>
                清除篩選
              </Button>
            ) : (
              <LinkButton href="/vocabulary/new">新增生字</LinkButton>
            )
          }
        />
      ) : (
        <>
          <p className="text-sm text-slate-500">共 {list.length} 個生字</p>
          <ul className="space-y-3">
            {list.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <SpeakButton text={item.word} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <p className="text-lg font-semibold text-slate-900">{item.word}</p>
                      <p className="text-slate-700">{item.meaningZh}</p>
                    </div>
                    {item.definitionEn && <p className="text-sm text-slate-500">{item.definitionEn}</p>}
                    <div className="mt-1.5 flex items-start gap-2">
                      <SpeakButton text={item.exampleEn} size="sm" label="播放例句" />
                      <div className="text-sm">
                        <p className="text-slate-800">{item.exampleEn}</p>
                        {item.exampleZh && <p className="text-slate-500">{item.exampleZh}</p>}
                      </div>
                    </div>
                    <div className="mt-2">
                      <VocabularyBadges item={item} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      答對 {item.progress.correctCount} 次・答錯 {item.progress.wrongCount} 次
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <ToggleButton active={item.progress.isFavorite} onClick={() => toggle(item, "isFavorite")} on="★ 已收藏" off="☆ 收藏" />
                  <ToggleButton active={item.progress.needsReview} onClick={() => toggle(item, "needsReview")} on="✓ 待重溫" off="標記待重溫" />
                  <ToggleButton active={item.progress.isMastered} onClick={() => toggle(item, "isMastered")} on="✓ 已掌握" off="標記已掌握" />
                  <span className="flex-1" />
                  <Link href={`/vocabulary/${item.id}/edit`} className="rounded-lg px-3 py-1 text-sm text-slate-700 hover:bg-slate-100">
                    修改
                  </Link>
                  <button
                    type="button"
                    onClick={() => setToDelete(item)}
                    className="rounded-lg px-3 py-1 text-sm text-rose-700 hover:bg-rose-50"
                  >
                    刪除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="刪除生字？"
        message={
          <>
            確定要刪除「<strong>{toDelete?.word}</strong>」嗎？兩位學習者的相關學習進度亦會一併刪除，刪除後無法還原。
          </>
        }
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

function ToggleButton({ active, onClick, on, off }: { active: boolean; onClick: () => void; on: string; off: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
        active ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-300 text-slate-600 hover:bg-slate-50"
      }`}
    >
      {active ? on : off}
    </button>
  );
}
