"use client";

// 五種題型的作答介面。答案由伺服器評分，這裏只負責收集輸入及顯示結果。
import { Fragment } from "react";
import { Card } from "@/components/ui";
import type { PracticeAnswer, PublicExercise } from "@/types";

type Question = PublicExercise["questions"][number];

interface Props {
  exercise: PublicExercise;
  visibleIds: Set<string>;
  answers: Record<string, string>;
  onChange: (questionId: string, value: string) => void;
  results: Map<string, PracticeAnswer>;
  locked: boolean;
}

function resultClass(result: PracticeAnswer | undefined): string {
  if (!result) return "border-slate-300 focus:border-teal-600";
  return result.isCorrect ? "border-emerald-500 bg-emerald-50" : "border-rose-500 bg-rose-50";
}

function BlankInput({ question, props, width = "w-36" }: { question: Question; props: Props; width?: string }) {
  const result = props.results.get(question.id);
  return (
    <input
      type="text"
      value={props.answers[question.id] ?? ""}
      onChange={(e) => props.onChange(question.id, e.target.value)}
      disabled={props.locked}
      aria-label={`第 ${question.number} 題答案`}
      autoComplete="off"
      spellCheck={false}
      lang="en"
      className={`mx-1 inline-block ${width} max-w-full rounded-md border-2 px-2 py-0.5 align-baseline text-base focus:outline-none ${resultClass(result)}`}
      placeholder={String(question.number)}
    />
  );
}

/** 把含 ___ 的文字換成輸入框；沒有空格標記時把輸入框放在最後 */
function TextWithBlank({ text, question, props }: { text: string; question: Question; props: Props }) {
  const parts = text.split(/_{3,}/);
  if (parts.length === 1) {
    return (
      <>
        {text} <BlankInput question={question} props={props} />
      </>
    );
  }
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < parts.length - 1 && i === 0 && <BlankInput question={question} props={props} />}
          {i < parts.length - 1 && i > 0 && "_____"}
        </Fragment>
      ))}
    </>
  );
}

function SentenceCompletion(props: Props) {
  const questions = props.exercise.questions.filter((q) => props.visibleIds.has(q.id));
  return (
    <Card>
      <ol className="space-y-4" lang="en">
        {questions.map((q) => (
          <li key={q.id} className="leading-loose text-slate-800">
            <span className="mr-2 font-semibold">{q.number}.</span>
            <TextWithBlank text={q.prompt} question={q} props={props} />
          </li>
        ))}
      </ol>
    </Card>
  );
}

