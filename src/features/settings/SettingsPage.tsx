"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useLearner } from "@/components/providers/LearnerProvider";
import { speechUnavailableReason, useSpeech } from "@/components/providers/SpeechProvider";
import { Button, Card, ErrorMessage, Field, Notice, PageHeader, Select, TextInput } from "@/components/ui";
import { api } from "@/lib/apiClient";
import { useApi } from "@/lib/useApi";
import type { Learner } from "@/types";

const TEST_SENTENCE = "Hello! This is a test of the English voice.";

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 id={id} className="mb-3 scroll-mt-20 text-lg font-semibold text-slate-900">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </Card>
  );
}

function LearnerSettings() {
  const { learners, reloadSettings } = useLearner();
  const [names, setNames] = useState<Learner[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNames(learners);
  }, [learners]);

  async function save() {
    if (names.some((l) => !l.name.trim())) {
      setError("學習者名稱不可留空");
      return;
    }
    setStatus("saving");
    setError("");
    try {
      await api("/api/settings", { method: "PUT", json: { learners: names } });
      await reloadSettings();
      setStatus("saved");
    } catch (e) {
      setError((e as Error).message);
      setStatus("idle");
    }
  }

  return (
    <Section title="學習者">
      <p className="text-sm text-slate-600">兩位學習者的收藏、待重溫、錯題及成績分開記錄。生字、文章及題目共用。</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {names.map((learner, i) => (
          <Field key={learner.id} label={`學習者 ${i + 1}`}>
            <TextInput
              value={learner.name}
              maxLength={20}
              onChange={(e) => {
                setStatus("idle");
                setNames((list) => list.map((l) => (l.id === learner.id ? { ...l, name: e.target.value } : l)));
              }}
            />
          </Field>
        ))}
      </div>
      <ErrorMessage message={error} />
      <Button onClick={save} disabled={status === "saving"}>
        {status === "saving" ? "儲存中…" : status === "saved" ? "✓ 已儲存" : "儲存名稱"}
      </Button>
    </Section>
  );
}

function SpeechSettings() {
  const speech = useSpeech();
  const reason = speechUnavailableReason(speech);
  return (
    <Section title="語音">
      <p className="text-sm text-slate-600">使用瀏覽器內置語音，免費並在本機運作。設定只儲存在這部裝置，每部裝置可以各自設定。</p>
      {reason ? (
        <Notice tone="warning">{reason}</Notice>
      ) : speech.supported && !speech.voicesLoaded ? (
        <p className="text-sm text-slate-500">正在載入語音清單…</p>
      ) : (
        <>
          <Field label={`英文語音（共 ${speech.voices.length} 個）`}>
            <Select value={speech.voiceURI} onChange={(e) => speech.setVoiceURI(e.target.value)}>
              <option value="">自動選擇（優先美式英語）</option>
              {speech.voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}（{v.lang}）{v.localService ? "" : "・需上網"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={`語速：${speech.rate.toFixed(1)}x`}>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.1}
              value={speech.rate}
              onChange={(e) => speech.setRate(Number(e.target.value))}
              className="w-full accent-teal-600"
            />
          </Field>
          <Button variant="secondary" onClick={() => speech.speak(TEST_SENTENCE, "settings-test")}>
            ▶ 試聽
          </Button>
          <p className="text-xs text-slate-500">標示「需上網」的語音由瀏覽器供應商提供，離線時可能無法使用。</p>
        </>
      )}
    </Section>
  );
}

