"use client";

// 刪除等不可還原操作前的確認視窗
import { useEffect, useRef } from "react";
import { Button } from "./ui";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "確認刪除",
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      className="m-auto w-[min(92vw,26rem)] rounded-xl p-0 shadow-xl backdrop:bg-slate-900/40"
    >
      <div className="p-5">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <div className="mt-2 text-sm text-slate-600">{message}</div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            取消
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? "處理中…" : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
