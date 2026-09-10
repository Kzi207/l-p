"use client";
/* eslint-disable @next/next/no-img-element */

import type { User } from "firebase/auth";
import { CalendarDays, Clock3, Heart, ImagePlus, LoaderCircle, NotebookPen, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, Timestamp } from "@/lib/database";
import { BottomNav } from "@/components/layout/bottom-nav";
import { LoginScreen } from "@/components/auth/login-screen";
import { PairingScreen } from "@/components/pairing/pairing-screen";
import { useAuth } from "@/components/providers/auth-provider";
import { useCoupleSpace } from "@/components/providers/couple-provider";
import { uploadMediaToCloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/firebase";
import { sendNotificationInBackground } from "@/lib/notification-client";
import type { CoupleEventDocument, JournalEntryDocument, TimeCapsuleDocument } from "@/types/firestore";

type Feature = "journal" | "calendar" | "timecapsule";
type WithId<T> = T & { id: string };
const moods = ["🥰", "😊", "😌", "🥺", "😢", "😴", "❤️"];

const featureMeta = {
  journal: { title: "Nhật ký chung", eyebrow: "Hôm nay của hai đứa", icon: NotebookPen },
  calendar: { title: "Lịch đôi", eyebrow: "Những ngày mình mong chờ", icon: CalendarDays },
  timecapsule: { title: "Hộp thư tương lai", eyebrow: "Gửi yêu thương đến mai sau", icon: Clock3 },
};

function dayKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(date);
}

function displayDate(timestamp?: Timestamp) {
  if (!timestamp?.toDate) return "Đang cập nhật";
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp.toDate());
}

export function PhaseOneScreen({ feature }: { feature: Feature }) {
  const { user } = useAuth();
  const { couple, profile, loading } = useCoupleSpace();
  if (!user) return <LoginScreen />;
  if (loading) return <main className="grid min-h-dvh place-items-center"><Heart className="size-9 animate-pulse fill-blush text-blush" /></main>;
  if (!couple) return <PairingScreen user={user} />;
  return <FeatureContent feature={feature} user={user} coupleId={couple.id} authorName={profile?.nickname || profile?.displayName || user.displayName || "Người thương"} />;
}

function FeatureContent({ feature, user, coupleId, authorName }: { feature: Feature; user: User; coupleId: string; authorName: string }) {
  const meta = featureMeta[feature];
  const Icon = meta.icon;
  return <main className="min-h-dvh px-4 pb-32 pt-7 sm:px-6"><section className="app-frame">
    <header className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-blush/45 shadow-soft"><Icon className="size-6 text-[#c66f80]" /></span><div><p className="font-handwritten text-xl text-[#a56f78]">{meta.eyebrow}</p><h1 className="font-display text-3xl font-extrabold">{meta.title}</h1></div></header>
    <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-white/65 p-2 shadow-soft">
      {(["journal", "calendar", "timecapsule"] as Feature[]).map((item) => <Link key={item} href={item === "timecapsule" ? "/timecapsule" : `/${item}`} className={`rounded-xl px-2 py-2 text-center text-xs font-bold ${feature === item ? "bg-[#d96578] text-white" : "text-[#806e65]"}`}>{featureMeta[item].title}</Link>)}
    </div>
    {feature === "journal" && <Journal user={user} coupleId={coupleId} authorName={authorName} />}
    {feature === "calendar" && <CoupleCalendar user={user} coupleId={coupleId} authorName={authorName} />}
    {feature === "timecapsule" && <TimeCapsules user={user} coupleId={coupleId} authorName={authorName} />}
  </section><BottomNav /></main>;
}

function Journal({ user, coupleId, authorName }: { user: User; coupleId: string; authorName: string }) {
  const [items, setItems] = useState<Array<WithId<JournalEntryDocument>>>([]);
  const [text, setText] = useState(""); const [mood, setMood] = useState("🥰"); const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => onSnapshot(query(collection(db, "couples", coupleId, "journalEntries"), orderBy("createdAt", "desc")), (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WithId<JournalEntryDocument>))), (e) => setError(e.message)), [coupleId]);
  async function submit(event: FormEvent) { event.preventDefault(); if (!text.trim() && !file) return; setBusy(true); setError(""); try { const media = file ? await uploadMediaToCloudinary(file, "love-days/journal") : null; const ref = await addDoc(collection(db, "couples", coupleId, "journalEntries"), { text: text.trim(), mood, imageUrl: media?.secure_url || "", cloudinaryPublicId: media?.public_id || "", entryDate: dayKey(), createdAt: serverTimestamp(), authorId: user.uid, authorName }); sendNotificationInBackground(user, "/api/notify/phase-one", { kind: "journal", itemId: ref.id, senderUid: user.uid }); setText(""); setFile(null); } catch (e) { setError(e instanceof Error ? e.message : "Chưa thể lưu nhật ký."); } finally { setBusy(false); } }
  return <div className="mt-6"><form onSubmit={submit} className="soft-card p-4"><div className="flex gap-2">{moods.map((item) => <button type="button" key={item} onClick={() => setMood(item)} className={`grid size-9 place-items-center rounded-full ${mood === item ? "bg-blush ring-2 ring-[#d96578]" : "bg-white/70"}`}>{item}</button>)}</div><textarea className="input-field mt-3 min-h-24" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Hôm nay hai đứa thế nào?" /><div className="mt-3 flex items-center gap-3"><label className="secondary-button cursor-pointer"><ImagePlus className="size-4" />{file ? "Đã chọn ảnh" : "Thêm ảnh"}<input className="hidden" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label><button className="primary-button ml-auto" disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}Lưu hôm nay</button></div>{error && <p className="mt-2 text-sm text-red-700">{error}</p>}</form><div className="mt-5 space-y-3">{items.map((item) => <article className="soft-card p-4" key={item.id}><div className="flex items-start gap-3"><span className="text-3xl">{item.mood}</span><div className="min-w-0 flex-1"><p className="text-sm font-bold">{item.authorName} · {item.entryDate}</p><p className="mt-1 whitespace-pre-wrap text-sm text-[#695a53]">{item.text}</p></div>{item.authorId === user.uid && <button onClick={() => deleteDoc(doc(db, "couples", coupleId, "journalEntries", item.id))} className="text-[#b88]"><Trash2 className="size-4" /></button>}</div>{item.imageUrl && <img src={item.imageUrl} alt="Ảnh nhật ký" className="mt-3 max-h-96 w-full rounded-2xl object-cover" />}</article>)}</div></div>;
}

