"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useLearner } from "@/components/providers/LearnerProvider";
import { SpeakButton, SpeechNotice } from "@/components/SpeakButton";
import { Button, EmptyState, ErrorMessage, LinkButton, LoadingState, Notice, PageHeader, ProgressBar } from "@/components/ui";
import { PART_OF_SPEECH_ZH } from "@/lib/constants";
import { api, withQuery } from "@/lib/apiClient";
import { useApi } from "@/lib/useApi";
import type { PracticeAnswer, VocabularyView } from "@/types";
import { useVocabularyFlags } from "./useVocabularyFlags";
import { VocabularyBadges } from "./VocabularyBadges";
import { EMPTY_FILTER, VocabularyFilters, type VocabularyFilterState } from "./VocabularyFilters";

type Assessment = "remember" | "forgot";

export function Flashcards() {
  const params = useSearchParams();
  const { learnerId, ready } = useLearner();
  const [filter, setFilter] = useState<VocabularyFilterState>({
    ...EMPTY_FILTER,
    category: params.get("category") ?? "",
  });
  const { data, error, loading, reload, setData } = useApi<VocabularyView[]>(
    ready ? withQuery("/api/vocabulary", { learnerId, ...filter }) : null,
  );
  const topics = useApi<string[]>("/api/vocabulary/topics");
  const flags = useVocabularyFlags(learnerId);

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<Record<string, Assessment>>({});
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [saveError, setSaveError] = useState("");

  const cards = useMemo(() => data ?? [], [data]);
  const current = cards[Math.min(index, Math.max(cards.length - 1, 0))];
  const answered = Object.keys(results).length;
  const rememberCount = Object.values(results).filter((r) => r === "remember").length;

  function changeFilter(next: VocabularyFilterState) {
    setFilter(next);
    setIndex(0);
    setRevealed(false);
    setResults({});
    setSaveState("idle");
  }

  function go(delta: number) {
    setIndex((i) => Math.min(Math.max(i + delta, 0), cards.length - 1));
    setRevealed(false);
  }

  function assess(value: Assessment) {
    if (!current) return;
    setResults((r) => ({ ...r, [current.id]: value }));
    setSaveState("idle");
    if (index < cards.length - 1) go(1);
  }

  async function toggleFlag(key: "isFavorite" | "isMastered") {
    if (!current) return;
    const progress = await flags.setFlags(current.id, { [key]: !current.progress[key] });
    if (progress) setData((list) => list?.map((v) => (v.id === current.id ? { ...v, progress } : v)) ?? null);
  }

  async function saveSession() {
    const answers: PracticeAnswer[] = cards
      .filter((c) => results[c.id])
      .map((c) => ({
        questionId: c.id,
        refId: c.id,
        prompt: c.word,
        userAnswer: results[c.id] === "remember" ? "記得" : "未記得",
        correctAnswer: c.meaningZh,
        isCorrect: results[c.id] === "remember",
        explanation: c.exampleEn,
      }));
    if (answers.length === 0) return;
    setSaveState("saving");
    setSaveError("");
    try {
      await api("/api/records", {
        method: "POST",
        json: { learnerId, kind: "vocabulary", mode: "flashcards", title: "單字卡溫習", category: filter.category, answers },
      });
      setSaveState("saved");
      setResults({});
      reload();
    } catch (e) {
      setSaveError((e as Error).message);
      setSaveState("idle");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="單字卡 Flashcards" subtitle="先自己回想意思，再按「顯示答案」。按「記得／未記得」記錄結果，完成後儲存。" />
      <SpeechNotice />
      <VocabularyFilters value={filter} onChange={changeFilter} topics={topics.data ?? []} showSearch={false} />
      <ErrorMessage message={error || flags.error || saveError} onRetry={error ? reload : undefined} />
      {saveState === "saved" && <Notice tone="success">已儲存這次溫習結果。未記得的生字已加入待重溫。</Notice>}

      {loading && !data ? (
        <LoadingState />
      ) : !current ? (
        <EmptyState
          title="沒有符合條件的生字"
          description={
            filter.category === "ielts"
              ? "尚未加入 IELTS 內容，請日後匯入或新增自己的教材。"
              : "請調整篩選條件，或先到生字庫新增生字。"
          }
          action={<LinkButton href="/vocabulary/new">新增生字</LinkButton>}
        />
      ) : (
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-slate-600">
              <span>
                第 {index + 1} / {cards.length} 張
              </span>
              <span>
                <span className="text-emerald-700">記得 {rememberCount}</span>・
                <span className="text-rose-700">未記得 {answered - rememberCount}</span>
              </span>
            </div>
            <ProgressBar value={index + 1} max={cards.length} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-md">
            <div className="flex items-center justify-center gap-3">
              <SpeakButton text={current.word} />
              <p className="text-3xl font-bold text-slate-900" lang="en">
                {current.word}
              </p>
              <button
                type="button"
                onClick={() => toggleFlag("isFavorite")}
                aria-pressed={current.progress.isFavorite}
                aria-label={current.progress.isFavorite ? "取消收藏" : "收藏"}
                className="text-2xl text-amber-500"
              >
                {current.progress.isFavorite ? "★" : "☆"}
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {current.partOfSpeech}（{PART_OF_SPEECH_ZH[current.partOfSpeech] ?? current.partOfSpeech}）
              {current.ieltsBand && `・Band ${current.ieltsBand}`}
              {current.level && `・${current.level}`}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              累計答對 {current.progress.correctCount} 次・答錯 {current.progress.wrongCount} 次
              {results[current.id] && `・今次：${results[current.id] === "remember" ? "記得" : "未記得"}`}
            </p>

            {revealed ? (
              <div className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-left">
                <p className="text-xl font-semibold text-slate-900">{current.meaningZh}</p>
                {current.definitionEn && (
                  <p className="text-slate-600" lang="en">
                    {current.definitionEn}
                  </p>
                )}
                <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3">
                  <SpeakButton text={current.exampleEn} size="sm" label="播放例句" />
                  <div>
                    <p className="text-slate-800" lang="en">
                      {current.exampleEn}
                    </p>
                    {current.exampleZh && <p className="text-sm text-slate-500">{current.exampleZh}</p>}
                  </div>
                </div>
                <VocabularyBadges item={current} />
              </div>
            ) : (
              <Button className="mt-5" variant="secondary" onClick={() => setRevealed(true)}>
                顯示答案
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" className="border-rose-300 text-rose-700" onClick={() => assess("forgot")}>
              ✗ 未記得
            </Button>
            <Button variant="secondary" className="border-emerald-300 text-emerald-700" onClick={() => assess("remember")}>
              ✓ 記得
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => go(-1)} disabled={index === 0}>
                ← 上一個
              </Button>
              <Button variant="ghost" onClick={() => go(1)} disabled={index >= cards.length - 1}>
                下一個 →
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => toggleFlag("isMastered")}>
                {current.progress.isMastered ? "✓ 已掌握" : "標記已掌握"}
              </Button>
              <Button onClick={saveSession} disabled={answered === 0 || saveState === "saving"}>
                {saveState === "saving" ? "儲存中…" : `儲存結果（${answered}）`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
