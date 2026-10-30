"use client";

// 雲端版登入：揀名字 → 輸入 6 位數字 PIN
import { useState } from "react";
import { useLearner } from "./providers/LearnerProvider";
import { Button, ErrorMessage } from "./ui";

export function LoginScreen() {
  const { learners, login } = useLearner();
  const [selected, setSelected] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const learner = learners.find((l) => l.id === selected);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!/^\d{6}$/.test(pin)) {
      setError("請輸入 6 位數字 PIN");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await login(selected, pin);
    } catch (e) {
      setError((e as Error).message);
      setPin("");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <p className="text-center text-xl font-bold text-teal-700">Smart English</p>
        <p className="mb-6 text-center text-sm text-slate-500">免費英文學習系統</p>

        {!learner ? (
          <>
            <p className="mb-3 text-center font-medium text-slate-800">你是誰？</p>
            {learners.length === 0 ? (
              <p className="text-center text-sm text-slate-500">載入中…</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {learners.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setSelected(l.id)}
                    className="rounded-xl border-2 border-slate-200 py-6 text-lg font-semibold text-slate-800 transition-colors hover:border-teal-500 hover:bg-teal-50"
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-center font-medium text-slate-800">{learner.name}，請輸入 PIN</p>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              pattern="\d*"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              autoFocus
              aria-label="6 位數字 PIN"
              className="w-full rounded-lg border-2 border-slate-300 px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-teal-600 focus:outline-none"
            />
            <ErrorMessage message={error} />
            <Button type="submit" className="w-full py-3" disabled={busy || pin.length !== 6}>
              {busy ? "登入中…" : "登入"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setSelected("");
                setPin("");
                setError("");
              }}
              className="w-full text-sm text-slate-500 hover:text-slate-800"
            >
              ← 揀其他人
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
