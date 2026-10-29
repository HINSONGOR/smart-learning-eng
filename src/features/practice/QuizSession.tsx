"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLearner } from "@/components/providers/LearnerProvider";
import { SpeakButton, SpeechNotice } from "@/components/SpeakButton";
import { Button, Card, EmptyState, ErrorMessage, LinkButton, LoadingState, PageHeader, ProgressBar } from "@/components/ui";
import { CATEGORIES, VOCAB_PRACTICE_MODES, type CategoryId, type VocabPracticeMode } from "@/lib/constants";
import { api, withQuery } from "@/lib/apiClient";
import { percent } from "@/lib/text";
import { useApi } from "@/lib/useApi";
import type { PracticeAnswer, PracticeRecord, QuizQuestion, QuizResult } from "@/types";

const FORMAT_TITLE: Record<QuizQuestion["format"], string> = {
  "en-zh": "選出正確的中文解釋",
  "zh-en": "選出正確的英文生字",
  "fill-blank": "選出最適合填入空格的生字",
  "sentence-reading": "選出這句英文的正確中文翻譯",
  definition: "Choose the correct English definition",
};

export function QuizSession() {
  const params = useSearchParams();
  // 網址參數改變（例如由錯題重做開始新一輪）時重新開始
  return <QuizSessionInner key={params.toString()} queryString={params.toString()} />;
}

