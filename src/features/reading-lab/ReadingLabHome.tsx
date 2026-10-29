"use client";

import Link from "next/link";
import { useState } from "react";
import { useLearner } from "@/components/providers/LearnerProvider";
import { Badge, EmptyState, ErrorMessage, LinkButton, LoadingState, PageHeader } from "@/components/ui";
import { EXERCISE_TYPE_IDS, EXERCISE_TYPE_ZH, EXERCISE_TYPES, type ExerciseType } from "@/lib/constants";
import { withQuery } from "@/lib/apiClient";
import { formatDateTime, percent } from "@/lib/text";
import { useApi } from "@/lib/useApi";
import type { ExerciseSummary, TypeAccuracy } from "@/types";

const TYPE_ICON: Record<ExerciseType, string> = {
  "sentence-completion": "✍️",
  "flow-chart": "🔀",
  "diagram-labelling": "🗺️",
  matching: "🔗",
  "multiple-choice": "☑️",
};

export function ReadingLabHome() {
  const { learnerId, ready } = useLearner();
  const { data, error, loading, reload } = useApi<{ exercises: ExerciseSummary[]; accuracy: TypeAccuracy[] }>(
    ready ? withQuery("/api/reading-lab", { learnerId }) : null,
  );
  const [type, setType] = useState<ExerciseType | "">("");

  const exercises = data?.exercises ?? [];
  const list = type ? exercises.filter((e) => e.type === type) : exercises;

  return (
    <div className="space-y-5">
      <PageHeader title="Reading Practice Lab" subtitle="按 IELTS 閱讀題型練習。提交後由系統評分，顯示正確答案及解釋，並儲存成績。" />

      {loading && !data ? (
        <LoadingState />
      ) : error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : (
        <>
          <section aria-label="按題型練習" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {EXERCISE_TYPE_IDS.map((t) => {
              const acc = data?.accuracy.find((a) => a.type === t);
              const count = exercises.filter((e) => e.type === t).length;
              const selected = type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(selected ? "" : t)}
                  aria-pressed={selected}
                  className={`rounded-xl border-2 bg-white p-3 text-left shadow-sm transition-colors ${
                    selected ? "border-teal-600" : "border-slate-200 hover:border-teal-300"
                  }`}
                >
                  <span className="text-xl" aria-hidden>
                    {TYPE_ICON[t]}
                  </span>
                  <p className="mt-1 text-sm font-semibold leading-tight text-slate-900">{EXERCISE_TYPES[t]}</p>
                  <p className="text-xs text-slate-500">{EXERCISE_TYPE_ZH[t]}</p>
                  <p className="mt-2 text-xs text-slate-600">{count} 個練習</p>
                  <p className="text-xs text-slate-600">
                    正確率{" "}
                    <span className="font-semibold text-teal-700">
                      {acc ? `${percent(acc.correct, acc.total)}%` : "—"}
                    </span>
                  </p>
                </button>
              );
            })}
          </section>

          {exercises.length === 0 ? (
            <EmptyState
              title="尚未加入 IELTS 閱讀練習"
              description="尚未加入 IELTS 內容，請日後匯入或新增自己的教材。提供老師筆記後，題目會按五種題型整理加入這裏。"
            />
          ) : list.length === 0 ? (
            <EmptyState title={`未有 ${type ? EXERCISE_TYPES[type] : ""} 練習`} />
          ) : (
            <section>
              <h2 className="mb-3 font-semibold text-slate-800">
                {type ? EXERCISE_TYPES[type] : "全部練習"}（{list.length}）
              </h2>
              <ul className="space-y-3">
                {list.map((e) => (
                  <li key={e.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900" lang="en">
                          {e.title}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Badge>{EXERCISE_TYPES[e.type]}</Badge>
                          <Badge>{e.questionCount} 題</Badge>
                          {e.ieltsBand && <Badge className="bg-indigo-100 text-indigo-800">Band {e.ieltsBand}</Badge>}
                          {e.level && <Badge className="bg-sky-100 text-sky-800">{e.level}</Badge>}
                        </div>
                        {e.lastRecord && (
                          <p className="mt-2 text-sm text-slate-600">
                            上次：{percent(e.lastRecord.correct, e.lastRecord.total)}%（{e.lastRecord.correct}/{e.lastRecord.total}）・
                            {formatDateTime(e.lastRecord.date)}・
                            <Link href={`/history/${e.lastRecord.id}`} className="text-teal-700 hover:underline">
                              查看詳情
                            </Link>
                          </p>
                        )}
                      </div>
                      <LinkButton href={`/reading-lab/${e.id}`}>{e.lastRecord ? "再做一次" : "開始練習"}</LinkButton>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
