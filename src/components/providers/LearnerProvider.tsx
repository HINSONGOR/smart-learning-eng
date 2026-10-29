"use client";

// 目前學習者（我／兒子）。選擇會記在這部裝置的瀏覽器，每部裝置可以各自選擇。
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/apiClient";
import type { Learner } from "@/types";

const STORAGE_KEY = "sle.learnerId";

interface PublicSettings {
  learners: Learner[];
  gemini: { includeSentence: boolean };
  geminiConfigured: boolean;
}

interface LearnerContextValue {
  learnerId: string;
  learner: Learner | undefined;
  learners: Learner[];
  settings: PublicSettings | null;
  ready: boolean;
  error: string;
  setLearnerId: (id: string) => void;
  reloadSettings: () => Promise<void>;
}

const LearnerContext = createContext<LearnerContextValue | null>(null);

function readStoredId(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function LearnerProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [learnerId, setLearnerIdState] = useState("");
  const [error, setError] = useState("");

  const reloadSettings = useCallback(async () => {
    try {
      const data = await api<PublicSettings>("/api/settings");
      setSettings(data);
      setError("");
      setLearnerIdState((current) => {
        const preferred = current || readStoredId();
        return data.learners.some((l) => l.id === preferred) ? preferred : data.learners[0].id;
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // 首次載入時從伺服器讀取學習者清單
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reloadSettings();
  }, [reloadSettings]);

  const setLearnerId = useCallback((id: string) => {
    setLearnerIdState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // 私密瀏覽模式下可能無法儲存，不影響使用
    }
  }, []);

  const value = useMemo<LearnerContextValue>(
    () => ({
      learnerId,
      learner: settings?.learners.find((l) => l.id === learnerId),
      learners: settings?.learners ?? [],
      settings,
      ready: Boolean(settings && learnerId),
      error,
      setLearnerId,
      reloadSettings,
    }),
    [learnerId, settings, error, setLearnerId, reloadSettings],
  );

  return <LearnerContext.Provider value={value}>{children}</LearnerContext.Provider>;
}

export function useLearner(): LearnerContextValue {
  const context = useContext(LearnerContext);
  if (!context) throw new Error("useLearner must be used inside LearnerProvider");
  return context;
}