function QuizSessionInner({ queryString }: { queryString: string }) {
  const params = new URLSearchParams(queryString);
  const { learnerId, ready } = useLearner();
  const mode = (params.get("mode") ?? "en-zh") as VocabPracticeMode;
  const modeInfo = VOCAB_PRACTICE_MODES[mode];
  const category = (params.get("category") ?? "") as CategoryId | "";

  // 學習者確定後只出題一次，避免作答途中題目改變
  const [quizUrl, setQuizUrl] = useState<string | null>(null);
  useEffect(() => {
    if (ready && !quizUrl) {
      const query = Object.fromEntries(new URLSearchParams(queryString).entries());
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuizUrl(withQuery("/api/practice/quiz", { ...query, learnerId }));
    }
  }, [ready, quizUrl, queryString, learnerId]);
  const quiz = useApi<QuizResult>(quizUrl);

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<PracticeAnswer[]>([]);
  const [record, setRecord] = useState<PracticeRecord | null>(null);
  const [saveError, setSaveError] = useState("");
  const savingRef = useRef(false);

  const questions = quiz.data?.questions ?? [];
  const question = questions[index];
  const finished = questions.length > 0 && answers.length === questions.length;

  const title = `${modeInfo?.label ?? "生字練習"}${category && CATEGORIES[category] ? `・${CATEGORIES[category].label}` : ""}${params.get("redoRecordId") ? "（錯題重做）" : ""}`;

  function choose(option: string) {
    if (!question || selected !== null) return;
    setSelected(option);
    setAnswers((list) => [
      ...list,
      {
        questionId: question.id,
        refId: question.vocabId,
        prompt: `${FORMAT_TITLE[question.format]}：${question.prompt}`,
        userAnswer: option,
        correctAnswer: question.answer,
        isCorrect: option === question.answer,
        explanation: question.explanation,
      },
    ]);
  }

  function next() {
    setSelected(null);
    setIndex((i) => i + 1);
  }

  async function save(list: PracticeAnswer[]) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaveError("");
    try {
      const saved = await api<PracticeRecord>("/api/records", {
        method: "POST",
        json: { learnerId, kind: "vocabulary", mode, title, category, answers: list },
      });
      setRecord(saved);
    } catch (e) {
      setSaveError((e as Error).message);
      savingRef.current = false;
    }
  }

  useEffect(() => {
    if (finished && !record && !savingRef.current) void save(answers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  if (!modeInfo) {
    return <EmptyState title="找不到這種練習" action={<LinkButton href="/practice">返回練習中心</LinkButton>} />;
  }

  if (quiz.loading || !quizUrl) return <LoadingState text="出題中…" />;
  if (quiz.error) return <ErrorMessage message={quiz.error} onRetry={quiz.reload} />;

  if (questions.length === 0) {
    return (
      <div>
        <PageHeader title={title} />
        <EmptyState
          title="未能出題"
          description={
            <>
              <p>{quiz.data?.message}</p>
              {category === "ielts" && <p className="mt-2">尚未加入 IELTS 內容，請日後匯入或新增自己的教材。</p>}
            </>
          }
          action={
            <>
              <LinkButton href="/vocabulary/new">新增生字</LinkButton>
              <LinkButton href="/practice" variant="secondary">
                返回練習中心
              </LinkButton>
            </>
          }
        />
      </div>
    );
  }

  if (finished) {
    const correct = answers.filter((a) => a.isCorrect).length;
    const wrong = answers.filter((a) => !a.isCorrect);
    return (
      <div className="space-y-4">
        <PageHeader title="練習完成" subtitle={title} />
        <Card className="text-center">
          <p className="text-4xl font-bold text-teal-700">{percent(correct, answers.length)}%</p>
          <p className="mt-1 text-slate-600">
            答對 {correct} / {answers.length} 題
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {record ? "✓ 已儲存到練習歷史。答錯的生字已加入錯題及待重溫。" : saveError ? "" : "儲存中…"}
          </p>
          <ErrorMessage message={saveError} onRetry={() => save(answers)} />
        </Card>
        {wrong.length > 0 && (
          <Card>
            <h2 className="mb-2 font-semibold text-slate-800">錯題（{wrong.length}）</h2>
            <ul className="space-y-3">
              {wrong.map((a) => (
                <li key={a.questionId} className="rounded-lg bg-rose-50 p-3 text-sm">
                  <p className="font-medium text-slate-800">{a.prompt}</p>
                  <p className="text-rose-700">你的答案：{a.userAnswer}</p>
                  <p className="text-emerald-700">正確答案：{a.correctAnswer}</p>
                  <p className="mt-1 whitespace-pre-line text-slate-600">{a.explanation}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <div className="flex flex-wrap gap-2">
          {record && wrong.length > 0 && (
            <LinkButton href={withQuery("/practice/session", { mode, redoRecordId: record.id })}>
              重做今次錯題
            </LinkButton>
          )}
          <Button variant="secondary" onClick={() => window.location.reload()}>
            再練一次
          </Button>
          <LinkButton href="/practice" variant="secondary">
            返回練習中心
          </LinkButton>
          {record && (
            <Link href={`/history/${record.id}`} className="self-center text-sm text-teal-700 hover:underline">
              查看紀錄
            </Link>
          )}
        </div>
      </div>
    );
  }

  const isCorrect = selected !== null && selected === question.answer;
  const correctSoFar = answers.filter((a) => a.isCorrect).length;

  return (
    <div className="space-y-4">
      <PageHeader title={title} />
      <SpeechNotice />
      <div className="space-y-1">
        <div className="flex justify-between text-sm text-slate-600">
          <span>
            第 {index + 1} / {questions.length} 題
          </span>
          <span>
            答對 {correctSoFar}・答錯 {answers.length - correctSoFar}
          </span>
        </div>
        <ProgressBar value={answers.length} max={questions.length} />
      </div>

      <Card>
        <p className="text-sm text-slate-500">{FORMAT_TITLE[question.format]}</p>
        <div className="mt-3 flex items-start gap-3">
          {question.speakText && <SpeakButton text={question.speakText} />}
          <p
            className={`${question.format === "en-zh" || question.format === "definition" ? "text-2xl font-bold" : "reading-text"} text-slate-900`}
            lang={question.format === "zh-en" ? "zh-Hant" : "en"}
          >
            {question.prompt}
          </p>
        </div>
        {question.hint && <p className="mt-1 text-sm text-slate-500">{question.hint}</p>}

        <div className="mt-4 grid gap-2">
          {question.options.map((option, i) => {
            const state =
              selected === null
                ? "idle"
                : option === question.answer
                  ? "correct"
                  : option === selected
                    ? "wrong"
                    : "dim";
            const styles = {
              idle: "border-slate-300 bg-white hover:border-teal-500 hover:bg-teal-50",
              correct: "border-emerald-500 bg-emerald-50 text-emerald-900",
              wrong: "border-rose-500 bg-rose-50 text-rose-900",
              dim: "border-slate-200 bg-white text-slate-400",
            };
            return (
              <button
                key={option}
                type="button"
                disabled={selected !== null}
                onClick={() => choose(option)}
                className={`flex items-start gap-3 rounded-lg border-2 px-4 py-3 text-left transition-colors ${styles[state]}`}
              >
                <span className="font-semibold">{String.fromCharCode(65 + i)}.</span>
                <span className="flex-1">{option}</span>
                {state === "correct" && <span aria-label="正確">✓</span>}
                {state === "wrong" && <span aria-label="錯誤">✗</span>}
              </button>
            );
          })}
        </div>

        {selected !== null && (
          <div className={`mt-4 rounded-lg p-4 text-sm ${isCorrect ? "bg-emerald-50" : "bg-rose-50"}`} aria-live="polite">
            <p className={`font-semibold ${isCorrect ? "text-emerald-800" : "text-rose-800"}`}>
              {isCorrect ? "✓ 答對了！" : `✗ 答錯了。正確答案：${question.answer}`}
            </p>
            <p className="mt-1 whitespace-pre-line text-slate-700">{question.explanation}</p>
            <Button className="mt-3" onClick={next}>
              {index + 1 < questions.length ? "下一題 →" : "查看結果"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
