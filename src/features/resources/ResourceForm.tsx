"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Card, ErrorMessage, Field, LinkButton, LoadingState, PageHeader, Select, TextArea, TextInput } from "@/components/ui";
import { CATEGORIES, CATEGORY_LIST, RESOURCE_TYPES, type CategoryId } from "@/lib/constants";
import { ApiError, api } from "@/lib/apiClient";
import { useApi } from "@/lib/useApi";
import type { LearningResource } from "@/types";

interface FormState {
  title: string;
  url: string;
  category: string;
  resourceType: string;
  topic: string;
  notes: string;
  isFavorite: boolean;
}

const EMPTY: FormState = { title: "", url: "", category: "", resourceType: "", topic: "", notes: "", isFavorite: false };

function validate(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.title.trim()) errors.title = "請輸入資源標題";
  if (!form.url.trim()) errors.url = "請輸入網址";
  else if (!/^https?:\/\/\S+$/i.test(form.url.trim())) errors.url = "網址格式不正確，必須以 http:// 或 https:// 開頭";
  if (!form.category) errors.category = "請選擇學習分類";
  if (!form.resourceType) errors.resourceType = "請選擇資源類型";
  if (!form.topic.trim()) errors.topic = "請輸入主題";
  return errors;
}

export function ResourceForm({ mode }: { mode: "create" | "edit" }) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const existing = useApi<LearningResource>(mode === "edit" ? `/api/resources/${params.id}` : null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loaded, setLoaded] = useState(mode === "create");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === "edit" && existing.data && !loaded) {
      const r = existing.data;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({ title: r.title, url: r.url, category: r.category, resourceType: r.resourceType, topic: r.topic, notes: r.notes, isFavorite: r.isFavorite });
      setLoaded(true);
    }
  }, [mode, existing.data, loaded]);

  const set = (key: keyof FormState) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    setSubmitError("");
    if (Object.keys(found).length) return;
    setSaving(true);
    try {
      const payload = { ...form, url: form.url.trim() };
      if (mode === "create") await api("/api/resources", { method: "POST", json: payload });
      else await api(`/api/resources/${params.id}`, { method: "PUT", json: payload });
      router.push("/resources");
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fieldErrors);
      setSubmitError((e as Error).message);
      setSaving(false);
    }
  }

  if (mode === "edit" && !loaded) {
    return existing.error ? <ErrorMessage message={existing.error} onRetry={existing.reload} /> : <LoadingState />;
  }

  return (
    <div>
      <PageHeader title={mode === "create" ? "新增資源" : "修改資源"} subtitle="只儲存網址及筆記。標示 * 的欄位必須填寫。" />
      <Card>
        <form onSubmit={submit} noValidate className="space-y-4">
          <Field label="資源標題" required error={errors.title}>
            <TextInput value={form.title} onChange={set("title")} maxLength={200} invalid={Boolean(errors.title)} />
          </Field>
          <Field label="網址" required error={errors.url} hint="例如 https://www.youtube.com/watch?v=…">
            <TextInput type="url" value={form.url} onChange={set("url")} maxLength={1000} invalid={Boolean(errors.url)} inputMode="url" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="學習分類" required error={errors.category}>
              <Select value={form.category} onChange={set("category")} invalid={Boolean(errors.category)}>
                <option value="">請選擇</option>
                {CATEGORY_LIST.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="資源類型" required error={errors.resourceType}>
              <Select value={form.resourceType} onChange={set("resourceType")} invalid={Boolean(errors.resourceType)}>
                <option value="">請選擇</option>
                {Object.entries(RESOURCE_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="主題" required error={errors.topic}>
              <TextInput value={form.topic} onChange={set("topic")} list="resource-topics" maxLength={60} invalid={Boolean(errors.topic)} />
              <datalist id="resource-topics">
                {(form.category ? CATEGORIES[form.category as CategoryId].topics : []).map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </Field>
          </div>
          <Field label="個人筆記" error={errors.notes}>
            <TextArea rows={4} value={form.notes} onChange={set("notes")} maxLength={2000} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.isFavorite} onChange={(e) => setForm((f) => ({ ...f, isFavorite: e.target.checked }))} className="h-4 w-4 accent-teal-600" />
            加入收藏
          </label>
          <ErrorMessage message={submitError} />
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "儲存中…" : "儲存"}
            </Button>
            <LinkButton href="/resources" variant="secondary">
              取消
            </LinkButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
