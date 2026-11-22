"use client";

// Reading Lab 的文章：段落字母及小標題、逐段朗讀、點字查詢（可儲存為待重溫生字）
import { Fragment, useEffect, useState } from "react";
import { speechUnavailableReason, useSpeech } from "@/components/providers/SpeechProvider";
import { SpeechNotice } from "@/components/SpeakButton";
import { Card } from "@/components/ui";
import { escapeRegExp, tokenizeWords } from "@/lib/text";
import type { PublicExercise } from "@/types";
import { LookupPanel, type LookupRequest } from "../articles/LookupPanel";

export function PassageView({ exercise, learnerId }: { exercise: PublicExercise; learnerId: string }) {
  const speech = useSpeech();
  const speechReason = speechUnavailableReason(speech);
  const [lookup, setLookup] = useState<LookupRequest | null>(null);
  const key = `exercise:${exercise.id}`;
  const { passage } = exercise;

  const stop = speech.stop;
  useEffect(() => () => stop(), [stop]);

  if (!passage.title && passage.paragraphs.length === 0) return null;

  return (
    <Card className="lg:sticky lg:top-16 lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto">
      {passage.title && (
        <h2 className="mb-2 text-lg font-semibold text-slate-900" lang="en">
          {passage.title}
        </h2>
      )}
      <div className="mb-3">
        <SpeechNotice />
      </div>
      <p className="mb-3 text-xs text-slate-500">提示：按 ▶ 朗讀該段；點擊英文字查看解釋及儲存生字。</p>
      <div className="reading-text space-y-4 text-slate-800" lang="en">
        {passage.paragraphs.map((paragraph, i) => {
          const playKey = `${key}:${i}`;
          const playing = speech.activeKey === playKey && speech.status !== "idle";
          return (
            <div key={i} className={`rounded transition-colors ${playing ? "bg-amber-50" : ""}`}>
              {paragraph.heading && <h3 className="mb-1 text-sm font-bold tracking-wide text-teal-800">{paragraph.heading}</h3>}
              <p>
                <button
                  type="button"
                  onClick={() => (playing ? speech.stop() : speech.speak(paragraph.text, playKey))}
                  disabled={Boolean(speechReason)}
                  className="mr-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 align-middle text-xs font-bold text-teal-700 ring-1 ring-teal-300 hover:bg-teal-50 disabled:opacity-40"
                  aria-label={playing ? "停止朗讀" : `朗讀${paragraph.label ? ` ${paragraph.label} 段` : "這段"}`}
                  title={playing ? "停止朗讀" : "朗讀這段"}
                >
                  {playing ? "■" : paragraph.label || "▶"}
                </button>
                {tokenizeWords(paragraph.text).map((token, t) =>
                  token.isWord ? (
                    <span
                      key={t}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (window.getSelection()?.toString().trim()) return;
                        setLookup({ text: token.text, sentence: sentenceContaining(paragraph.text, token.text) });
                      }}
                      onKeyDown={(e) =>
                        e.key === "Enter" && setLookup({ text: token.text, sentence: sentenceContaining(paragraph.text, token.text) })
                      }
                      className="cursor-pointer rounded hover:bg-teal-100"
                    >
                      {token.text}
                    </span>
                  ) : (
                    <Fragment key={t}>{token.text}</Fragment>
                  ),
                )}
              </p>
            </div>
          );
        })}
      </div>
      {lookup && (
        <LookupPanel
          request={lookup}
          articleId=""
          category={exercise.category}
          topic={exercise.title}
          learnerId={learnerId}
          onClose={() => setLookup(null)}
        />
      )}
    </Card>
  );
}

/** 找出段落中包含該字的句子，用作儲存生字時的例句 */
function sentenceContaining(paragraph: string, word: string): string {
  const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, "i");
  return paragraph.split(/(?<=[.!?][”’"]?)\s+/).find((s) => pattern.test(s))?.trim() ?? "";
}