function FlowChart(props: Props) {
  const { exercise } = props;
  const byId = new Map(exercise.questions.map((q) => [q.id, q]));
  if (exercise.flowSteps.length === 0) return <SentenceCompletion {...props} />;
  return (
    <Card>
      <ol className="flex flex-col items-stretch" lang="en">
        {exercise.flowSteps.map((step, i) => {
          const question = step.questionId ? byId.get(step.questionId) : undefined;
          const hidden = question && !props.visibleIds.has(question.id);
          return (
            <li key={i} className="flex flex-col items-center">
              <div
                className={`w-full rounded-lg border-2 px-4 py-3 text-center leading-loose ${
                  question && !hidden ? "border-teal-300 bg-teal-50/40" : "border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {question && !hidden ? (
                  <>
                    <span className="mr-1 font-semibold">({question.number})</span>
                    <TextWithBlank text={step.text} question={question} props={props} />
                  </>
                ) : (
                  step.text
                )}
              </div>
              {i < exercise.flowSteps.length - 1 && (
                <span className="py-1 text-xl text-slate-400" aria-hidden>
                  ↓
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function DiagramLabelling(props: Props) {
  const { exercise } = props;
  const questions = exercise.questions.filter((q) => props.visibleIds.has(q.id));
  const diagram = exercise.diagram;
  const numberOf = (questionId: string) => exercise.questions.find((q) => q.id === questionId)?.number;
  return (
    <Card className="space-y-4">
      {diagram?.image ? (
        <div className="relative mx-auto w-full max-w-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/images/${encodeURIComponent(diagram.image)}`} alt="題目示意圖" className="w-full rounded-lg border border-slate-200" />
          {diagram.labels.map((label) => (
            <span
              key={label.questionId}
              className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white shadow"
              style={{ left: `${label.x}%`, top: `${label.y}%` }}
            >
              {numberOf(label.questionId)}
            </span>
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">這份練習沒有附圖。請按題目描述作答。</p>
      )}
      <ol className="space-y-3" lang="en">
        {questions.map((q) => (
          <li key={q.id} className="flex flex-wrap items-center gap-2 text-slate-800">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">{q.number}</span>
            <TextWithBlank text={q.prompt} question={q} props={props} />
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Matching(props: Props) {
  const { exercise } = props;
  const questions = exercise.questions.filter((q) => props.visibleIds.has(q.id));
  return (
    <Card className="space-y-4">
      <div className="rounded-lg bg-slate-50 p-3">
        <p className="mb-1 text-sm font-medium text-slate-600">選項</p>
        <ul className="space-y-1 text-slate-800" lang="en">
          {exercise.matchingOptions.map((o) => (
            <li key={o.key}>
              <span className="mr-2 font-semibold">{o.key}</span>
              {o.text}
            </li>
          ))}
        </ul>
      </div>
      <ol className="space-y-3" lang="en">
        {questions.map((q) => {
          const result = props.results.get(q.id);
          return (
            <li key={q.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-slate-800">
                <span className="mr-2 font-semibold">{q.number}.</span>
                {q.prompt}
              </span>
              <select
                value={props.answers[q.id] ?? ""}
                onChange={(e) => props.onChange(q.id, e.target.value)}
                disabled={props.locked}
                aria-label={`第 ${q.number} 題配對`}
                className={`w-full rounded-md border-2 bg-white px-2 py-1.5 sm:w-28 ${resultClass(result)}`}
              >
                <option value="">選擇</option>
                {exercise.matchingOptions.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.key}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

function MultipleChoice(props: Props) {
  const questions = props.exercise.questions.filter((q) => props.visibleIds.has(q.id));
  return (
    <div className="space-y-3">
      {questions.map((q) => {
        const result = props.results.get(q.id);
        return (
          <Card key={q.id}>
            <fieldset lang="en">
              <legend className="font-medium text-slate-900">
                <span className="mr-2">{q.number}.</span>
                {q.prompt}
                {result && <span className={result.isCorrect ? "ml-2 text-emerald-700" : "ml-2 text-rose-700"}>{result.isCorrect ? "✓" : "✗"}</span>}
              </legend>
              <div className="mt-3 space-y-2">
                {q.options.map((o) => {
                  const checked = props.answers[q.id] === o.key;
                  return (
                    <label
                      key={o.key}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 px-3 py-2 ${
                        checked ? "border-teal-600 bg-teal-50" : "border-slate-200 hover:bg-slate-50"
                      } ${props.locked ? "cursor-default" : ""}`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={o.key}
                        checked={checked}
                        disabled={props.locked}
                        onChange={() => props.onChange(q.id, o.key)}
                        className="mt-1 accent-teal-600"
                      />
                      <span>
                        <span className="mr-1 font-semibold">{o.key}.</span>
                        {o.text}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </Card>
        );
      })}
    </div>
  );
}

export function QuestionArea(props: Props) {
  switch (props.exercise.type) {
    case "sentence-completion":
      return <SentenceCompletion {...props} />;
    case "flow-chart":
      return <FlowChart {...props} />;
    case "diagram-labelling":
      return <DiagramLabelling {...props} />;
    case "matching":
      return <Matching {...props} />;
    case "multiple-choice":
      return <MultipleChoice {...props} />;
  }
}
