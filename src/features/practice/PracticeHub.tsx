"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, Field, PageHeader, Select } from "@/components/ui";
import { CATEGORY_LIST, IELTS_BANDS, LEVELS, VOCAB_PRACTICE_MODE_IDS, VOCAB_PRACTICE_MODES } from "@/lib/constants";
import { withQuery } from "@/lib/apiClient";

const OTHER_PRACTICE = [
  { href: "/vocabulary/cards", title: "單字卡 Flashcards", description: "逐張溫習生字，自我評估記得與否" },
  { href: "/reading-lab", title: "Reading Practice Lab", description: "Sentence Completion、Flow-chart、Diagram、Matching、Multiple Choice" },
  { href: "/dictation", title: "聽寫 Dictation", description: "聽句子並打出來，逐字對比" },
  { href: "/shadowing", title: "跟讀 Shadowing", description: "聽原句後錄音，重聽自己的讀音" },
];

export function PracticeHub() {
  const [category, setCategory] = useState("");
  const [level, setLevel] = useState("");
  const [ieltsBand, setIeltsBand] = useState("");
  const [scope, setScope] = useState("all");
  const [count, setCount] = useState("10");

  const href = (mode: string) =>
    withQuery("/practice/session", {
      mode,
      category,
      level,
      ieltsBand,
      scope: mode === "review" || mode === "wrong-redo" ? "" : scope === "all" ? "" : scope,
      count,
    });

  return (
    <div className="space-y-6">
      <PageHeader title="練習中心" subtitle="每題會即時顯示正確答案及解釋，完成後自動儲存到練習歷史。" />

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-800">生字練習</h2>
        <Card>
          <p className="mb-3 text-sm text-slate-600">練習範圍（適用於下面所有生字練習）</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Field label="分類">
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">全部</option>
                {CATEGORY_LIST.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="難度">
              <Select value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="">全部</option>
                {LEVELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </Select>
            </Field>
            <Field label="IELTS Band">
              <Select value={ieltsBand} onChange={(e) => setIeltsBand(e.target.value)}>
                <option value="">全部</option>
                {IELTS_BANDS.map((b) => (
                  <option key={b} value={b}>
                    Band {b}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="生字">
              <Select value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="all">全部生字</option>
                <option value="favorites">收藏生字</option>
                <option value="learning">未掌握生字</option>
              </Select>
            </Field>
            <Field label="題數">
              <Select value={count} onChange={(e) => setCount(e.target.value)}>
                {["5", "10", "20", "30"].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {VOCAB_PRACTICE_MODE_IDS.map((mode) => (
            <Link
              key={mode}
              href={href(mode)}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:border-teal-300 hover:shadow-md"
            >
              <p className="font-semibold text-slate-900">{VOCAB_PRACTICE_MODES[mode].label}</p>
              <p className="mt-1 text-sm text-slate-600">{VOCAB_PRACTICE_MODES[mode].description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-slate-800">其他練習</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {OTHER_PRACTICE.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:border-teal-300 hover:shadow-md"
            >
              <p className="font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1 text-sm text-slate-600">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
