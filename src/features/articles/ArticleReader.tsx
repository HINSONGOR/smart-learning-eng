"use client";

import { useParams } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useLearner } from "@/components/providers/LearnerProvider";
import { speechUnavailableReason, useSpeech } from "@/components/providers/SpeechProvider";
import { SpeakButton, SpeechNotice } from "@/components/SpeakButton";
import { Badge, Button, Card, EmptyState, ErrorMessage, LinkButton, LoadingState } from "@/components/ui";
import { CATEGORIES } from "@/lib/constants";
import { findGlossaryRanges } from "@/lib/highlight";
import { tokenizeWords } from "@/lib/text";
import { api, withQuery } from "@/lib/apiClient";
import { useApi } from "@/lib/useApi";
import type { ArticleProgress, ArticleView } from "@/types";
import { LookupPanel, type LookupRequest } from "./LookupPanel";

/** 把句子拆成「目標詞」及一般文字片段（目標詞加底線） */
function segmentSentence(sentence: string, terms: string[]): Array<{ text: string; term?: string }> {
  const segments: Array<{ text: string; term?: string }> = [];
  let last = 0;
  for (const range of findGlossaryRanges(sentence, terms)) {
    if (range.start > last) segments.push({ text: sentence.slice(last, range.start) });
    segments.push({ text: sentence.slice(range.start, range.end), term: range.term });
    last = range.end;
  }
  if (last < sentence.length) segments.push({ text: sentence.slice(last) });
  return segments;
}

const tokenize = tokenizeWords;

