"use client";

// 文章選字查詢結果：顯示中文解釋及例句，可修改後儲存為「待重溫」生字。
import Link from "next/link";
import { useEffect, useState } from "react";
import { SpeakButton } from "@/components/SpeakButton";
import { Button, ErrorMessage, Field, Select, TextArea, TextInput } from "@/components/ui";
import { PART_OF_SPEECH_ZH, PARTS_OF_SPEECH, type CategoryId } from "@/lib/constants";
import { ApiError, api } from "@/lib/apiClient";
import type { LookupResult } from "@/types";

const SOURCE_LABEL: Record<LookupResult["source"], string> = {
  glossary: "來源：文章生字表",
  vocabulary: "來源：你的生字庫",
  gemini: "來源：Gemini AI（請核對）",
  none: "查不到解釋",
};

export interface LookupRequest {
  text: string;
  sentence: string;
}

export function LookupPanel({
  request,
  articleId,
  category,
  topic,
  learnerId,
  onClose,
}: {
  request: LookupRequest;
  articleId: string;
  category: CategoryId;
  topic: string;
  learnerId: string;
  onClose: () => void;
}) {
  const [result, setResult] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ word: "", partOfSpeech: "", meaningZh: "", definitionEn: "", exampleEn: "", exampleZh: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError("");
    setStatus("idle");
    setFieldErrors({});
    api<LookupResult>("/api/lookup", { method: "POST", json: { text: request.text, sentence: request.sentence, articleId } })
      .then((r) => {
        if (cancelled) return;
        setResult(r);
        setForm({
          word: r.text,
          partOfSpeech: PARTS_OF_SPEECH.includes(r.partOfSpeech as (typeof PARTS_OF_SPEECH)[number]) ? r.partOfSpeech : "",
          meaningZh: r.meaningZh,
          definitionEn: r.definitionEn,
          exampleEn: r.exampleEn,
          exampleZh: r.exampleZh,
        });
      })
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [request, articleId]);

  async function save() {
    const errors: Record<string, string> = {};
    if (!form.word.trim()) errors.word = "請輸入生字";
    if (!form.partOfSpeech) errors.partOfSpeech = "請選擇詞性";
    if (!form.meaningZh.trim()) errors.meaningZh = "請輸入中文解釋";
    if (!form.exampleEn.trim()) errors.exampleEn = "請輸入英文例句";
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;
    setStatus("saving");
    setError("");
    try {
      await api("/api/vocabulary", {
        method: "POST",
        json: {
          ...form,
          category,
          topic: topic || "Article",
          sourceArticleId: articleId,
          learnerId,
          markForReview: true,
        },
      });
      setStatus("saved");
    } catch (e) {
      if (e instanceof ApiError) setFieldErrors(e.fieldErrors);
      setError((e as Error).message);
      setStatus("idle");
    }
  }

  async function markExistingForReview() {
    if (!result?.existingVocabId) return;
    setStatus("saving");
    try {
      await api(`/api/vocabulary/${result.existingVocabId}/progress`, {
        method: "PATCH",
        json: { learnerId, needsReview: true },
      });
      setStatus("saved");
    } catch (e) {
      setError((e as Error).message);
      setStatus("idle");
    }
  }

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white p-5 shadow-2xl sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[26rem] sm:rounded-2xl sm:border" role="dialog" aria-label="生字查詢">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <SpeakButton text={request.text} />
          <p className="text-xl font-bold text-slate-900" lang="en">
            {request.text}
          </p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100" aria-label="關閉">
          ✕
        </button>
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-slate-500">查詢中…</p>
      ) : error && !result ? (
        <ErrorMessage message={error} />
      ) : result ? (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-slate-500">{SOURCE_LABEL[result.source]}</p>
          {result.notice && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{result.notice}</p>}

          {status === "saved" ? (
            <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-medium">✓ 已儲存為「待重溫」生字</p>
              <p className="mt-1">可以在單字卡或「生字重溫」練習中溫習。</p>
              <div className="mt-3 flex gap-2">
                <Link href="/vocabulary/cards" className="font-medium underline">
                  去單字卡
                </Link>
                <button type="button" onClick={onClose} className="font-medium underline">
                  繼續閱讀
                </button>
              </div>
            </div>
          ) : result.existingVocabId ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="font-medium text-slate-900">{result.meaningZh}</p>
                {result.partOfSpeech && <p className="text-sm text-slate-500">{PART_OF_SPEECH_ZH[result.partOfSpeech] ?? result.partOfSpeech}</p>}
                {result.definitionEn && <p className="text-sm text-slate-600">{result.definitionEn}</p>}
                {result.exampleEn && <p className="mt-2 text-sm text-slate-800">{result.exampleEn}</p>}
                {result.exampleZh && <p className="text-sm text-slate-500">{result.exampleZh}</p>}
              </div>
              <p className="text-sm text-slate-600">這個字已在生字庫。</p>
              <ErrorMessage message={error} />
              <Button onClick={markExistingForReview} disabled={status === "saving"}>
                標記為待重溫
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Field label="生字" required error={fieldErrors.word} hint="可改為原形，例如 impacts → impact">
                <TextInput value={form.word} onChange={set("word")} lang="en" invalid={Boolean(fieldErrors.word)} />
              </Field>
              <Field label="中文解釋" required error={fieldErrors.meaningZh}>
                <TextInput value={form.meaningZh} onChange={set("meaningZh")} invalid={Boolean(fieldErrors.meaningZh)} placeholder="請輸入中文解釋" />
              </Field>
              <Field label="詞性" required error={fieldErrors.partOfSpeech}>
                <Select value={form.partOfSpeech} onChange={set("partOfSpeech")} invalid={Boolean(fieldErrors.partOfSpeech)}>
                  <option value="">請選擇</option>
                  {PARTS_OF_SPEECH.map((p) => (
                    <option key={p} value={p}>
                      {p}（{PART_OF_SPEECH_ZH[p]}）
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="英文解釋" hint="選填">
                <TextInput value={form.definitionEn} onChange={set("definitionEn")} lang="en" />
              </Field>
              <Field label="例句（文章原句）" required error={fieldErrors.exampleEn}>
                <TextArea rows={2} value={form.exampleEn} onChange={set("exampleEn")} lang="en" invalid={Boolean(fieldErrors.exampleEn)} />
              </Field>
              <Field label="例句中文翻譯" hint="選填">
                <TextArea rows={2} value={form.exampleZh} onChange={set("exampleZh")} />
              </Field>
              <ErrorMessage message={error} />
              <Button onClick={save} disabled={status === "saving"} className="w-full">
                {status === "saving" ? "儲存中…" : "儲存到生字庫（待重溫）"}
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
