"use client";

import type { User } from "firebase/auth";
import { CalendarDays, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { collection, doc, runTransaction, serverTimestamp, Timestamp, updateDoc } from "@/lib/database";
import { db } from "@/lib/firebase";
import { sendNotificationInBackground } from "@/lib/notification-client";
import { readDate, readTime } from "./calendar-input";
import type { CoupleEventDocument } from "@/types/firestore";

type Draft = { id: string; title: string; date: string; start: string; end: string; kind: "personal" | "together"; notes: string; remindDays: number };

function newDraft(date: string): Draft {
  return { id: doc(collection(db, "drafts")).id, title: "", date, start: "08:00", end: "09:00", kind: "personal", notes: "", remindDays: 0 };
}

export type EditableCalendarEvent = CoupleEventDocument & { id: string };

/** Convert Timestamp to "HH:MM" in Vietnam timezone */
function stampToTime(stamp?: Timestamp): string {
  if (!stamp?.toDate) return "08:00";
  const d = stamp.toDate();
  const fmt = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false });
  return fmt.format(d).replace(":", ":");
}

/** Convert Timestamp to "dd/mm/yyyy" in Vietnam timezone */
function stampToDateString(stamp?: Timestamp): string {
  if (!stamp?.toDate) return "";
  const d = stamp.toDate();
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export function CalendarEventModal({ user, coupleId, authorName, initialDate, onClose, onSaved, editItem }: {
  user: User; coupleId: string; authorName: string; initialDate: string; onClose: () => void; onSaved: (date: string) => void;
  editItem?: EditableCalendarEvent;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const saving = useRef(false);
  const isEdit = !!editItem;

  const [drafts, setDrafts] = useState<Draft[]>(() => {
    if (editItem) {
      return [{
        id: editItem.id,
        title: editItem.title,
        date: stampToDateString(editItem.eventAt),
        start: stampToTime(editItem.eventAt),
        end: stampToTime(editItem.endAt),
        kind: (editItem.scheduleType as Draft["kind"]) ?? "personal",
        notes: editItem.notes ?? "",
        remindDays: editItem.remindDays ?? 0,
      }];
    }
    return [newDraft(initialDate.split("-").reverse().join("/"))];
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, []);

  function update(id: string, patch: Partial<Draft>) {
    setDrafts((current) => current.map((draft) => draft.id === id ? { ...draft, ...patch } : draft));
  }

  function addRow() {
    const previous = drafts[drafts.length - 1];
    const next = { ...newDraft(previous.date), kind: previous.kind };
    setDrafts((current) => [...current, next]);
    requestAnimationFrame(() => document.getElementById(`event-title-${next.id}`)?.focus());
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving.current) return;
    setError("");
    const prepared: { draft: Draft; date: string; startsAt: Date; endsAt: Date }[] = [];
    for (let index = 0; index < drafts.length; index += 1) {
      const draft = drafts[index];
      const date = readDate(draft.date); const start = readTime(draft.start); const end = readTime(draft.end);
      const prefix = `Lịch ${index + 1}: `;
      if (!draft.title.trim()) return setError(prefix + "hãy nhập tên lịch.");
      if (!date) return setError(prefix + "ngày không hợp lệ. Nhập dd/mm/yyyy.");
      if (!start || !end) return setError(prefix + "giờ không hợp lệ. Nhập 08:30 hoặc 0830.");
      const startsAt = new Date(`${date}T${start}:00+07:00`); const endsAt = new Date(`${date}T${end}:00+07:00`);
      if (endsAt <= startsAt) return setError(prefix + "giờ kết thúc phải sau giờ bắt đầu trong cùng ngày.");
      prepared.push({ draft, date, startsAt, endsAt });
    }

    saving.current = true; setBusy(true);
    try {
      if (isEdit && editItem) {
        const { draft, date, startsAt, endsAt } = prepared[0];
        await updateDoc(doc(db, "couples", coupleId, "coupleEvents", editItem.id), {
          title: draft.title.trim(),
          scheduleType: draft.kind,
          eventAt: Timestamp.fromDate(startsAt),
          endAt: Timestamp.fromDate(endsAt),
          allDay: false,
          remindDays: draft.remindDays,
          notes: draft.notes.trim(),
        });
        onSaved(date);
      } else {
        // Stable draft IDs also prevent duplicate events if a timed-out save is retried.
        await runTransaction(db, async (transaction) => {
          for (const { draft, startsAt, endsAt } of prepared) {
            transaction.set(doc(db, "couples", coupleId, "coupleEvents", draft.id), {
              title: draft.title.trim(), eventType: "appointment", scheduleType: draft.kind,
              eventAt: Timestamp.fromDate(startsAt), endAt: Timestamp.fromDate(endsAt), allDay: false,
              remindDays: draft.remindDays, notes: draft.notes.trim(), createdAt: serverTimestamp(), creatorId: user.uid, creatorName: authorName,
            });
          }
        });
        for (const { draft } of prepared) void sendNotificationInBackground(user, "/api/notify/phase-one", { kind: "calendar", itemId: draft.id, senderUid: user.uid });
        onSaved(prepared[0].date);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chưa thể lưu lịch. Các lịch đã nhập vẫn được giữ để thử lại.");
    } finally { saving.current = false; setBusy(false); }
  }

  return <dialog ref={dialog} aria-labelledby="calendar-modal-title" onCancel={(event) => { event.preventDefault(); if (!saving.current) onClose(); }} className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-[1.75rem] bg-[#fff8f0] p-0 text-[#58483f] shadow-xl backdrop:bg-black/35 backdrop:backdrop-blur-sm">
    <form onSubmit={submit} className="flex max-h-[90dvh] flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-blush/30 px-5 py-4">
        <div>
          <h2 id="calendar-modal-title" className="flex items-center gap-2 font-display text-xl font-extrabold">
            {isEdit ? <Pencil className="size-5 text-[#d17485]" /> : <CalendarDays className="size-5 text-[#d17485]" />}
            {isEdit ? "Chỉnh sửa lịch" : "Thêm lịch"}
          </h2>
          <p className="text-xs text-[#8f7b72]">{isEdit ? "Cập nhật thông tin lịch của bạn." : "Nhập nhiều lịch, lưu một lần."}</p>
        </div>
        <button type="button" disabled={busy} onClick={onClose} aria-label="Đóng popup" className="grid size-10 place-items-center rounded-full bg-white/80"><X className="size-5" /></button>
      </header>

      <div className="min-h-0 space-y-3 overflow-y-auto overscroll-contain p-4">
        <p className="text-xs leading-5 text-[#8f7b72]">Ngày: dd/mm/yyyy. Giờ Việt Nam: 08:30 hoặc 0830. Dùng Tab để chuyển ô.</p>
        {drafts.map((draft, index) => (
          <fieldset key={draft.id} disabled={busy} className="grid min-w-0 gap-3 rounded-2xl border border-blush/40 bg-white/55 p-3">
            <legend className="px-1 text-sm font-bold text-[#a84f61]">{isEdit ? "Chỉnh sửa lịch" : `Lịch ${index + 1}`}</legend>
            <div className="flex items-end gap-2">
              <label className="min-w-0 flex-1 text-xs font-bold">
                Tên lịch
                <input id={`event-title-${draft.id}`} className="input-field mt-1" value={draft.title} onChange={(e) => update(draft.id, { title: e.target.value })} placeholder="Học, đi làm, hẹn ăn tối..." autoFocus={index === 0} required />
              </label>
              {!isEdit && drafts.length > 1 && (
                <button type="button" className="mb-1 grid size-10 shrink-0 place-items-center rounded-full text-[#bd6c75]" onClick={() => setDrafts((current) => current.filter((item) => item.id !== draft.id))} aria-label={`Bỏ lịch ${index + 1}`}>
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
            <label className="text-xs font-bold">
              Ngày
              <input className="input-field mt-1" value={draft.date} placeholder="dd/mm/yyyy" onChange={(e) => update(draft.id, { date: e.target.value })} onBlur={() => { const date = readDate(draft.date); if (date) update(draft.id, { date: date.split("-").reverse().join("/") }); }} required />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-bold">Bắt đầu<input className="input-field mt-1" value={draft.start} onChange={(e) => update(draft.id, { start: e.target.value })} onBlur={() => { const time = readTime(draft.start); if (time) update(draft.id, { start: time }); }} placeholder="08:00" required /></label>
              <label className="text-xs font-bold">Kết thúc<input className="input-field mt-1" value={draft.end} onChange={(e) => update(draft.id, { end: e.target.value })} onBlur={() => { const time = readTime(draft.end); if (time) update(draft.id, { end: time }); }} placeholder="09:00" required /></label>
            </div>
            <label className="text-xs font-bold">
              Dành cho
              <select className="input-field mt-1" value={draft.kind} onChange={(e) => update(draft.id, { kind: e.target.value as Draft["kind"] })}>
                <option value="personal">Lịch của tôi</option>
                <option value="together">Cả hai</option>
              </select>
            </label>
            <details open={isEdit && !!draft.notes}>
              <summary className="cursor-pointer text-sm font-semibold text-[#a56f78]">Ghi chú và nhắc lịch</summary>
              <div className="mt-3 grid gap-3">
                <label className="text-xs font-bold">Nhắc lịch<select className="input-field mt-1" value={draft.remindDays} onChange={(e) => update(draft.id, { remindDays: Number(e.target.value) })}><option value={0}>Nhắc đúng ngày</option><option value={1}>Nhắc trước 1 ngày</option><option value={3}>Nhắc trước 3 ngày</option><option value={7}>Nhắc trước 7 ngày</option></select></label>
                <label className="text-xs font-bold">Ghi chú<textarea className="input-field mt-1 min-h-20" value={draft.notes} onChange={(e) => update(draft.id, { notes: e.target.value })} placeholder="Không bắt buộc" /></label>
              </div>
            </details>
          </fieldset>
        ))}
        {!isEdit && (
          <button type="button" disabled={busy || drafts.length >= 20} onClick={addRow} className="secondary-button w-full">
            <Plus className="size-4" />{drafts.length >= 20 ? "Tối đa 20 lịch mỗi lần" : "Thêm một lịch nữa"}
          </button>
        )}
      </div>

      <footer className="shrink-0 space-y-3 border-t border-blush/30 bg-[#fff8f0] p-4">
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex gap-2">
          <button type="button" disabled={busy} onClick={onClose} className="secondary-button">Đóng</button>
          <button type="submit" disabled={busy} className="primary-button flex-1">
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : isEdit ? <Pencil className="size-4" /> : <CalendarDays className="size-4" />}
            {busy ? "Đang lưu..." : isEdit ? "Cập nhật lịch" : `Lưu ${drafts.length} lịch`}
          </button>
        </div>
      </footer>
    </form>
  </dialog>;
}
