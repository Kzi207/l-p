"use client";

import type { User } from "firebase/auth";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Pencil, Plus, Trash2, UserRound, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, Timestamp } from "@/lib/database";
import { db } from "@/lib/firebase";
import { CalendarEventModal, type EditableCalendarEvent } from "@/components/calendar/calendar-event-modal";
import type { CoupleEventDocument } from "@/types/firestore";

type Item = CoupleEventDocument & { id: string };
const timeZone = "Asia/Ho_Chi_Minh";
const keyOf = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
const parseDay = (key: string) => new Date(`${key}T12:00:00+07:00`);
const addDays = (date: Date, count: number) => new Date(date.getTime() + count * 86400000);
const mondayOf = (date: Date) => { const day = parseDay(keyOf(date)); return addDays(day, 1 - (day.getUTCDay() || 7)); };
const displayDate = (key: string) => key.split("-").reverse().join("/");
const showTime = (stamp?: Timestamp) => stamp?.toDate ? new Intl.DateTimeFormat("vi-VN", { timeZone, hour: "2-digit", minute: "2-digit" }).format(stamp.toDate()) : "--:--";

type ModalState =
  | { mode: "create"; date: string }
  | { mode: "edit"; item: EditableCalendarEvent };

export function SharedCalendar({ user, coupleId, authorName }: { user: User; coupleId: string; authorName: string }) {
  const today = keyOf(new Date());
  const [week, setWeek] = useState(() => mondayOf(new Date()));
  const [selected, setSelected] = useState(today);
  const [items, setItems] = useState<Item[]>([]);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [error, setError] = useState("");

  useEffect(() => onSnapshot(query(collection(db, "couples", coupleId, "coupleEvents"), orderBy("eventAt", "asc")), (snap) => {
    setItems(snap.docs.map((entry) => ({ id: entry.id, ...entry.data() } as Item)));
  }, (reason) => setError(reason.message)), [coupleId]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = addDays(week, index); const key = keyOf(date);
    return { date, key, events: items.filter((item) => item.eventAt?.toDate && keyOf(item.eventAt.toDate()) === key) };
  }), [week, items]);

  const count = days.reduce((total, day) => total + day.events.length, 0);
  const scheduledDays = days.filter((day) => day.events.length > 0);

  function changeWeek(direction: number) {
    const next = addDays(week, direction * 7);
    setWeek(next); setSelected(keyOf(next));
  }
  function selectDay(key: string) {
    setSelected(key);
    document.getElementById(`calendar-day-${key}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function openCreate(key: string) { setModal({ mode: "create", date: key }); }
  function openEdit(item: Item) { setModal({ mode: "edit", item }); }

  async function removeItem(id: string) {
    try { await deleteDoc(doc(db, "couples", coupleId, "coupleEvents", id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Chưa thể xóa lịch."); }
  }

  function handleSaved(date: string) {
    setWeek(mondayOf(parseDay(date)));
    setSelected(date);
    setModal(null);
  }

  return <div className="mt-6 space-y-4">
    <section className="soft-card p-4">
      <div className="flex items-center justify-between gap-2">
        <button type="button" className="grid size-10 shrink-0 place-items-center rounded-full bg-white/80" onClick={() => changeWeek(-1)} aria-label="Tuần trước"><ChevronLeft /></button>
        <button type="button" className="text-center" onClick={() => { setWeek(mondayOf(new Date())); setSelected(today); }}>
          <h2 className="font-display font-extrabold capitalize">{new Intl.DateTimeFormat("vi-VN", { timeZone, month: "long", year: "numeric" }).format(parseDay(selected))}</h2>
          <span className="block text-xs text-[#a56f78]">Về tuần này</span>
        </button>
        <button type="button" className="grid size-10 shrink-0 place-items-center rounded-full bg-white/80" onClick={() => changeWeek(1)} aria-label="Tuần sau"><ChevronRight /></button>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1" aria-label="Chọn ngày trong tuần">
        {days.map(({ key, events }, index) => (
          <button key={key} type="button" onClick={() => selectDay(key)} aria-pressed={key === selected} aria-current={key === today ? "date" : undefined} aria-label={`${displayDate(key)}, ${events.length} lịch`} className={`relative min-w-0 rounded-2xl px-1 py-2.5 text-center ${key === selected ? "bg-[#d96578] text-white shadow-soft" : "bg-white/55 text-[#806e65]"}`}>
            <span className="block text-[10px] font-bold">{index === 6 ? "CN" : `Thứ ${index + 2}`}</span>
            <b className="block text-lg leading-6">{Number(key.slice(-2))}</b>
            {events.length > 0 && <span className={`absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full ${key === selected ? "bg-white" : "bg-[#d96578]"}`} />}
          </button>
        ))}
      </div>
    </section>

    <div className="flex items-center justify-between gap-2 px-1">
      <div>
        <p className="text-xs font-bold uppercase text-[#b77b86]">Lịch tuần · {count} lịch</p>
        <h2 className="font-display font-extrabold">{displayDate(days[0].key)} – {displayDate(days[6].key)}</h2>
      </div>
      <button type="button" className="primary-button !min-h-11 !rounded-full !px-4" onClick={() => openCreate(selected)}><Plus className="size-4" />Thêm</button>
    </div>

    {modal && (
      <CalendarEventModal
        user={user}
        coupleId={coupleId}
        authorName={authorName}
        initialDate={modal.mode === "create" ? modal.date : keyOf(modal.item.eventAt?.toDate?.() ?? new Date())}
        editItem={modal.mode === "edit" ? modal.item : undefined}
        onClose={() => setModal(null)}
        onSaved={handleSaved}
      />
    )}

    {error && <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

    {scheduledDays.length === 0 && (
      <div className="soft-card px-4 py-9 text-center">
        <CalendarDays className="mx-auto size-8 text-[#d99aa6]" />
        <p className="mt-3 font-bold">Tuần này chưa có lịch</p>
        <p className="text-sm text-[#8f7b72]">Chọn ngày trên thanh rồi nhấn Thêm để tạo lịch.</p>
      </div>
    )}

    <section aria-label="Các ngày có lịch trong tuần" className="space-y-3">
      {scheduledDays.map(({ date, key, events }) => (
        <section id={`calendar-day-${key}`} key={key} className={`soft-card scroll-mt-4 p-4 ${key === selected ? "ring-2 ring-[#d96578]/40" : ""}`}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="font-display font-extrabold capitalize">{new Intl.DateTimeFormat("vi-VN", { timeZone, weekday: "long", day: "2-digit", month: "2-digit" }).format(date)}</h3>
              {key === today && <span className="text-xs font-bold text-[#c66f80]">Hôm nay</span>}
            </div>
            <button type="button" onClick={() => openCreate(key)} className="grid size-10 shrink-0 place-items-center rounded-full bg-white/80 text-[#a84f61]" aria-label={`Thêm lịch ngày ${displayDate(key)}`}><Plus className="size-4" /></button>
          </div>
          {events.length === 0 ? (
            <p className="text-sm text-[#8f7b72]">Chưa có lịch</p>
          ) : (
            <div className="space-y-3">
              {events.map((item) => (
                <article className="flex gap-3 rounded-2xl bg-white/60 p-3" key={item.id}>
                  <div className="w-14 shrink-0 text-center">
                    <Clock3 className="mx-auto size-4 text-[#c66f80]" />
                    <b className="block text-sm">{item.allDay ? "Cả ngày" : showTime(item.eventAt)}</b>
                    {!item.allDay && item.endAt && <span className="text-[11px]">{showTime(item.endAt)}</span>}
                  </div>
                  <div className="min-w-0 flex-1 border-l border-blush/60 pl-3">
                    <div className="flex justify-between gap-2">
                      <b className="break-words">{item.title}</b>
                      <div className="flex shrink-0 gap-1">
                        {item.creatorId === user.uid && (
                          <button type="button" className="grid size-8 place-items-center rounded-full text-[#7a6a75] hover:bg-blush/20" onClick={() => openEdit(item)} aria-label={`Chỉnh sửa lịch ${item.title}`}><Pencil className="size-3.5" /></button>
                        )}
                        {item.creatorId === user.uid && (
                          <button type="button" className="grid size-8 place-items-center" onClick={() => void removeItem(item.id)} aria-label={`Xóa lịch ${item.title}`}><Trash2 className="size-4 text-[#bd6c75]" /></button>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-[#a56f78]">
                      {item.scheduleType === "together" ? <Users className="size-3" /> : <UserRound className="size-3" />}
                      {item.scheduleType === "together" ? "Cả hai" : item.creatorName || "Người thương"}
                    </p>
                    {item.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.notes}</p>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ))}
    </section>
  </div>;
}
