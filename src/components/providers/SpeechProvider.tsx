"use client";

// 瀏覽器內置語音（SpeechSynthesis）。免費、在本機運作，不使用任何付費語音 API。
// - 只列出英文語音；處理 voiceschanged（語音清單通常稍後才載入）。
// - 長文逐句播放，避免部分瀏覽器朗讀長句時中斷，亦方便標示目前句子。
// - 語音及語速設定儲存在這部裝置的瀏覽器，因為每部裝置的語音都不同。
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useHydrated } from "@/lib/useHydrated";

const VOICE_KEY = "sle.voiceURI";
const RATE_KEY = "sle.rate";

export type SpeechStatus = "idle" | "speaking" | "paused";

interface SpeechContextValue {
  /** null = 尚未檢查（伺服器渲染期間） */
  supported: boolean | null;
  voicesLoaded: boolean;
  voices: SpeechSynthesisVoice[];
  voiceURI: string;
  rate: number;
  status: SpeechStatus;
  /** 正在播放的項目 key（例如某個生字或文章 id） */
  activeKey: string;
  /** 逐句播放時目前句子的索引 */
  activeIndex: number;
  setVoiceURI: (uri: string) => void;
  setRate: (rate: number) => void;
  speak: (text: string, key?: string) => void;
  speakSequence: (texts: string[], key: string, startIndex?: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

const SpeechContext = createContext<SpeechContextValue | null>(null);

function safeGet(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 無法儲存時只影響下次預設值
  }
}

export function SpeechProvider({ children }: { children: React.ReactNode }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [voiceURI, setVoiceURIState] = useState("");
  const [rate, setRateState] = useState(1);
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [activeKey, setActiveKey] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  // 用 ref 保存播放佇列，避免 utterance 被回收及處理過時的回呼
  const sessionRef = useRef(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const settingsRef = useRef({ voiceURI: "", rate: 1, voices: [] as SpeechSynthesisVoice[] });

  useEffect(() => {
    settingsRef.current = { voiceURI, rate, voices };
  }, [voiceURI, rate, voices]);

  useEffect(() => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
    const ok = Boolean(synth && typeof window.SpeechSynthesisUtterance === "function");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(ok);
    const storedRate = Number(safeGet(RATE_KEY));
    if (storedRate >= 0.5 && storedRate <= 1.5) setRateState(storedRate);
    setVoiceURIState(safeGet(VOICE_KEY));
    if (!ok || !synth) return;

    const load = () => {
      const english = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
      english.sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));
      setVoices(english);
      if (synth.getVoices().length > 0) setVoicesLoaded(true);
    };
    load();
    synth.addEventListener("voiceschanged", load);
    // 部分瀏覽器不會觸發 voiceschanged：稍後再檢查一次，之後視為已載入
    const timer = window.setTimeout(() => {
      load();
      setVoicesLoaded(true);
    }, 1500);
    return () => {
      synth.removeEventListener("voiceschanged", load);
      window.clearTimeout(timer);
      synth.cancel();
    };
  }, []);

  const pickVoice = useCallback((): SpeechSynthesisVoice | undefined => {
    const { voiceURI: uri, voices: list } = settingsRef.current;
    return (
      list.find((v) => v.voiceURI === uri) ??
      list.find((v) => v.lang === "en-US" && v.localService) ??
      list.find((v) => v.lang.startsWith("en-")) ??
      list[0]
    );
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setActiveKey("");
    setActiveIndex(-1);
  }, []);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    window.speechSynthesis?.cancel();
    reset();
  }, [reset]);

  const speakSequence = useCallback(
    (texts: string[], key: string, startIndex = 0) => {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const session = ++sessionRef.current;

      const speakAt = (index: number) => {
        if (session !== sessionRef.current) return;
        if (index >= texts.length) {
          reset();
          return;
        }
        const text = texts[index]?.trim();
        if (!text) {
          speakAt(index + 1);
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = pickVoice();
        if (voice) utterance.voice = voice;
        utterance.lang = voice?.lang ?? "en-US";
        utterance.rate = settingsRef.current.rate;
        utterance.onend = () => speakAt(index + 1);
        utterance.onerror = (event) => {
          // 被 cancel 屬正常情況；其他錯誤則停止，避免無限重試
          if (event.error !== "interrupted" && event.error !== "canceled") console.warn(event.error);
          if (session === sessionRef.current) reset();
        };
        utteranceRef.current = utterance;
        setActiveIndex(index);
        synth.speak(utterance);
      };

      setActiveKey(key);
      setStatus("speaking");
      speakAt(startIndex);
    },
    [pickVoice, reset],
  );

  const speak = useCallback(
    (text: string, key = text) => speakSequence([text], key, 0),
    [speakSequence],
  );

  const pause = useCallback(() => {
    if (status !== "speaking") return;
    window.speechSynthesis?.pause();
    setStatus("paused");
  }, [status]);

  const resume = useCallback(() => {
    if (status !== "paused") return;
    window.speechSynthesis?.resume();
    setStatus("speaking");
  }, [status]);

  const setVoiceURI = useCallback((uri: string) => {
    setVoiceURIState(uri);
    safeSet(VOICE_KEY, uri);
  }, []);

  const setRate = useCallback((value: number) => {
    setRateState(value);
    safeSet(RATE_KEY, String(value));
  }, []);

  const value = useMemo<SpeechContextValue>(
    () => ({
      supported,
      voicesLoaded,
      voices,
      voiceURI,
      rate,
      status,
      activeKey,
      activeIndex,
      setVoiceURI,
      setRate,
      speak,
      speakSequence,
      pause,
      resume,
      stop,
    }),
    [supported, voicesLoaded, voices, voiceURI, rate, status, activeKey, activeIndex, setVoiceURI, setRate, speak, speakSequence, pause, resume, stop],
  );

  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>;
}

export function useSpeech(): SpeechContextValue {
  const context = useContext(SpeechContext);
  const hydrated = useHydrated();
  if (!context) throw new Error("useSpeech must be used inside SpeechProvider");
  // hydration 期間使用與伺服器相同的「未檢查」狀態
  if (!hydrated) return { ...context, supported: null, voicesLoaded: false, voices: [], status: "idle", activeKey: "", activeIndex: -1 };
  return context;
}

/** 語音不可用時的說明文字；可用時回傳空字串 */
export function speechUnavailableReason(s: Pick<SpeechContextValue, "supported" | "voicesLoaded" | "voices">): string {
  if (s.supported === false) return "這個瀏覽器不支援語音播放。請改用最新版 Chrome、Edge 或 Safari。";
  if (s.supported && s.voicesLoaded && s.voices.length === 0) {
    return "這部裝置沒有英文語音。請在系統設定安裝英文語音（例如 Windows：設定 → 時間與語言 → 語音）。";
  }
  return "";
}
