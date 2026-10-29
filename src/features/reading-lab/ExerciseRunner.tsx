"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useLearner } from "@/components/providers/LearnerProvider";
import { Badge, Button, Card, EmptyState, ErrorMessage, LinkButton, LoadingState, PageHeader } from "@/components/ui";
import { EXERCISE_TYPES } from "@/lib/constants";
import { api, withQuery } from "@/lib/apiClient";
import { percent } from "@/lib/text";
import { useApi } from "@/lib/useApi";
import type { PracticeRecord, PublicExercise } from "@/types";
import { QuestionArea } from "./QuestionArea";

export function ExerciseRunner() {
  const params = useSearchParams();
  // 重做錯題時網址會加上 redo 參數，改變時重新開始
  return <ExerciseRunnerInner key={params.toString()} redoId={params.get("redo") ?? ""} />;
}

function ExerciseRunnerInner({ redoId }: { redoId: string }) {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { learnerId, ready } = useLearner();
  const exercise = useApi<PublicExercise>(`/api/reading-lab/${id}`);
  const redo = useApi<PracticeRecord>(ready && redoId ? withQuery(`/api/records/${redoId}`, { learnerId }) : null);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<PracticeRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmBlank, setConfirmBlank] = useState(false);

  if (exercise.loading || (redoId && redo.loading)) return <LoadingState />;
  if (exercise.error) {
    return <EmptyState title="未能開啟練習" description={exercise.error} action={<LinkButton href="/reading-lab">返回 Reading Lab</LinkButton>} />;
  }
  if (!exercise.data) return null;
  const ex = exercise.data;

  const onlyIds = redoId && redo.data ? redo.data.answers.filter((a) => a.isCorrect === false).map((a) => a.questionId) : [];
  const visibleIds = new Set(onlyIds.length ? onlyIds : ex.questions.map((q) => q.id));
  const unanswered = [...visibleIds].filter((qid) => !answers[qid]?.trim()).length;

  async function submit() {
    if (unanswered > 0 && !confirmBlank) {
      setConfirmBlank(true);
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const record = await api<PracticeRecord>(`/api/reading-lab/${id}/submit`, {
        method: "POST",
        json: { learnerId, answers, onlyQuestionIds: onlyIds },
      });
      setResult(record);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setSubmitting(false);
      setConfirmBlank(false);
    }
  }

  const resultById = new Map(result?.answers.map((a) => [a.questionId, a]) ?? []);

  return (
    <div className="space-y-4">
      <PageHeader
        title={<span lang="en">{ex.title}</span>}
        subtitle={
          <span className="flex flex-wrap gap-1.5">
            <Badge>{EXERCISE_TYPES[ex.type]}</Badge>
            {ex.ieltsBand && <Badge className="bg-indigo-100 text-indigo-800">Band {ex.ieltsBand}</Badge>}
            {onlyIds.length > 0 && <Badge className="bg-rose-100 text-rose-800">錯題重做：{onlyIds.length} 題</Badge>}
          </span>
        }
      />

      {result && (
        <Card className="text-center">
          <p className="text-4xl font-bold text-teal-700">{percent(result.correct, result.total)}%</p>
          <p className="mt-1 text-slate-600">
            答對 {result.correct} / {result.total} 題・已儲存到練習歷史
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {result.correct < result.total && (
              <LinkButton href={withQuery(`/reading-lab/${id}`, { redo: result.id })}>重做錯題</LinkButton>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                if (redoId) {
                  router.push(`/reading-lab/${id}`);
                  return;
                }
                setAnswers({});
                setResult(null);
                window.scrollTo({ top: 0 });
              }}
            >
              重新練習全份
            </Button>
            <LinkButton href="/reading-lab" variant="secondary">
              返回 Reading Lab
            </LinkButton>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {(ex.passage.title || ex.passage.paragraphs.length > 0) && (
          <Card className="lg:sticky lg:top-16 lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto">
            {ex.passage.title && (
              <h2 className="mb-2 font-semibold text-slate-900" lang="en">
                {ex.passage.title}
              </h2>
            )}
            <div className="reading-text space-y-3 text-slate-800" lang="en">
              {ex.passage.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </Card>
        )}

        <div className="space-y-4">
          {ex.instructions && (
            <Card className="bg-slate-50">
              <p className="whitespace-pre-line text-sm text-slate-700" lang="en">
                {ex.instructions}
              </p>
            </Card>
          )}
          <QuestionArea
            exercise={ex}
            visibleIds={visibleIds}
            answers={answers}
            onChange={(qid, value) => setAnswers((a) => ({ ...a, [qid]: value }))}
            results={resultById}
            locked={Boolean(result)}
          />

          {result ? (
            <Card>
              <h2 className="mb-2 font-semibold text-slate-800">答案及解釋</h2>
              <ul className="space-y-3">
                {result.answers.map((a) => (
                  <li key={a.questionId} className={`rounded-lg p-3 text-sm ${a.isCorrect ? "bg-emerald-50" : "bg-rose-50"}`}>
                    <p className="font-medium text-slate-800">
                      {a.isCorrect ? "✓" : "✗"} {a.prompt}
                    </p>
                    <p className={a.isCorrect ? "text-emerald-800" : "text-rose-700"}>你的答案：{a.userAnswer || "（未作答）"}</p>
                    {!a.isCorrect && <p className="text-emerald-800">正確答案：{a.correctAnswer}</p>}
                    {a.explanation && <p className="mt-1 whitespace-pre-line text-slate-600">{a.explanation}</p>}
                  </li>
                ))}
              </ul>
              <Link href={`/history/${result.id}`} className="mt-3 inline-block text-sm text-teal-700 hover:underline">
                在練習歷史查看
              </Link>
            </Card>
          ) : (
            <div className="space-y-2">
              {confirmBlank && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  還有 {unanswered} 題未作答，未作答會當作答錯。再按一次「提交答案」確認提交。
                </p>
              )}
              <ErrorMessage message={submitError || redo.error} />
              <Button onClick={submit} disabled={submitting} className="w-full sm:w-auto">
                {submitting ? "評分中…" : "提交答案"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
