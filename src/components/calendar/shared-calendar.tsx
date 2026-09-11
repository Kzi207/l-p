"use client";

import type { User } from "firebase/auth";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, LoaderCircle, Plus, Trash2, UserRound, Users } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, Timestamp } from "@/lib/database";
import { db } from "@/lib/firebase";
import { sendNotificationInBackground } from "@/lib/notification-client";
import type { CoupleEventDocument } from "@/types/firestore";

type Item = CoupleEventDocument & { id: string };
const keyOf = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(date);
const parseDay = (key: string) => new Date(`${key}T12:00:00+07:00`);
const addDays = (date: Date, count: number) => { const result = new Date(date); result.setDate(result.getDate() + count); return result; };
const mondayOf = (date: Date) => { const result = new Date(date); result.setHours(12, 0, 0, 0); result.setDate(result.getDate() - (result.getDay() || 7) + 1); return result; };
const showTime = (stamp?: Timestamp) => stamp?.toDate ? new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(stamp.toDate()) : "--:--";

export function SharedCalendar({ user, coupleId, authorName }: { user: User; coupleId: string; authorName: string }) {
  const today = useMemo(() => keyOf(new Date()), []);
  const [week, setWeek] = useState(() => mondayOf(new Date()));
  const [selected, setSelected] = useState(today);
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("09:00");
  const [kind, setKind] = useState<"personal" | "together">("personal");
  const [notes, setNotes] = useState("");
  const [remindDays, setRemindDays] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => onSnapshot(query(collection(db, "couples", coupleId, "coupleEvents"), orderBy("eventAt", "asc")), (snap) => {
    setItems(snap.docs.map((entry) => ({ id: entry.id, ...entry.data() } as Item))); setError("");
  }, (reason) => setError(reason.message)), [coupleId]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(week, index)), [week]);
  const eventDays = useMemo(() => new Set(items.filter((item) => item.eventAt?.toDate).map((item) => keyOf(item.eventAt.toDate()))), [items]);
  const selectedItems = useMemo(() => items.filter((item) => item.eventAt?.toDate && keyOf(item.eventAt.toDate()) === selected), [items, selected]);

  function changeWeek(direction: number) { const next = addDays(week, direction * 7); setWeek(next); setSelected(keyOf(next)); }
  function resetToday() { setWeek(mondayOf(new Date())); setSelected(today); }

  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!title.trim()) return setError("Bạn hãy nhập tên lịch.");
    const startsAt = new Date(`${selected}T${start}:00+07:00`); const endsAt = new Date(`${selected}T${end}:00+07:00`);
    if (endsAt <= startsAt) return setError("Giờ kết thúc phải sau giờ bắt đầu.");
    setBusy(true);
    try {
      const ref = await addDoc(collection(db, "couples", coupleId, "coupleEvents"), { title: title.trim(), eventType: "appointment", scheduleType: kind, eventAt: Timestamp.fromDate(startsAt), endAt: Timestamp.fromDate(endsAt), allDay: false, remindDays, notes: notes.trim(), createdAt: serverTimestamp(), creatorId: user.uid, creatorName: authorName });
      void sendNotificationInBackground(user, "/api/notify/phase-one", { kind: "calendar", itemId: ref.id, senderUid: user.uid });
      setTitle(""); setNotes(""); setOpen(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Chưa thể thêm lịch."); } finally { setBusy(false); }
  }

  return <div className="mt-6 space-y-4">
    <section className="soft-card p-4">
      <div className="flex items-center justify-between"><button className="grid size-10 place-items-center rounded-full bg-white/80" onClick={() => changeWeek(-1)} aria-label="Tuần trước"><ChevronLeft /></button><button onClick={resetToday} className="text-center"><b className="font-display capitalize">{new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(parseDay(selected))}</b><span className="block text-xs text-[#a56f78]">Về tuần này</span></button><button className="grid size-10 place-items-center rounded-full bg-white/80" onClick={() => changeWeek(1)} aria-label="Tuần sau"><ChevronRight /></button></div>
      <div className="mt-4 grid grid-cols-7 gap-1">{days.map((day) => { const key = keyOf(day); const active = key === selected; return <button key={key} onClick={() => setSelected(key)} className={`relative rounded-2xl py-2 text-center ${active ? "bg-[#d96578] text-white shadow-soft" : "bg-white/55 text-[#806e65]"}`}><span className="block text-[10px] font-bold">{new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(day).replace("Th ", "T")}</span><b>{day.getDate()}</b>{eventDays.has(key) && <i className={`absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full ${active ? "bg-white" : "bg-[#d96578]"}`} />}</button>; })}</div>
    </section>
    <div className="flex items-center justify-between gap-2 px-1"><div><p className="text-xs font-bold uppercase text-[#b77b86]">Lịch ngày</p><h2 className="font-display text-lg font-extrabold capitalize">{new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long" }).format(parseDay(selected))}</h2></div><button className="primary-button !min-h-11 !rounded-full !px-4" onClick={() => setOpen(!open)}><Plus className="size-4" />Thêm</button></div>
    {open && <form onSubmit={submit} className="soft-card grid gap-3 p-4">
      <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Học, đi làm, hẹn ăn tối..." autoFocus />
      <div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold">Bắt đầu<input className="input-field mt-1" type="time" value={start} onChange={(e) => setStart(e.target.value)} /></label><label className="text-xs font-bold">Kết thúc<input className="input-field mt-1" type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></label></div>
      <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setKind("personal")} className={`rounded-2xl p-3 text-sm font-bold ${kind === "personal" ? "bg-blush/40 text-[#a84f61]" : "bg-white/60"}`}><UserRound className="mx-auto mb-1 size-4" />Lịch của tôi</button><button type="button" onClick={() => setKind("together")} className={`rounded-2xl p-3 text-sm font-bold ${kind === "together" ? "bg-blush/40 text-[#a84f61]" : "bg-white/60"}`}><Users className="mx-auto mb-1 size-4" />Cả hai</button></div>
      <select className="input-field" value={remindDays} onChange={(e) => setRemindDays(Number(e.target.value))}><option value={0}>Nhắc đúng ngày</option><option value={1}>Nhắc trước 1 ngày</option><option value={3}>Nhắc trước 3 ngày</option><option value={7}>Nhắc trước 7 ngày</option></select>
      <textarea className="input-field min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ghi chú (không bắt buộc)" /><button className="primary-button" disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <CalendarDays className="size-4" />}Lưu lịch</button>
    </form>}
    {error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section className="space-y-3">{selectedItems.length === 0 && <div className="soft-card py-9 text-center"><CalendarDays className="mx-auto size-8 text-[#d99aa6]" /><p className="mt-3 font-bold">Ngày này chưa có lịch</p><p className="text-sm text-[#8f7b72]">Hai bạn hãy thêm lịch riêng hoặc kế hoạch chung.</p></div>}{selectedItems.map((item) => <article className="soft-card flex gap-3 p-4" key={item.id}><div className="w-14 shrink-0 text-center"><Clock3 className="mx-auto size-4 text-[#c66f80]" /><b className="block text-sm">{showTime(item.eventAt)}</b>{item.endAt && <span className="text-[11px]">{showTime(item.endAt)}</span>}</div><div className="min-w-0 flex-1 border-l border-blush/60 pl-3"><div className="flex justify-between gap-2"><b>{item.title}</b>{item.creatorId === user.uid && <button onClick={() => deleteDoc(doc(db, "couples", coupleId, "coupleEvents", item.id))} aria-label="Xóa lịch"><Trash2 className="size-4 text-[#bd6c75]" /></button>}</div><p className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#a56f78]">{item.scheduleType === "together" ? <Users className="size-3" /> : <UserRound className="size-3" />}{item.scheduleType === "together" ? "Cả hai" : item.creatorName || "Người thương"}</p>{item.notes && <p className="mt-2 text-sm">{item.notes}</p>}</div></article>)}</section>
  </div>;
}
