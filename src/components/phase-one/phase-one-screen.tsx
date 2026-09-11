"use client";
/* eslint-disable @next/next/no-img-element */

import type { User } from "firebase/auth";
import { CalendarDays, Clock3, Heart, ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, Timestamp } from "@/lib/database";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SharedCalendar } from "@/components/calendar/shared-calendar";
import { LoginScreen } from "@/components/auth/login-screen";
import { PairingScreen } from "@/components/pairing/pairing-screen";
import { useAuth } from "@/components/providers/auth-provider";
import { useCoupleSpace } from "@/components/providers/couple-provider";
import { uploadMediaToCloudinary } from "@/lib/cloudinary";
import { db } from "@/lib/firebase";
import { sendNotificationInBackground } from "@/lib/notification-client";
import type { TimeCapsuleDocument } from "@/types/firestore";

type Feature = "calendar" | "timecapsule";
type WithId<T> = T & { id: string };

const featureMeta = {
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
    <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-white/65 p-2 shadow-soft">
      {(["calendar", "timecapsule"] as Feature[]).map((item) => <Link key={item} href={`/${item}`} className={`rounded-xl px-2 py-2 text-center text-xs font-bold ${feature === item ? "bg-[#d96578] text-white" : "text-[#806e65]"}`}>{featureMeta[item].title}</Link>)}
    </div>
    {feature === "calendar" && <SharedCalendar user={user} coupleId={coupleId} authorName={authorName} />}
    {feature === "timecapsule" && <TimeCapsules user={user} coupleId={coupleId} authorName={authorName} />}
  </section><BottomNav /></main>;
}

function TimeCapsules({ user, coupleId, authorName }: { user: User; coupleId: string; authorName: string }) {
  const [items, setItems] = useState<Array<WithId<TimeCapsuleDocument>>>([]); const [title, setTitle] = useState(""); const [message, setMessage] = useState(""); const [openDate, setOpenDate] = useState(""); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => onSnapshot(query(collection(db, "couples", coupleId, "timeCapsules"), orderBy("openDate", "asc")), (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as WithId<TimeCapsuleDocument>))), (e) => setError(e.message)), [coupleId]);
  const minDate = useMemo(() => dayKey(new Date(Date.now() + 86400000)), []);
  async function submit(event: FormEvent) { event.preventDefault(); if (!title.trim() || !message.trim() || !openDate) return; setBusy(true); try { const media = file ? await uploadMediaToCloudinary(file, "love-days/time-capsules") : null; const ref = await addDoc(collection(db, "couples", coupleId, "timeCapsules"), { title: title.trim(), message: message.trim(), mediaUrl: media?.secure_url || "", mediaType: file?.type.startsWith("video/") ? "video" : "image", cloudinaryPublicId: media?.public_id || "", openDate: Timestamp.fromDate(new Date(`${openDate}T00:00:00+07:00`)), createdAt: serverTimestamp(), creatorId: user.uid, creatorName: authorName }); sendNotificationInBackground(user, "/api/notify/phase-one", { kind: "timecapsule", itemId: ref.id, senderUid: user.uid }); setTitle(""); setMessage(""); setOpenDate(""); setFile(null); } catch (e) { setError(e instanceof Error ? e.message : "Chưa thể khóa hộp thư."); } finally { setBusy(false); } }
  return <div className="mt-6"><form onSubmit={submit} className="soft-card grid gap-3 p-4"><input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tên hộp thư" /><textarea className="input-field min-h-28" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Lời nhắn chỉ được đọc vào ngày mở..." /><input className="input-field" type="date" min={minDate} value={openDate} onChange={(e) => setOpenDate(e.target.value)} /><label className="secondary-button cursor-pointer"><ImagePlus className="size-4" />{file ? file.name : "Đính kèm ảnh hoặc video"}<input className="hidden" type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label><button className="primary-button" disabled={busy}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Clock3 className="size-4" />}Khóa đến ngày mở</button>{error && <p className="text-sm text-red-700">{error}</p>}</form><div className="mt-5 grid gap-3 sm:grid-cols-2">{items.map((item) => { const locked = item.locked || !item.message; return <article className="soft-card p-4" key={item.id}><div className="flex items-start gap-3"><span className="grid size-11 place-items-center rounded-full bg-blush/35">{locked ? "🔒" : "💌"}</span><div className="min-w-0 flex-1"><p className="font-bold">{item.title}</p><p className="text-xs text-[#9b6b74]">Mở lúc {displayDate(item.openDate)}</p></div>{item.creatorId === user.uid && <button onClick={() => deleteDoc(doc(db, "couples", coupleId, "timeCapsules", item.id))}><Trash2 className="size-4 text-[#b88]" /></button>}</div>{locked ? <p className="mt-4 rounded-2xl bg-white/60 p-4 text-center text-sm text-[#806e65]">Lời nhắn đang được giữ kín.</p> : <><p className="mt-4 whitespace-pre-wrap text-sm">{item.message}</p>{item.mediaUrl && (item.mediaType === "video" ? <video controls className="mt-3 w-full rounded-2xl" src={item.mediaUrl} /> : <img className="mt-3 w-full rounded-2xl" src={item.mediaUrl} alt="Kỷ vật trong hộp thư" />)}</>}</article>; })}</div></div>;
}
