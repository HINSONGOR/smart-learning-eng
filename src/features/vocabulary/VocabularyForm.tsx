"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useLearner } from "@/components/providers/LearnerProvider";
import { Button, Card, ErrorMessage, Field, LinkButton, LoadingState, PageHeader, Select, TextArea, TextInput } from "@/components/ui";
import { CATEGORIES, CATEGORY_LIST, IELTS_BANDS, LEVELS, PART_OF_SPEECH_ZH, PARTS_OF_SPEECH, type CategoryId } from "@/lib/constants";
import { ApiError, api, withQuery } from "@/lib/apiClient";
import { useApi } from "@/lib/useApi";
import type { VocabularyView } from "@/types";

interface FormState {
  word: string;
  partOfSpeech: string;
  meaningZh: string;
  definitionEn: string;
  exampleEn: string;
  exampleZh: string;
  category: string;
  topic: string;
  level: string;
  ieltsBand: string;
}

const EMPTY: FormState = {
  word: "",
  partOfSpeech: "",
  meaningZh: "",
  definitionEn: "",
  exampleEn: "",
  exampleZh: "",
  category: "",
  topic: "",
  level: "",
  ieltsBand: "",
};

/** 前端先做基本檢查，伺服器會再完整驗證一次 */
function validate(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.word.trim()) errors.word = "請輸入英文生字";
  else if (!/[a-z]/i.test(form.word)) errors.word = "英文生字必須包含英文字母";
  if (!form.partOfSpeech) errors.partOfSpeech = "請選擇詞性";
  if (!form.meaningZh.trim()) errors.meaningZh = "請輸入中文解釋";
  if (!form.exampleEn.trim()) errors.exampleEn = "請輸入英文例句";
  if (!form.category) errors.category = "請選擇學習分類";
  if (!form.topic.trim()) errors.topic = "請輸入主題";
  return errors;
}

export function VocabularyForm({ mode }: { mode: "create" | "edit" }) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const { learnerId, ready } = useLearner();
  const existing = useApi<VocabularyView>(
    mode === "edit" && ready ? withQuery(`/api/vocabulary/${params.id}`, { learnerId }) : null,
  );
  const topics = useApi<string[]>("/api/vocabulary/topics");

  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY,
    category: searchParams.get("category") ?? "",
  }));
  const [loaded, setLoaded] = useState(mode === "create");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === "edit" && existing.data && !loaded) {
      const v = existing.data;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        word: v.word,
        partOfSpeech: v.partOfSpeech,
        meaningZh: v.meaningZh,
        definitionEn: v.definitionEn,
        exampleEn: v.exampleEn,
        exampleZh: v.exampleZh,
        category: v.category,
        topic: v.topic,
        level: v.level,
        ieltsBand: v.ieltsBand,
      });
      setLoaded(true);
    }
  }, [mode, existing.data, loaded]);

  const set = (key: keyof FormState) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    setSubmitError("");
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      if (mode === "create") {
        await api("/api/vocabulary", { method: "POST", json: form });
      } else {
        await api(`/api/vocabulary/${params.id}`, { method: "PUT", json: form });
      }
      router.push(withQuery("/vocabulary", { category: form.category }));
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) setErrors(e.fieldErrors);
      setSubmitError((e as Error).message);
      setSaving(false);
    }
  }

  if (mode === "edit" && (existing.loading || !loaded)) {
    return existing.error ? (
      <ErrorMessage message={existing.error} onRetry={existing.reload} />
    ) : (
      <LoadingState />
    );
  }

  const suggestions = [
    ...new Set([...(form.category ? CATEGORIES[form.category as CategoryId].topics : []), ...(topics.data ?? [])]),
  ];

  return (
    <div>
      <PageHeader title={mode === "create" ? "新增生字" : "修改生字"} subtitle="標示 * 的欄位必須填寫。" />
      <Card>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="英文生字" required error={errors.word}>
              <TextInput value={form.word} onChange={set("word")} maxLength={100} invalid={Boolean(errors.word)} autoFocus lang="en" />
            </Field>
            <Field label="詞性" required error={errors.partOfSpeech}>
              <Select value={form.partOfSpeech} onChange={set("partOfSpeech")} invalid={Boolean(errors.partOfSpeech)}>
                <option value="">請選擇</option>
                {PARTS_OF_SPEECH.map((p) => (
                  <option key={p} value={p}>
                    {p}（{PART_OF_SPEECH_ZH[p]}）
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="中文解釋" required error={errors.meaningZh}>
            <TextInput value={form.meaningZh} onChange={set("meaningZh")} maxLength={300} invalid={Boolean(errors.meaningZh)} />
          </Field>
          <Field label="英文解釋 English definition" error={errors.definitionEn} hint="選填；用於 English Definition Quiz">
            <TextArea rows={2} value={form.definitionEn} onChange={set("definitionEn")} maxLength={500} lang="en" />
          </Field>
          <Field label="英文例句" required error={errors.exampleEn}>
            <TextArea rows={2} value={form.exampleEn} onChange={set("exampleEn")} maxLength={500} invalid={Boolean(errors.exampleEn)} lang="en" />
          </Field>
          <Field label="例句中文翻譯" error={errors.exampleZh} hint="建議填寫；用於例句閱讀練習">
            <TextArea rows={2} value={form.exampleZh} onChange={set("exampleZh")} maxLength={500} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="學習分類" required error={errors.category}>
              <Select value={form.category} onChange={set("category")} invalid={Boolean(errors.category)}>
                <option value="">請選擇</option>
                {CATEGORY_LIST.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}（{c.labelZh}）
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="主題" required error={errors.topic} hint="可以從建議選擇或自行輸入">
              <TextInput value={form.topic} onChange={set("topic")} list="topic-suggestions" maxLength={60} invalid={Boolean(errors.topic)} />
              <datalist id="topic-suggestions">
                {suggestions.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </Field>
            <Field label="難度（CEFR）" error={errors.level} hint="選填">
              <Select value={form.level} onChange={set("level")}>
                <option value="">不設定</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="IELTS Band" error={errors.ieltsBand} hint="選填；主要用於 IELTS 生字">
              <Select value={form.ieltsBand} onChange={set("ieltsBand")}>
                <option value="">不設定</option>
                {IELTS_BANDS.map((b) => (
                  <option key={b} value={b}>
                    Band {b}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <ErrorMessage message={submitError} />
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "儲存中…" : "儲存"}
            </Button>
            <LinkButton href="/vocabulary" variant="secondary">
              取消
            </LinkButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