function CoupleCalendar({ user, coupleId, authorName }: { user: User; coupleId: string; authorName: string }) {
  const [items, setItems] = useState<Array<WithId<CoupleEventDocument>>>([]); const [title, setTitle] = useState(""); const [eventAt, setEventAt] = useState(""); const [eventType, setEventType] = useState<CoupleEventDocument["eventType"]>("date"); const [notes, setNotes] = useState(""); const [remindDays, setRemindDays] = useState(1); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => onSnapshot(query(collection(db, "couples", coupleId, "coupleEvents"), orderBy("eventAt", "asc")), (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WithId<CoupleEventDocument>))), (e) => setError(e.message)), [coupleId]);
  async function submit(event: FormEvent) { event.preventDefault(); if (!title.trim() || !eventAt) return; setBusy(true); try { const ref = await addDoc(collection(db, "couples", coupleId, "coupleEvents"), { title: title.trim(), eventType, eventAt: Timestamp.fromDate(new Date(eventAt)), remindDays, notes: notes.trim(), createdAt: serverTimestamp(), creatorId: user.uid, creatorName: authorName }); sendNotificationInBackground(user, "/api/notify/phase-one", { kind: "calendar", itemId: ref.id, senderUid: user.uid }); setTitle(""); setEventAt(""); setNotes(""); } catch (e) { setError(e instanceof Error ? e.message : "Chưa thể thêm lịch."); } finally { setBusy(false); } }
  return <div className="mt-6"><form onSubmit={submit} className="soft-card grid gap-3 p-4 sm:grid-cols-2"><input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên cuộc hẹn hoặc ngày đặc biệt" /><input className="input-field" type="datetime-local" value={eventAt} onChange={(e) => setEventAt(e.target.value)} /><select className="input-field" value={eventType} onChange={(e) => setEventType(e.target.value as CoupleEventDocument["eventType"])}><option value="date">Hẹn hò</option><option value="birthday">Sinh nhật</option><option value="anniversary">Kỷ niệm</option><option value="appointment">Cuộc hẹn</option></select><select className="input-field" value={remindDays} onChange={(e) => setRemindDays(Number(e.target.value))}><option value={0}>Nhắc đúng ngày</option><option value={1}>Nhắc trước 1 ngày</option><option value={3}>Nhắc trước 3 ngày</option><option value={7}>Nhắc trước 7 ngày</option></select><textarea className="input-field min-h-20 sm:col-span-2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ghi chú..." /><button className="primary-button sm:col-span-2" disabled={busy}>{busy && <LoaderCircle className="size-4 animate-spin" />}Thêm vào lịch đôi</button>{error && <p className="text-sm text-red-700 sm:col-span-2">{error}</p>}</form><div className="mt-5 space-y-3">{items.map((item) => <article className="soft-card flex gap-3 p-4" key={item.id}><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blush/35"><CalendarDays className="size-5" /></span><div className="min-w-0 flex-1"><p className="font-bold">{item.title}</p><p className="text-sm text-[#9b6b74]">{displayDate(item.eventAt)} · nhắc trước {item.remindDays} ngày</p>{item.notes && <p className="mt-1 text-sm text-[#695a53]">{item.notes}</p>}</div>{item.creatorId === user.uid && <button onClick={() => deleteDoc(doc(db, "couples", coupleId, "coupleEvents", item.id))}><Trash2 className="size-4 text-[#b88]" /></button>}</article>)}</div></div>;
}

