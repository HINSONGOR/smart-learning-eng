"use client";

import { speechUnavailableReason, useSpeech } from "./providers/SpeechProvider";

/** 播放單字或句子的按鈕；語音不可用時停用並以提示說明原因 */
export function SpeakButton({
  text,
  label = "播放讀音",
  size = "md",
  className = "",
}: {
  text: string;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const speech = useSpeech();
  const reason = speechUnavailableReason(speech);
  const key = `single:${text}`;
  const playing = speech.activeKey === key && speech.status !== "idle";
  const disabled = !text.trim() || Boolean(reason) || speech.supported === null;
  const dimension = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  return (
    <button
      type="button"
      title={reason || label}
      aria-label={playing ? "停止播放" : label}
      disabled={disabled}
      onClick={() => (playing ? speech.stop() : speech.speak(text, key))}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${dimension} ${
        playing
          ? "border-teal-600 bg-teal-600 text-white"
          : "border-slate-300 bg-white text-teal-700 hover:bg-teal-50"
      } ${className}`}
    >
      {playing ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" stroke="none" />
          <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

/** 語音不可用時在頁面頂部顯示的提示 */
export function SpeechNotice() {
  const speech = useSpeech();
  const reason = speechUnavailableReason(speech);
  if (!reason) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      🔈 {reason}其他功能仍可正常使用。
    </div>
  );
}
