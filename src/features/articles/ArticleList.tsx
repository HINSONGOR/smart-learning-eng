"use client";

import Link from "next/link";
import { useState } from "react";
import { useLearner } from "@/components/providers/LearnerProvider";
import { Badge, ChipGroup, EmptyState, ErrorMessage, LoadingState, PageHeader, Select, TextInput } from "@/components/ui";
import { CATEGORIES, CATEGORY_LIST } from "@/lib/constants";
import { withQuery } from "@/lib/apiClient";
import { useApi } from "@/lib/useApi";
import type { ArticleView } from "@/types";

type Scope = "all" | "favorites" | "unlearned" | "learned";

export function ArticleList() {
  const { learnerId, ready } = useLearner();
  const { data, error, loading, reload } = useApi<ArticleView[]>(
    ready ? withQuery("/api/articles", { learnerId }) : null,
  );
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [scope, setScope] = useState<Scope>("all");

  const all = data ?? [];
  const q = search.trim().toLowerCase();
  const list = all.filter((a) => {
    if (category && a.category !== category) return false;
    if (scope === "favorites" && !a.progress.isFavorite) return false;
    if (scope === "learned" && !a.progress.isLearned) return false;
    if (scope === "unlearned" && a.progress.isLearned) return false;
    if (q && ![a.title, a.titleZh, a.topic].join(" ").toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <PageHeader title="文章庫 Article Library" subtitle="閱讀文章、逐句播放，點擊生字查看中文解釋並儲存溫習。" />

      {loading && !data ? (
        <LoadingState />
      ) : error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : all.length === 0 ? (
        <EmptyState
          title="尚未加入文章"
          description="尚未加入 IELTS 內容，請日後匯入或新增自己的教材。提供老師筆記後，文章會整理加入這裏。"
        />
      ) : (
        <>
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid gap-2 sm:grid-cols-[1fr_12rem]">
              <TextInput type="search" placeholder="搜尋文章標題或主題…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="搜尋文章" />
              <Select aria-label="分類" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">全部分類</option>
                {CATEGORY_LIST.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <ChipGroup
              label="篩選"
              value={scope}
              onChange={setScope}
              options={[
                { value: "all", label: "全部" },
                { value: "favorites", label: "★ 收藏" },
                { value: "unlearned", label: "未學習" },
                { value: "learned", label: "已學習" },
              ]}
            />
          </div>
          {list.length === 0 ? (
            <EmptyState title="沒有符合條件的文章" />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {list.map((a) => {
                const c = CATEGORIES[a.category];
                const sentenceCount = a.paragraphs.reduce((n, p) => n + p.sentences.length, 0);
                return (
                  <li key={a.id}>
                    <Link href={`/articles/${a.id}`} className="block h-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate-900" lang="en">
                          {a.title}
                        </p>
                        {a.progress.isFavorite && <span className="text-amber-500">★</span>}
                      </div>
                      {a.titleZh && <p className="text-sm text-slate-600">{a.titleZh}</p>}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge className={c.color.badge}>{c.label}</Badge>
                        {a.level && <Badge className="bg-sky-100 text-sky-800">{a.level}</Badge>}
                        {a.ieltsBand && <Badge className="bg-indigo-100 text-indigo-800">Band {a.ieltsBand}</Badge>}
                        {a.progress.isLearned && <Badge className="bg-emerald-100 text-emerald-800">✓ 已學習</Badge>}
                        <Badge>{sentenceCount} 句・{a.glossary.length} 個生字</Badge>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
