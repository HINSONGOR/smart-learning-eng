"use client";

import { ChipGroup, Select, TextInput } from "@/components/ui";
import { CATEGORY_LIST, IELTS_BANDS, LEVELS } from "@/lib/constants";

export type Scope = "all" | "favorites" | "review" | "wrong" | "mastered" | "learning";

export interface VocabularyFilterState {
  search: string;
  category: string;
  topic: string;
  level: string;
  ieltsBand: string;
  scope: Scope;
}

export const EMPTY_FILTER: VocabularyFilterState = {
  search: "",
  category: "",
  topic: "",
  level: "",
  ieltsBand: "",
  scope: "all",
};

export const SCOPE_OPTIONS: Array<{ value: Scope; label: string }> = [
  { value: "all", label: "全部" },
  { value: "favorites", label: "★ 收藏" },
  { value: "review", label: "待重溫" },
  { value: "wrong", label: "錯題" },
  { value: "learning", label: "未掌握" },
  { value: "mastered", label: "已掌握" },
];

export function VocabularyFilters({
  value,
  onChange,
  topics,
  showSearch = true,
}: {
  value: VocabularyFilterState;
  onChange: (next: VocabularyFilterState) => void;
  topics: string[];
  showSearch?: boolean;
}) {
  const set = (patch: Partial<VocabularyFilterState>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      {showSearch && (
        <TextInput
          type="search"
          placeholder="搜尋英文、中文解釋、例句或主題…"
          value={value.search}
          onChange={(e) => set({ search: e.target.value })}
          aria-label="搜尋生字"
        />
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Select aria-label="學習分類" value={value.category} onChange={(e) => set({ category: e.target.value, topic: "" })}>
          <option value="">全部分類</option>
          {CATEGORY_LIST.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
        <Select aria-label="主題" value={value.topic} onChange={(e) => set({ topic: e.target.value })}>
          <option value="">全部主題</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select aria-label="難度" value={value.level} onChange={(e) => set({ level: e.target.value })}>
          <option value="">全部難度</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
        <Select aria-label="IELTS Band" value={value.ieltsBand} onChange={(e) => set({ ieltsBand: e.target.value })}>
          <option value="">全部 Band</option>
          {IELTS_BANDS.map((b) => (
            <option key={b} value={b}>
              Band {b}
            </option>
          ))}
        </Select>
      </div>
      <ChipGroup label="篩選範圍" value={value.scope} options={SCOPE_OPTIONS} onChange={(scope) => set({ scope })} />
    </div>
  );
}
