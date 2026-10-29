"use client";

// 聽寫及跟讀共用：選擇句子來源及數量，然後開始練習。
import { useState } from "react";
import { Button, Card, EmptyState, ErrorMessage, Field, LoadingState, Select } from "@/components/ui";
import { CATEGORY_LIST } from "@/lib/constants";
import { withQuery } from "@/lib/apiClient";
import { shuffle } from "@/lib/text";
import { useApi } from "@/lib/useApi";
import type { PracticeSentence } from "@/types";

export function SentenceSetup({
  articleId,
  onStart,
}: {
  articleId: string;
  onStart: (sentences: PracticeSentence[]) => void;
}) {
  const [source, setSource] = useState(articleId ? "articles" : "all");
  const [category, setCategory] = useState("");
  const [count, setCount] = useState("5");
  const { data, error, loading, reload } = useApi<PracticeSentence[]>(
    withQuery("/api/sentences", { source, category, articleId }),
  );

  if (loading && !data) return <LoadingState />;
  const sentences = data ?? [];

  return (
    <Card className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {!articleId && (
          <>
            <Field label="句子來源">
              <Select value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="all">生字例句及文章</option>
                <option value="vocabulary">只用生字例句</option>
                <option value="articles">只用文章句子</option>
              </Select>
            </Field>
            <Field label="分類">
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">全部</option>
                {CATEGORY_LIST.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}
        <Field label="句數">
          <Select value={count} onChange={(e) => setCount(e.target.value)}>
            {["3", "5", "10", "20"].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </Select>
        </Field>
      </div>
      <ErrorMessage message={error} onRetry={reload} />
      {sentences.length === 0 ? (
        <EmptyState
          title="沒有可用的句子"
          description={
            category === "ielts" || source === "articles"
              ? "尚未加入 IELTS 內容，請日後匯入或新增自己的教材。"
              : "句子來自生字例句及文章。請先在生字庫加入生字。"
          }
        />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => onStart(shuffle(sentences).slice(0, Number(count)))}>開始練習</Button>
          <span className="text-sm text-slate-500">共有 {sentences.length} 句可用</span>
        </div>
      )}
    </Card>
  );
}