export function ArticleReader() {
  const { id } = useParams<{ id: string }>();
  const { learnerId, ready } = useLearner();
  const speech = useSpeech();
  const { data: article, error, loading, reload, setData } = useApi<ArticleView>(
    ready ? withQuery(`/api/articles/${id}`, { learnerId }) : null,
  );
  const [showZh, setShowZh] = useState(false);
  const [lookup, setLookup] = useState<LookupRequest | null>(null);
  const [selection, setSelection] = useState<LookupRequest | null>(null);
  const [actionError, setActionError] = useState("");
  const textRef = useRef<HTMLDivElement>(null);

  const sentences = useMemo(() => article?.paragraphs.flatMap((p) => p.sentences.map((s) => s.en)) ?? [], [article]);
  const glossaryTerms = useMemo(() => article?.glossary.map((g) => g.word) ?? [], [article]);
  const key = `article:${id}`;
  const playingHere = speech.activeKey === key && speech.status !== "idle";
  const speechReason = speechUnavailableReason(speech);

  // 離開頁面時停止朗讀
  const stop = speech.stop;
  useEffect(() => () => stop(), [stop]);

  // 選取多個字（片語）時顯示查詢按鈕
  useEffect(() => {
    function onSelectionChange() {
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? "";
      const container = textRef.current;
      if (!sel || !text || !container || sel.rangeCount === 0 || !container.contains(sel.anchorNode)) {
        setSelection(null);
        return;
      }
      const sentenceEl = (sel.anchorNode?.parentElement)?.closest<HTMLElement>("[data-sentence]");
      if (text.length <= 80 && /[a-z]/i.test(text)) {
        setSelection({ text, sentence: sentenceEl?.dataset.sentence ?? "" });
      }
    }
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  async function setFlags(patch: Partial<ArticleProgress>) {
    try {
      setActionError("");
      const progress = await api<ArticleProgress>(`/api/articles/${id}/progress`, {
        method: "PATCH",
        json: { learnerId, ...patch },
      });
      setData((a) => (a ? { ...a, progress } : a));
    } catch (e) {
      setActionError((e as Error).message);
    }
  }

  if (loading) return <LoadingState />;
  if (error) {
    return (
      <EmptyState
        title="未能開啟文章"
        description={error}
        action={
          <>
            <Button variant="secondary" onClick={reload}>
              重試
            </Button>
            <LinkButton href="/articles">返回文章庫</LinkButton>
          </>
        }
      />
    );
  }
  if (!article) return null;

  const category = CATEGORIES[article.category];
  // 每段第一句在全文中的位置，用來對應逐句播放的索引
  const paragraphOffsets = article.paragraphs.map((_, p) =>
    article.paragraphs.slice(0, p).reduce((n, para) => n + para.sentences.length, 0),
  );

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap gap-1.5">
          <Badge className={category.color.badge}>{category.label}</Badge>
          {article.topic && <Badge>{article.topic}</Badge>}
          {article.level && <Badge className="bg-sky-100 text-sky-800">{article.level}</Badge>}
          {article.ieltsBand && <Badge className="bg-indigo-100 text-indigo-800">Band {article.ieltsBand}</Badge>}
          {article.source && <Badge>來源：{article.source}</Badge>}
        </div>
        <h1 className="mt-2 text-2xl font-bold text-slate-900" lang="en">
          {article.title}
        </h1>
        {article.titleZh && <p className="text-slate-600">{article.titleZh}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant={article.progress.isLearned ? "primary" : "secondary"} onClick={() => setFlags({ isLearned: !article.progress.isLearned })}>
            {article.progress.isLearned ? "✓ 已學習" : "標記已學習"}
          </Button>
          <Button variant="secondary" onClick={() => setFlags({ isFavorite: !article.progress.isFavorite })}>
            {article.progress.isFavorite ? "★ 已收藏" : "☆ 收藏"}
          </Button>
          <Button variant="secondary" onClick={() => setShowZh((v) => !v)} aria-pressed={showZh}>
            {showZh ? "隱藏中文" : "顯示中文"}
          </Button>
          <LinkButton variant="secondary" href={withQuery("/dictation", { articleId: article.id })}>
            聽寫這篇
          </LinkButton>
        </div>
        <ErrorMessage message={actionError} />
      </div>

      <SpeechNotice />

      {/* 播放控制 */}
      <div className="sticky top-14 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        {!playingHere ? (
          <Button onClick={() => speech.speakSequence(sentences, key, 0)} disabled={Boolean(speechReason)}>
            ▶ 播放全文
          </Button>
        ) : speech.status === "paused" ? (
          <Button onClick={speech.resume}>▶ 繼續</Button>
        ) : (
          <Button onClick={speech.pause}>❚❚ 暫停</Button>
        )}
        <Button variant="secondary" onClick={() => speech.speakSequence(sentences, key, 0)} disabled={Boolean(speechReason)}>
          ↻ 重播
        </Button>
        <Button
          variant="secondary"
          onClick={speech.stop}
          disabled={!(speech.activeKey.startsWith(key) && speech.status !== "idle")}
        >
          ■ 停止
        </Button>
        <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
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
          <span className="w-8 tabular-nums">{speech.rate.toFixed(1)}x</span>
        </label>
        <p className="w-full text-xs text-slate-500">提示：點擊句子前的 ▶ 播放該句；點擊任何英文字查看解釋；選取幾個字可以查詢片語。</p>
      </div>

      {article.summaryZh && (
        <Card className="bg-slate-50">
          <p className="whitespace-pre-line text-sm text-slate-700">{article.summaryZh}</p>
        </Card>
      )}
      {article.glossary.length > 0 && (
        <p className="text-xs text-slate-500">
          <span className="border-b-2 border-teal-500 font-semibold text-slate-700">有底線</span>
          的是本篇目標詞，點擊即可看文中釋義及儲存。
        </p>
      )}

      <Card>
        <div ref={textRef} className="reading-text space-y-4 text-slate-900" lang="en">
          {article.paragraphs.map((paragraph, p) => {
            // 教材逐句翻譯時每句分行顯示；按段落翻譯時保持整段，翻譯放在段落下面
            const perSentenceZh = showZh && paragraph.sentences.some((s) => s.zh);
            return (
            <div key={p} className={perSentenceZh ? "space-y-2" : ""}>
              {paragraph.section && (
                <h2 className={`mb-2 text-base font-bold text-teal-800 ${p > 0 ? "mt-6 border-t border-slate-100 pt-4" : ""}`}>
                  {paragraph.section}
                </h2>
              )}
              {paragraph.speaker && (
                <span
                  className={`mr-2 inline-block rounded px-1.5 py-0.5 align-middle text-xs font-semibold ${
                    paragraph.speaker === "Interviewer" ? "bg-indigo-100 text-indigo-800" : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {paragraph.speaker}
                </span>
              )}
              {paragraph.sentences.map((sentence, s) => {
                const index = paragraphOffsets[p] + s;
                const singleKey = `${key}:s${index}`;
                const active =
                  (playingHere && speech.activeIndex === index) ||
                  (speech.activeKey === singleKey && speech.status !== "idle");
                const content = (
                  <span data-sentence={sentence.en} className={`rounded transition-colors ${active ? "bg-amber-100" : ""}`}>
                    <button
                      type="button"
                      onClick={() => speech.speakSequence([sentence.en], singleKey, 0)}
                      disabled={Boolean(speechReason)}
                      className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full align-middle text-[10px] text-teal-700 ring-1 ring-teal-300 hover:bg-teal-50 disabled:opacity-30"
                      aria-label="播放這句"
                    >
                      ▶
                    </button>
                    {segmentSentence(sentence.en, glossaryTerms).map((segment, g) =>
                      segment.term ? (
                        <span
                          key={g}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            if (window.getSelection()?.toString().trim()) return;
                            setLookup({ text: segment.term!, sentence: sentence.en });
                          }}
                          onKeyDown={(e) => e.key === "Enter" && setLookup({ text: segment.term!, sentence: sentence.en })}
                          className="cursor-pointer rounded border-b-2 border-teal-500 font-semibold hover:bg-teal-100"
                          title={segment.term}
                        >
                          {segment.text}
                        </span>
                      ) : (
                        tokenize(segment.text).map((token, t) =>
                          token.isWord ? (
                            <span
                              key={`${g}-${t}`}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                if (window.getSelection()?.toString().trim()) return;
                                setLookup({ text: token.text, sentence: sentence.en });
                              }}
                              onKeyDown={(e) => e.key === "Enter" && setLookup({ text: token.text, sentence: sentence.en })}
                              className="cursor-pointer rounded hover:bg-teal-100"
                            >
                              {token.text}
                            </span>
                          ) : (
                            <Fragment key={`${g}-${t}`}>{token.text}</Fragment>
                          ),
                        )
                      ),
                    )}{" "}
                  </span>
                );
                return perSentenceZh ? (
                  <div key={s}>
                    {content}
                    {sentence.zh && (
                      <p className="mt-0.5 text-base text-slate-500" lang="zh-Hant">
                        {sentence.zh}
                      </p>
                    )}
                  </div>
                ) : (
                  <Fragment key={s}>{content}</Fragment>
                );
              })}
              {showZh && paragraph.translationZh && (
                <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-base leading-relaxed text-slate-600" lang="zh-Hant">
                  {paragraph.translationZh}
                </p>
              )}
            </div>
            );
          })}
        </div>
      </Card>

      {(article.previous || article.next) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {article.previous ? (
            <LinkButton href={`/articles/${article.previous.id}`} variant="secondary" className="justify-start text-left">
              ← 上一篇：{article.previous.title}
            </LinkButton>
          ) : (
            <span />
          )}
          {article.next && (
            <LinkButton href={`/articles/${article.next.id}`} className="justify-end text-right">
              下一篇：{article.next.title} →
            </LinkButton>
          )}
        </div>
      )}

      {article.glossary.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold text-slate-800">文章生字（{article.glossary.length}）</h2>
          <ul className="divide-y divide-slate-100">
            {article.glossary.map((g, i) => (
              <li key={`${g.word}-${i}`} className="flex items-start gap-3 py-2">
                <SpeakButton text={g.word} size="sm" />
                <div className="min-w-0 flex-1 text-sm">
                  <p>
                    <button type="button" className="font-semibold text-slate-900 hover:text-teal-700" onClick={() => setLookup({ text: g.word, sentence: "" })}>
                      {g.word}
                    </button>
                    {g.partOfSpeech && <span className="ml-1 text-slate-500">{g.partOfSpeech}</span>}
                    <span className="ml-2 text-slate-700">{g.meaningZh}</span>
                  </p>
                  {g.definitionEn && <p className="text-slate-500">{g.definitionEn}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {selection && !lookup && (
        <div className="fixed inset-x-0 bottom-20 z-30 flex justify-center px-4 lg:bottom-6">
          <Button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setLookup(selection);
              window.getSelection()?.removeAllRanges();
              setSelection(null);
            }}
            className="shadow-lg"
          >
            查詢「{selection.text.length > 30 ? `${selection.text.slice(0, 30)}…` : selection.text}」
          </Button>
        </div>
      )}

      {lookup && (
        <LookupPanel
          request={lookup}
          articleId={article.id}
          category={article.category}
          topic={article.topic}
          learnerId={learnerId}
          onClose={() => setLookup(null)}
        />
      )}
    </div>
  );
}
