"use client";

import { useState } from "react";
import { api } from "@/lib/apiClient";
import type { VocabProgress } from "@/types";

type Flags = Partial<Pick<VocabProgress, "isFavorite" | "needsReview" | "isMastered">>;

/** 切換收藏／待重溫／已掌握，並回傳伺服器上的最新進度 */
export function useVocabularyFlags(learnerId: string) {
  const [error, setError] = useState("");

  async function setFlags(vocabId: string, flags: Flags): Promise<VocabProgress | null> {
    try {
      setError("");
      return await api<VocabProgress>(`/api/vocabulary/${vocabId}/progress`, {
        method: "PATCH",
        json: { learnerId, ...flags },
      });
    } catch (e) {
      setError((e as Error).message);
      return null;
    }
  }

  return { setFlags, error };
}
