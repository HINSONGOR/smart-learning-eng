"use client";

import Link from "next/link";
import { useState } from "react";
import { useLearner } from "@/components/providers/LearnerProvider";
import { Badge, ChipGroup, EmptyState, ErrorMessage, LinkButton, LoadingState, PageHeader } from "@/components/ui";
import { PRACTICE_KINDS, type PracticeKind } from "@/lib/constants";
import { withQuery } from "@/lib/apiClient";
import { modeLabel } from "@/lib/labels";
import { formatDateTime, percent } from "@/lib/text";
import { useApi } from "@/lib/useApi";
import type { PracticeRecord } from "@/types";

export function HistoryList() {
  const { learnerId, learner, ready } = useLearner();
  const [kind, setKind] = useState<PracticeKind | "">("");
  const { data, error, loading, reload } = useApi<PracticeRecord[]>(
    ready ? withQuery("/api/records", { learnerId, kind }) : null,
  );
  const records = data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="練習歷史 Practice History" subtitle={learner ? `${learner.name}的所有練習紀錄` : undefined} />
      <ChipGroup
        label="練習類型"
        value={kind}
        onChange={setKind}
        options={[{ value: "", label: "全部" }, ...Object.entries(PRACTICE_KINDS).map(([value, label]) => ({ value: value as PracticeKind, label }))]}
      />
      {loading && !data ? (
        <LoadingState />
      ) : error ? (
        <ErrorMessage message={error} onRetry={reload} />
      ) : records.length === 0 ? (
        <EmptyState title="還沒有練習紀錄" description="完成任何練習後，成績會自動儲存在這裏。" action={<LinkButton href="/practice">開始練習</LinkButton>} />
      ) : (
        <>
          {/* 桌面：表格 */}
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-2 font-medium">練習名稱</th>
                  <th className="px-4 py-2 font-medium">題型</th>
                  <th className="px-4 py-2 font-medium">完成日期</th>
                  <th className="px-4 py-2 text-right font-medium">題數</th>
                  <th className="px-4 py-2 text-right font-medium">正確</th>
                  <th className="px-4 py-2 text-right font-medium">正確率</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-900">{r.title}</td>
                    <td className="px-4 py-2.5 text-slate-600">{modeLabel(r.kind, r.mode)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatDateTime(r.date)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.total}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.scored ? r.correct : "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-teal-700">
                      {r.scored ? `${percent(r.correct, r.total) ?? 0}%` : "不計分"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link href={`/history/${r.id}`} className="text-teal-700 hover:underline">
                        詳細答案
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* 手機：卡片 */}
          <ul className="space-y-2 md:hidden">
            {records.map((r) => (
              <li key={r.id}>
                <Link href={`/history/${r.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-slate-900">{r.title}</p>
                    <Badge className="bg-teal-50 text-teal-800">{r.scored ? `${percent(r.correct, r.total) ?? 0}%` : "不計分"}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {modeLabel(r.kind, r.mode)}・{formatDateTime(r.date)}
                  </p>
                  <p className="text-xs text-slate-500">{r.scored ? `答對 ${r.correct} / ${r.total} 題` : `${r.total} 句`}</p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