function GeminiSettings() {
  const { settings, reloadSettings } = useLearner();
  const [error, setError] = useState("");
  if (!settings) return null;

  async function toggle() {
    try {
      setError("");
      await api("/api/settings", { method: "PUT", json: { gemini: { includeSentence: !settings!.gemini.includeSentence } } });
      await reloadSettings();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Section title="Gemini 查字（可選）">
      <p className="text-sm text-slate-600">
        在文章點選生字時，如果老師的生字表及你的生字庫都查不到，系統會用 Gemini 提供中文解釋。不設定也可以正常使用，查不到的字由你自行輸入。
      </p>
      {settings.geminiConfigured ? (
        <Notice tone="success">✓ 已設定 Gemini API key。</Notice>
      ) : (
        <Notice tone="info">
          <p className="font-medium">尚未設定。設定方法：</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5">
            <li>到 Google AI Studio 用 Google 帳戶申請免費 API key。</li>
            <li>
              在專案資料夾建立 <code>.env.local</code> 檔案，寫入一行：<code>GEMINI_API_KEY=你的key</code>
            </li>
            <li>重新啟動系統。</li>
          </ol>
          <p className="mt-2">⚠️ 請不要在該 Google 專案啟用付款（Billing），這樣便不會產生費用；超出免費額度時查詢只會暫時失敗。</p>
        </Notice>
      )}
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={settings.gemini.includeSentence} onChange={toggle} className="mt-1 h-4 w-4 accent-teal-600" />
        <span>
          查詢時一併傳送文章原句（解釋會更準確）
          <span className="block text-xs text-slate-500">
            關閉後只會傳送你選取的字詞。免費版 Gemini 傳送的內容可能被 Google 用於改進產品。
          </span>
        </span>
      </label>
      <ErrorMessage message={error} />
    </Section>
  );
}

function DemoDataSettings() {
  const { data, reload } = useApi<{ vocabulary: number; resources: number }>("/api/demo-data");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const total = (data?.vocabulary ?? 0) + (data?.resources ?? 0);

  async function remove() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ vocabulary: number; resources: number }>("/api/demo-data", { method: "DELETE" });
      setMessage(`已刪除 ${result.vocabulary} 個示範生字及 ${result.resources} 個示範資源。`);
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <Section title="示範資料">
      <p className="text-sm text-slate-600">
        Daily 及 Workplace 的少量示範生字和示範網址只供試用，介面上標示「示範資料」。IELTS 沒有示範內容。
      </p>
      {data && (
        <p className="text-sm text-slate-700">
          目前有 {data.vocabulary} 個示範生字、{data.resources} 個示範資源。
        </p>
      )}
      {message && <Notice tone="success">{message}</Notice>}
      <ErrorMessage message={error} />
      <Button variant="danger" onClick={() => setConfirming(true)} disabled={total === 0}>
        刪除全部示範資料
      </Button>
      <ConfirmDialog
        open={confirming}
        title="刪除全部示範資料？"
        message="只會刪除標示為「示範資料」的生字及資源，你自己加入的資料不受影響。刪除後無法還原。"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setConfirming(false)}
      />
    </Section>
  );
}

function BackupInfo() {
  return (
    <Section id="backup" title="資料儲存及備份">
      <Notice tone="warning">所有資料只儲存在這部電腦，不是雲端備份。電腦損壞或誤刪檔案時，資料可能會遺失。</Notice>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
        <li>
          資料位置：專案資料夾內的 <code>data</code> 資料夾（例如 <code>C:\SMARTLEARNINGENG\data</code>）。
        </li>
        <li>
          <strong>備份方法：</strong>建議每星期把整個 <code>data</code> 資料夾複製到 USB 或另一個位置。
        </li>
        <li>
          <strong>還原方法：</strong>先停止系統，再用備份的 <code>data</code> 資料夾覆蓋現有的，然後重新啟動。
        </li>
        <li>
          每次儲存時，系統會把上一個版本保留為 <code>.bak</code> 檔案（例如 <code>vocabulary.json.bak</code>），可以用作緊急還原。
        </li>
        <li>請不要在系統運行時手動修改 JSON 檔案。</li>
      </ul>
    </Section>
  );
}

export function SettingsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="設定 Settings" />
      <LearnerSettings />
      <SpeechSettings />
      <GeminiSettings />
      <DemoDataSettings />
      <BackupInfo />
    </div>
  );
}
