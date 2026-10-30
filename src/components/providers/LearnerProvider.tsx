"use client";

// 目前學習者（我／兒子）。
// - 本機版：在頂部切換，選擇記在這部裝置的瀏覽器。
// - 雲端版：揀名字 + PIN 登入，學習者固定為登入者，需要登出才可以切換。
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, UNAUTHORIZED_EVENT } from "@/lib/apiClient";
import { useHydrated } from "@/lib/useHydrated";
import type { Learner } from "@/types";

const STORAGE_KEY = "sle.learnerId";

interface PublicSettings {
  learners: Learner[];
  gemini: { includeSentence: boolean };
  geminiConfigured: boolean;
  storage: "local" | "cloud";
}

interface SessionInfo {
  authEnabled: boolean;
  learnerId: string | null;
  learners: Learner[];
}

interface LearnerContextValue {
  learnerId: string;
  learner: Learner | undefined;
  learners: Learner[];
  settings: PublicSettings | null;
  ready: boolean;
  error: string;
  /** 雲端版：需要登入 */
  authEnabled: boolean;
  needsLogin: boolean;
  /** 已知道是否需要登入（避免登入前短暫顯示主畫面） */
  sessionLoaded: boolean;
  setLearnerId: (id: string) => void;
  reloadSettings: () => Promise<void>;
  login: (learnerId: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
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
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [learnerId, setLearnerIdState] = useState("");
  const [error, setError] = useState("");

  const reloadSettings = useCallback(async () => {
    try {
      const info = await api<SessionInfo>("/api/auth/session");
      setSession(info);
      setError("");
      if (info.authEnabled && !info.learnerId) {
        setSettings(null);
        setLearnerIdState("");
        return;
      }
      const data = await api<PublicSettings>("/api/settings");
      setSettings(data);
      setLearnerIdState((current) => {
        if (info.authEnabled && info.learnerId) return info.learnerId;
        const preferred = current || readStoredId();
        return data.learners.some((l) => l.id === preferred) ? preferred : data.learners[0].id;
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    // 首次載入時從伺服器讀取登入狀態及學習者清單
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reloadSettings();
    const onUnauthorized = () => void reloadSettings();
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [reloadSettings]);

  const setLearnerId = useCallback(
    (id: string) => {
      if (session?.authEnabled) return; // 雲端版需要登出再登入
      setLearnerIdState(id);
      try {
        window.localStorage.setItem(STORAGE_KEY, id);
      } catch {
        // 私密瀏覽模式下可能無法儲存，不影響使用
      }
    },
    [session],
  );

  const login = useCallback(
    async (id: string, pin: string) => {
      await api("/api/auth/login", { method: "POST", json: { learnerId: id, pin } });
      await reloadSettings();
    },
    [reloadSettings],
  );

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    await reloadSettings();
  }, [reloadSettings]);

  const authEnabled = Boolean(session?.authEnabled);
  const value = useMemo<LearnerContextValue>(
    () => ({
      learnerId,
      learner: settings?.learners.find((l) => l.id === learnerId),
      learners: settings?.learners ?? session?.learners ?? [],
      settings,
      ready: Boolean(settings && learnerId),
      error,
      authEnabled,
      needsLogin: authEnabled && !session?.learnerId,
      sessionLoaded: session !== null || error !== "",
      setLearnerId,
      reloadSettings,
      login,
      logout,
    }),
    [learnerId, settings, session, error, authEnabled, setLearnerId, reloadSettings, login, logout],
  );

  return <LearnerContext.Provider value={value}>{children}</LearnerContext.Provider>;
}

export function useLearner(): LearnerContextValue {
  const context = useContext(LearnerContext);
  const hydrated = useHydrated();
  if (!context) throw new Error("useLearner must be used inside LearnerProvider");
  // hydration 期間使用與伺服器相同的「未載入」狀態，避免畫面前後不一致
  if (!hydrated) {
    return {
      ...context,
      learnerId: "",
      learner: undefined,
      learners: [],
      settings: null,
      ready: false,
      error: "",
      authEnabled: false,
      needsLogin: false,
      sessionLoaded: false,
    };
  }
  return context;
}
