"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useLearner } from "@/components/providers/LearnerProvider";
import { Button, Card, EmptyState, ErrorMessage, LinkButton, LoadingState, PageHeader } from "@/components/ui";
import { CATEGORIES } from "@/lib/constants";
import { api, withQuery } from "@/lib/apiClient";
import { modeLabel } from "@/lib/labels";
import { formatDateTime, percent } from "@/lib/text";
import { useApi } from "@/lib/useApi";
import type { PracticeRecord } from "@/types";

/** 重新練習及重做錯題的連結 */
function redoLinks(r: PracticeRecord): { again: string; wrong: string | null } {
  const hasWrong = r.answers.some((a) => a.isCorrect === false);
  switch (r.kind) {
    case "reading-lab":
      return {
        again: `/reading-lab/${r.exerciseId}`,
        wrong: hasWrong ? withQuery(`/reading-lab/${r.exerciseId}`, { redo: r.id }) : null,
      };
    case "dictation":
      return { again: "/dictation", wrong: hasWrong ? withQuery("/dictation", { redo: r.id }) : null };
    case "shadowing":
      return { again: "/shadowing", wrong: null };
    default: {
      const mode = r.mode === "flashcards" ? "en-zh" : r.mode;
      return {
        again: r.mode === "flashcards" ? "/vocabulary/cards" : withQuery("/practice/session", { mode, category: r.category }),
        wrong: hasWrong ? withQuery("/practice/session", { mode: mode === "review" ? "en-zh" : mode, redoRecordId: r.id }) : null,
      };
    }
  }
}

export function HistoryDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { learnerId, ready } = useLearner();
  const { data: record, error, loading } = useApi<PracticeRecord>(ready ? withQuery(`/api/records/${id}`, { learnerId }) : null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function remove() {
    setDeleting(true);
    try {
      await api(withQuery(`/api/records/${id}`, { learnerId }), { method: "DELETE" });
      router.push("/history");
    } catch (e) {
      setDeleteError((e as Error).message);
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error || !record) {
    return <EmptyState title="找不到這次紀錄" description={error || "可能屬於另一位學習者，或已被刪除。"} action={<LinkButton href="/history">返回練習歷史</LinkButton>} />;
  }

  const links = redoLinks(record);

  return (
    <div className="space-y-4">
      <PageHeader
        title={record.title}
        subtitle={`${modeLabel(record.kind, record.mode)}・${formatDateTime(record.date)}${record.category ? `・${CATEGORIES[record.category].label}` : ""}`}
      />
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {record.scored ? (
            <>
              <p className="text-3xl font-bold text-teal-700">{percent(record.correct, record.total) ?? 0}%</p>
              <p className="text-sm text-slate-600">
                答對 {record.correct} / {record.total} 題
              </p>
            </>
          ) : (
            <p className="text-lg font-semibold text-slate-800">跟讀 {record.total} 句（不計分）</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {links.wrong && <LinkButton href={links.wrong}>重做錯題</LinkButton>}
          <LinkButton href={links.again} variant="secondary">
            重新練習
          </LinkButton>
          <Button variant="ghost" className="text-rose-700" onClick={() => setConfirming(true)}>
            刪除紀錄
          </Button>
        </div>
      </Card>
      <ErrorMessage message={deleteError} />

      <Card>
        <h2 className="mb-3 font-semibold text-slate-800">詳細答案</h2>
        <ol className="space-y-3">
          {record.answers.map((a, i) => (
            <li
              key={`${a.questionId}-${i}`}
              className={`rounded-lg p-3 text-sm ${a.isCorrect === null ? "bg-slate-50" : a.isCorrect ? "bg-emerald-50" : "bg-rose-50"}`}
            >
              <p className="font-medium text-slate-800">
                {a.isCorrect === null ? "•" : a.isCorrect ? "✓" : "✗"} {a.prompt}
              </p>
              {a.userAnswer && <p className={a.isCorrect === false ? "text-rose-700" : "text-slate-700"}>你的答案：{a.userAnswer}</p>}
              {a.isCorrect === false && a.correctAnswer && <p className="text-emerald-800">正確答案：{a.correctAnswer}</p>}
              {a.explanation && <p className="mt-1 whitespace-pre-line text-slate-600">{a.explanation}</p>}
            </li>
          ))}
        </ol>
      </Card>

      <ConfirmDialog
        open={confirming}
        title="刪除這次練習紀錄？"
        message="刪除後無法還原。生字的答對及答錯次數不會改變。"
        busy={deleting}
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