function TimeCapsules({ user, coupleId, authorName }: { user: User; coupleId: string; authorName: string }) {
  const [items, setItems] = useState<Array<WithId<TimeCapsuleDocument>>>([]); const [title, setTitle] = useState(""); const [message, setMessage] = useState(""); const [openDate, setOpenDate] = useState(""); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => onSnapshot(query(collection(db, "couples", coupleId, "timeCapsules"), orderBy("openDate", "asc")), (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WithId<TimeCapsuleDocument>))), (e) => setError(e.message)), [coupleId]);
  const minDate = useMemo(() => dayKey(new Date(Date.now() + 86400000)), []);
  async function submit(event: FormEvent) { event.preventDefault(); if (!title.trim() || !message.trim() || !openDate) return; setBusy(true); try { const media = file ? await uploadMediaToCloudinary(file, "love-days/time-capsules") : null; const ref = await addDoc(collection(db, "couples", coupleId, "timeCapsules"), { title: title.trim(), message: message.trim(), mediaUrl: media?.secure_url || "", mediaType: file?.type.startsWith("video/") ? "video" : "image", cloudinaryPublicId: media?.public_id || "", openDate: Timestamp.fromDate(new Date(`${openDate}T00:00:00+07:00`)), createdAt: serverTimestamp(), creatorId: user.uid, creatorName: authorName }); sendNotificationInBackground(user, "/api/notify/phase-one", { kind: "timecapsule", itemId: ref.id, senderUid: user.uid }); setTitle(""); setMessage(""); setOpenDate(""); setFile(null); } catch (e) { setError(e instanceof Error ? e.message : "Chưa thể khóa hộp thư."); } finally { setBusy(false); } }
  return <div className="mt-6"><form onSubmit={submit} className="soft-card grid gap-3 p-4"><input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên hộp thư" /><textarea className="input-field min-h-28" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Lời nhắn chỉ được đọc vào ngày mở..." /><input className="input-field" type="date" min={minDate} value={openDate} onChange={(e) => setOpenDate(e.target.value)} /><label className="secondary-button cursor-pointer"><ImagePlus className="size-4" />{file ? file.name : "Đính kèm ảnh hoặc video"}<input className="hidden" type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label><button className="primary-button" disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Clock3 className="size-4" />}Khóa đến ngày mở</button>{error && <p className="text-sm text-red-700">{error}</p>}</form><div className="mt-5 grid gap-3 sm:grid-cols-2">{items.map((item) => { const locked = item.locked || !item.message; return <article className="soft-card p-4" key={item.id}><div className="flex items-start gap-3"><span className="grid size-11 place-items-center rounded-full bg-blush/35">{locked ? "🔒" : "💌"}</span><div className="min-w-0 flex-1"><p className="font-bold">{item.title}</p><p className="text-xs text-[#9b6b74]">Mở lúc {displayDate(item.openDate)}</p></div>{item.creatorId === user.uid && <button onClick={() => deleteDoc(doc(db, "couples", coupleId, "timeCapsules", item.id))}><Trash2 className="size-4 text-[#b88]" /></button>}</div>{locked ? <p className="mt-4 rounded-2xl bg-white/60 p-4 text-center text-sm text-[#806e65]">Lời nhắn đang được giữ kín.</p> : <><p className="mt-4 whitespace-pre-wrap text-sm">{item.message}</p>{item.mediaUrl && (item.mediaType === "video" ? <video controls className="mt-3 w-full rounded-2xl" src={item.mediaUrl} /> : <img className="mt-3 w-full rounded-2xl" src={item.mediaUrl} alt="Kỷ vật trong hộp thư" />)}</>}</article>; })}</div></div>;
}
