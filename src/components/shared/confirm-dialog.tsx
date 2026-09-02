"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel = "Giữ lại", busy = false, onConfirm, onCancel }: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [busy, onCancel, open]);

  if (!mounted) return null;

  return createPortal(<AnimatePresence>
    {open && <motion.div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#3f302a]/45 p-3 backdrop-blur-md sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} onMouseDown={(event) => event.target === event.currentTarget && !busy && onCancel()}>
      <motion.section className="safe-bottom w-full max-w-sm rounded-[2rem] border border-white/80 bg-[#fff8f0] p-5 text-center shadow-[0_24px_70px_rgba(74,59,52,.3)] sm:p-6" initial={{ y: 50, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 35, scale: 0.97, opacity: 0 }} transition={{ type: "spring", stiffness: 360, damping: 30 }}>
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-red-50 text-[#d66174] shadow-insetSoft"><AlertTriangle className="size-7" /></span>
        <p className="mt-4 font-handwritten text-xl text-[#a56f78]">Chỉ một lần xác nhận</p>
        <h2 id={titleId} className="mt-1 font-display text-2xl font-extrabold">{title}</h2>
        <p id={descriptionId} className="mx-auto mt-2 max-w-xs text-sm leading-6 text-[#806e65]">{description}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button className="secondary-button w-full" type="button" disabled={busy} onClick={onCancel} autoFocus>{cancelLabel}</button>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[#d96578] px-4 py-2 font-bold text-white shadow-soft transition hover:bg-[#c95468] active:scale-[.98] disabled:opacity-60" type="button" disabled={busy} onClick={onConfirm}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : null}{busy ? "Đang xử lý..." : confirmLabel}</button>
        </div>
      </motion.section>
    </motion.div>}
  </AnimatePresence>, document.body);
}
