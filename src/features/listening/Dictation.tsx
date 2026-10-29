"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLearner } from "@/components/providers/LearnerProvider";
import { speechUnavailableReason, useSpeech } from "@/components/providers/SpeechProvider";
import { SpeechNotice } from "@/components/SpeakButton";
import { Button, Card, ErrorMessage, LinkButton, LoadingState, PageHeader, ProgressBar, TextArea } from "@/components/ui";
import { api, withQuery } from "@/lib/apiClient";
import { compareDictation, type DictationComparison } from "@/lib/dictation";
import { percent } from "@/lib/text";
import { useApi } from "@/lib/useApi";
import type { PracticeAnswer, PracticeRecord, PracticeSentence } from "@/types";
import { SentenceSetup } from "./SentenceSetup";

export function Dictation() {
  const params = useSearchParams();
  return <DictationInner key={params.toString()} articleId={params.get("articleId") ?? ""} redoId={params.get("redo") ?? ""} />;
}

function DictationInner({ articleId, redoId }: { articleId: string; redoId: string }) {
  const router = useRouter();
  const { learnerId, ready } = useLearner();
  const speech = useSpeech();
  const speechReason = speechUnavailableReason(speech);
  const redo = useApi<PracticeRecord>(ready && redoId ? withQuery(`/api/records/${redoId}`, { learnerId }) : null);

  const [sentences, setSentences] = useState<PracticeSentence[] | null>(null);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [comparison, setComparison] = useState<DictationComparison | null>(null);
  const [answers, setAnswers] = useState<PracticeAnswer[]>([]);
  const [record, setRecord] = useState<PracticeRecord | null>(null);
  const [saveError, setSaveError] = useState("");

  // 重做錯題：使用紀錄中答錯的句子
  useEffect(() => {
    if (redo.data && !sentences) {
      const wrong = redo.data.answers
        .filter((a) => a.isCorrect === false)
        .map((a, i) => ({ key: `redo:${i}`, en: a.correctAnswer, zh: a.explanation, sourceLabel: "錯題重做", category: "daily" as const }));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSentences(wrong);
    }
  }, [redo.data, sentences]);

  const stop = speech.stop;
  useEffect(() => () => stop(), [stop]);

  const current = sentences?.[index];
  const finished = sentences !== null && sentences.length > 0 && answers.length === sentences.length;

  function play() {
    if (current) speech.speak(current.en, `dictation:${index}`);
  }

  function check() {
    if (!current || !typed.trim()) return;
    const result = compareDictation(current.en, typed);
    setComparison(result);
    const nextAnswers = [
      ...answers,
      {
        questionId: `${index}`,
        refId: current.en,
        prompt: `聽寫第 ${index + 1} 句（${current.sourceLabel}）`,
        userAnswer: typed.trim(),
        correctAnswer: current.en,
        isCorrect: result.isPerfect,
        explanation: current.zh,
      },
    ];
    setAnswers(nextAnswers);
    if (nextAnswers.length === sentences?.length) void save(nextAnswers);
  }

  function next() {
    setIndex((i) => i + 1);
    setTyped("");
    setComparison(null);
  }

  async function save(list: PracticeAnswer[]) {
    setSaveError("");
    try {
      const saved = await api<PracticeRecord>("/api/records", {
        method: "POST",
        json: { learnerId, kind: "dictation", mode: "dictation", title: redoId ? "聽寫（錯題重做）" : "聽寫練習", answers: list },
      });
      setRecord(saved);
    } catch (e) {
      setSaveError((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="聽寫 Dictation" subtitle="聽句子，把聽到的英文打出來。系統會逐字對比，忽略大小寫及標點。" />
      <SpeechNotice />

      {redoId && redo.loading ? (
        <LoadingState />
      ) : sentences === null ? (
        <SentenceSetup articleId={articleId} onStart={setSentences} />
      ) : sentences.length === 0 ? (
        <Card>
          <p className="text-slate-600">沒有需要重做的句子。</p>
          <LinkButton href="/dictation" className="mt-3">
            開始新練習
          </LinkButton>
        </Card>
      ) : finished && comparison === null ? null : (
        <>
          <div className="space-y-1">
            <p className="text-sm text-slate-600">
              第 {Math.min(index + 1, sentences.length)} / {sentences.length} 句
            </p>
            <ProgressBar value={answers.length} max={sentences.length} />
          </div>

          {current && (
            <Card className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={play} disabled={Boolean(speechReason)}>
                  {speech.activeKey === `dictation:${index}` && speech.status !== "idle" ? "播放中…" : "▶ 播放句子"}
                </Button>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  語速
                  <input
                    type="range"
                    min={0.5}
                    max={1.5}
                    step={0.1}
                    value={speech.rate}
                    onChange={(e) => speech.setRate(Number(e.target.value))}
                    className="w-24 accent-teal-600"
                    aria-label="語速"
                  />
                  {speech.rate.toFixed(1)}x
                </label>
                <span className="text-xs text-slate-500">可以重複播放</span>
              </div>
              <TextArea
                rows={3}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                disabled={comparison !== null}
                placeholder="在這裏打出你聽到的句子…"
                lang="en"
                spellCheck={false}
                autoComplete="off"
                aria-label="聽寫答案"
              />
              {comparison === null ? (
                <Button onClick={check} disabled={!typed.trim()}>
                  檢查答案
                </Button>
              ) : (
                <div className="space-y-3" aria-live="polite">
                  <div className={`rounded-lg p-4 ${comparison.isPerfect ? "bg-emerald-50" : "bg-amber-50"}`}>
                    <p className="font-semibold">
                      {comparison.isPerfect ? "✓ 完全正確！" : `正確率 ${comparison.accuracy}%（${comparison.correctCount}/${comparison.totalCount} 個字）`}
                    </p>
                    <p className="mt-2 text-lg leading-relaxed" lang="en">
                      {comparison.words.map((w, i) => (
                        <span key={i} className={w.status === "correct" ? "text-emerald-700" : "rounded bg-rose-100 px-0.5 text-rose-700 underline"}>
                          {w.word}{" "}
                        </span>
                      ))}
                    </p>
                    {comparison.extraWords.length > 0 && (
                      <p className="mt-1 text-sm text-slate-600">多打或打錯的字：{comparison.extraWords.join("、")}</p>
                    )}
                    {current.zh && <p className="mt-2 text-sm text-slate-600">中文：{current.zh}</p>}
                    <p className="mt-1 text-xs text-slate-500">紅色底線＝漏聽或拼錯的字</p>
                  </div>
                  {index + 1 < sentences.length ? (
                    <Button onClick={next}>下一句 →</Button>
                  ) : (
                    <Button onClick={() => setComparison(null)}>查看結果</Button>
                  )}
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {finished && comparison === null && sentences && (
        <Card className="space-y-3 text-center">
          <p className="text-4xl font-bold text-teal-700">
            {percent(answers.filter((a) => a.isCorrect).length, answers.length)}%
          </p>
          <p className="text-slate-600">
            完全正確 {answers.filter((a) => a.isCorrect).length} / {answers.length} 句
          </p>
          <p className="text-sm text-slate-500">{record ? "✓ 已儲存到練習歷史" : saveError ? "" : "儲存中…"}</p>
          <ErrorMessage message={saveError} onRetry={() => save(answers)} />
          <div className="flex flex-wrap justify-center gap-2">
            {record && answers.some((a) => !a.isCorrect) && (
              <LinkButton href={withQuery("/dictation", { redo: record.id })}>重做錯句</LinkButton>
            )}
            <Button
              variant="secondary"
              onClick={() => {
                if (redoId || articleId) {
                  router.push("/dictation");
                  return;
                }
                setSentences(null);
                setIndex(0);
                setTyped("");
                setComparison(null);
                setAnswers([]);
                setRecord(null);
              }}
            >
              新一輪練習
            </Button>
            {record && (
              <Link href={`/history/${record.id}`} className="self-center text-sm text-teal-700 hover:underline">
                查看紀錄
              </Link>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
