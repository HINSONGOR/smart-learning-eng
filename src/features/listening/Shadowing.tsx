"use client";

// 跟讀：播放原句 → 錄下自己的讀音 → 重聽比較。
// 錄音只暫存在瀏覽器記憶體，不會上傳或存檔；關閉頁面後會消失。不設自動評分。
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useLearner } from "@/components/providers/LearnerProvider";
import { speechUnavailableReason, useSpeech } from "@/components/providers/SpeechProvider";
import { SpeechNotice } from "@/components/SpeakButton";
import { Button, Card, ErrorMessage, Notice, PageHeader, ProgressBar } from "@/components/ui";
import { api } from "@/lib/apiClient";
import type { PracticeRecord, PracticeSentence } from "@/types";
import { SentenceSetup } from "./SentenceSetup";

function recordingUnavailableReason(): string {
  if (typeof window === "undefined") return "";
  if (!window.isSecureContext) {
    return "瀏覽器只容許在主電腦（localhost）使用咪高峰。用手機或平板經 Wi-Fi 連入時無法錄音，但仍可以播放原句跟讀。";
  }
  if (!navigator.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined") {
    return "這個瀏覽器不支援錄音。請改用最新版 Chrome 或 Edge。";
  }
  return "";
}

export function Shadowing() {
  const { learnerId } = useLearner();
  const speech = useSpeech();
  const speechReason = speechUnavailableReason(speech);
  const [recordReason, setRecordReason] = useState("");
  const [sentences, setSentences] = useState<PracticeSentence[] | null>(null);
  const [index, setIndex] = useState(0);
  const [recordings, setRecordings] = useState<Record<number, string>>({});
  const [practiced, setPracticed] = useState<Set<number>>(new Set());
  const [recordingIndex, setRecordingIndex] = useState<number | null>(null);
  const [micError, setMicError] = useState("");
  const [record, setRecord] = useState<PracticeRecord | null>(null);
  const [saveError, setSaveError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecordReason(recordingUnavailableReason());
    const urls = urlsRef.current;
    return () => {
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const stop = speech.stop;
  useEffect(() => () => stop(), [stop]);

  const current = sentences?.[index];

  async function startRecording() {
    setMicError("");
    speech.stop();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      const target = index;
      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const url = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }));
        urlsRef.current.push(url);
        setRecordings((r) => ({ ...r, [target]: url }));
        setPracticed((p) => new Set(p).add(target));
        setRecordingIndex(null);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecordingIndex(target);
    } catch (e) {
      const name = (e as DOMException).name;
      setMicError(
        name === "NotAllowedError"
          ? "你拒絕了咪高峰權限。如要錄音，請在瀏覽器網址列旁的權限設定中允許使用咪高峰。"
          : name === "NotFoundError"
            ? "找不到咪高峰，請確認已連接咪高峰。"
            : "無法開始錄音。",
      );
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  function go(delta: number) {
    if (recordingIndex !== null) stopRecording();
    speech.stop();
    setIndex((i) => Math.min(Math.max(i + delta, 0), (sentences?.length ?? 1) - 1));
  }

  async function finish() {
    if (!sentences) return;
    setSaveError("");
    try {
      const saved = await api<PracticeRecord>("/api/records", {
        method: "POST",
        json: {
          learnerId,
          kind: "shadowing",
          mode: "shadowing",
          title: "跟讀練習",
          answers: [...practiced].sort((a, b) => a - b).map((i) => ({
            questionId: String(i),
            refId: sentences[i].en,
            prompt: sentences[i].en,
            userAnswer: recordings[i] ? "已錄音跟讀" : "已跟讀",
            correctAnswer: "",
            isCorrect: null,
            explanation: sentences[i].zh,
          })),
        },
      });
      setRecord(saved);
    } catch (e) {
      setSaveError((e as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="跟讀 Shadowing" subtitle="先聽原句，再錄下自己讀一次，然後重聽比較。系統不會自動評分。" />
      <SpeechNotice />
      {recordReason && <Notice tone="warning">🎙️ {recordReason}</Notice>}

      {sentences === null ? (
        <SentenceSetup articleId="" onStart={setSentences} />
      ) : record ? (
        <Card className="space-y-3 text-center">
          <p className="text-2xl font-bold text-teal-700">完成 {record.total} 句跟讀</p>
          <p className="text-sm text-slate-500">✓ 已儲存到練習歷史（錄音不會儲存）</p>
          <div className="flex justify-center gap-2">
            <Button
              onClick={() => {
                setSentences(null);
                setIndex(0);
                setRecordings({});
                setPracticed(new Set());
                setRecord(null);
              }}
            >
              新一輪練習
            </Button>
            <Link href={`/history/${record.id}`} className="self-center text-sm text-teal-700 hover:underline">
              查看紀錄
            </Link>
          </div>
        </Card>
      ) : current ? (
        <>
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-slate-600">
              <span>
                第 {index + 1} / {sentences.length} 句
              </span>
              <span>已練習 {practiced.size} 句</span>
            </div>
            <ProgressBar value={practiced.size} max={sentences.length} />
          </div>

          <Card className="space-y-4">
            <p className="text-xs text-slate-500">{current.sourceLabel}</p>
            <p className="reading-text text-slate-900" lang="en">
              {current.en}
            </p>
            {current.zh && <p className="text-sm text-slate-500">{current.zh}</p>}

            <div className="grid gap-2 sm:grid-cols-3">
              <Button variant="secondary" onClick={() => speech.speak(current.en, `shadow:${index}`)} disabled={Boolean(speechReason)}>
                ① ▶ 聽原句
              </Button>
              {recordingIndex === index ? (
                <Button variant="danger" onClick={stopRecording}>
                  ■ 停止錄音
                </Button>
              ) : (
                <Button onClick={startRecording} disabled={Boolean(recordReason) || recordingIndex !== null}>
                  ② ● 開始錄音
                </Button>
              )}
              <Button variant="secondary" onClick={() => setPracticed((p) => new Set(p).add(index))} disabled={practiced.has(index)}>
                {practiced.has(index) ? "✓ 已練習" : "標記已練習"}
              </Button>
            </div>
            {recordingIndex === index && <p className="text-sm text-rose-600">● 錄音中… 讀完後按「停止錄音」。</p>}
            <ErrorMessage message={micError} />

            {recordings[index] && (
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="mb-2 text-sm font-medium text-slate-700">③ 重聽你的錄音</p>
                <audio controls src={recordings[index]} className="w-full" />
              </div>
            )}
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => go(-1)} disabled={index === 0}>
                ← 上一句
              </Button>
              <Button variant="ghost" onClick={() => go(1)} disabled={index >= sentences.length - 1}>
                下一句 →
              </Button>
            </div>
            <Button onClick={finish} disabled={practiced.size === 0}>
              完成並儲存（{practiced.size} 句）
            </Button>
          </div>
          <ErrorMessage message={saveError} />
        </>
      ) : null}
    </div>
  );
}
