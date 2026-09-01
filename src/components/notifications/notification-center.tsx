"use client";
/* eslint-disable @next/next/no-img-element */

import { AnimatePresence, motion } from "framer-motion";
import type { User } from "firebase/auth";
import { collection, limit, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";
import { Bell, BellRing, Camera, CheckCheck, Heart, Images, LoaderCircle, MessageCircle, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import type { LocketMessageDocument, LocketPostDocument, MediaMemoryDocument, PhotoDocument } from "@/types/firestore";

type PushStatus = "idle" | "loading" | "granted" | "denied" | "unsupported";
type NotificationKind = "message" | "locket" | "memory" | "photo";

interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  imageUrl?: string;
  createdAt: Timestamp | null;
}

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  user: User;
  coupleId: string;
  pushStatus: PushStatus;
  onEnablePush: () => Promise<void>;
  onUnreadChange: (count: number) => void;
}

const iconByKind = {
  message: MessageCircle,
  locket: Camera,
  memory: Images,
  photo: Heart,
};

function formatTime(timestamp: Timestamp | null) {
  if (!timestamp) return "Vừa xong";
  const date = timestamp.toDate();
  const sameDay = date.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat("vi-VN", sameDay
    ? { hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function NotificationCenter({ open, onClose, user, coupleId, pushStatus, onEnablePush, onUnreadChange }: NotificationCenterProps) {
  const [messages, setMessages] = useState<NotificationItem[]>([]);
  const [lockets, setLockets] = useState<NotificationItem[]>([]);
  const [memories, setMemories] = useState<NotificationItem[]>([]);
  const [photos, setPhotos] = useState<NotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const storageKey = `love-days-notification-read:${coupleId}:${user.uid}`;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]") as string[];
      setReadIds(new Set(saved));
    } catch {
      setReadIds(new Set());
    }
  }, [storageKey]);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      setError("Firebase chưa sẵn sàng.");
      return;
    }

    setLoading(true);
    setError("");
    const database = db;
    const reportError = () => {
      setLoading(false);
      setError("Chưa thể tải thông báo. Hãy kiểm tra kết nối rồi thử lại.");
    };

    const unsubscribers = [
      onSnapshot(query(collection(database, "couples", coupleId, "locketMessages"), orderBy("createdAt", "desc"), limit(25)), (snapshot) => {
        setMessages(snapshot.docs.flatMap((item) => {
          const data = item.data() as LocketMessageDocument;
          if (data.senderId === user.uid) return [];
          return [{ id: `message:${item.id}`, kind: "message" as const, title: `${data.senderName || "Người thương"} đã nhắn bạn`, body: data.text || "Tin nhắn mới", href: "/chat", createdAt: data.createdAt || null }];
        }));
        setLoading(false);
      }, reportError),
      onSnapshot(query(collection(database, "couples", coupleId, "locketPosts"), orderBy("createdAt", "desc"), limit(20)), (snapshot) => {
        setLockets(snapshot.docs.flatMap((item) => {
          const data = item.data() as LocketPostDocument;
          if (data.uploaderId === user.uid) return [];
          return [{ id: `locket:${item.id}`, kind: "locket" as const, title: `${data.uploaderName || "Người thương"} vừa gửi một Locket`, body: data.caption || "Chạm để xem khoảnh khắc mới", href: "/locket", imageUrl: data.imageUrl, createdAt: data.createdAt || null }];
        }));
        setLoading(false);
      }, reportError),
      onSnapshot(query(collection(database, "couples", coupleId, "mediaMemories"), orderBy("createdAt", "desc"), limit(20)), (snapshot) => {
        setMemories(snapshot.docs.flatMap((item) => {
          const data = item.data() as MediaMemoryDocument;
          if (data.uploaderId === user.uid) return [];
          return [{ id: `memory:${item.id}`, kind: "memory" as const, title: `${data.uploaderName || "Người thương"} đã thêm kỷ niệm`, body: data.caption || (data.mediaType === "video" ? "Một video kỷ niệm mới" : "Một ảnh kỷ niệm mới"), href: "/map", imageUrl: data.mediaType === "image" ? data.mediaUrl : undefined, createdAt: data.createdAt || null }];
        }));
        setLoading(false);
      }, reportError),
      onSnapshot(query(collection(database, "couples", coupleId, "photos"), orderBy("createdAt", "desc"), limit(10)), (snapshot) => {
        setPhotos(snapshot.docs.flatMap((item) => {
          const data = item.data() as PhotoDocument;
          if (data.uploaderId === user.uid) return [];
          return [{ id: `photo:${item.id}`, kind: "photo" as const, title: `${data.uploaderName || "Người thương"} đã đổi ảnh chung`, body: data.caption || "Ảnh ở trang chủ vừa được cập nhật", href: "/", imageUrl: data.imageUrl, createdAt: data.createdAt || null }];
        }));
        setLoading(false);
      }, reportError),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [coupleId, user.uid]);

  const items = useMemo(() => [...messages, ...lockets, ...memories, ...photos]
    .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0))
    .slice(0, 50), [lockets, memories, messages, photos]);
  const unreadCount = useMemo(() => items.filter((item) => !readIds.has(item.id)).length, [items, readIds]);

  useEffect(() => {
    onUnreadChange(unreadCount);
  }, [onUnreadChange, unreadCount]);

  function saveReadIds(next: Set<string>) {
    setReadIds(next);
    localStorage.setItem(storageKey, JSON.stringify(Array.from(next).slice(-200)));
  }

  function markRead(id: string) {
    if (readIds.has(id)) return;
    const next = new Set(readIds);
    next.add(id);
    saveReadIds(next);
  }

  function markAllRead() {
    const next = new Set(readIds);
    items.forEach((item) => next.add(item.id));
    saveReadIds(next);
  }

  return (
    <AnimatePresence>
      {open && <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-[#3f302a]/45 p-3 backdrop-blur-md sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="notification-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
        <motion.section className="safe-bottom flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] bg-[#fff8f0] shadow-2xl" initial={{ y: 70, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 70, opacity: 0 }}>
          <header className="flex items-center justify-between gap-3 border-b border-[#eadbd4] px-5 py-4">
            <div><p className="font-handwritten text-lg text-[#a56f78]">Chuyện của hai đứa</p><h2 id="notification-title" className="font-display text-2xl font-bold">Thông báo {unreadCount > 0 && <span className="text-base text-[#d36f80]">({unreadCount})</span>}</h2></div>
            <button className="grid size-10 shrink-0 place-items-center rounded-full bg-white/70 shadow-soft" type="button" onClick={onClose} aria-label="Đóng thông báo"><X className="size-5" /></button>
          </header>

          <div className="overflow-y-auto px-4 pb-5">
            <section className="mt-4 flex items-center gap-3 rounded-2xl bg-white/65 p-3 shadow-soft">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blush/25">{pushStatus === "granted" ? <BellRing className="size-5 text-[#d36f80]" /> : <Bell className="size-5 text-[#9b7780]" />}</span>
              <div className="min-w-0 flex-1"><p className="text-sm font-bold">Thông báo trên thiết bị</p><p className="text-xs text-[#806e65]">{pushStatus === "granted" ? "Đã bật cho ảnh và tin nhắn mới." : pushStatus === "denied" ? "Trình duyệt đang chặn quyền thông báo." : pushStatus === "unsupported" ? "Thiết bị này chưa hỗ trợ Web Push." : "Bật để nhận tin ngay cả khi không mở ứng dụng."}</p></div>
              {pushStatus !== "granted" && pushStatus !== "unsupported" && <button className="rounded-xl bg-[#d87989] px-3 py-2 text-xs font-bold text-white disabled:opacity-60" type="button" disabled={pushStatus === "loading" || pushStatus === "denied"} onClick={onEnablePush}>{pushStatus === "loading" ? <LoaderCircle className="size-4 animate-spin" /> : "Bật"}</button>}
            </section>

            <div className="mt-5 flex items-center justify-between"><h3 className="font-display text-lg font-bold">Hoạt động gần đây</h3>{unreadCount > 0 && <button className="flex items-center gap-1 text-xs font-bold text-[#bd6575]" type="button" onClick={markAllRead}><CheckCheck className="size-4" />Đọc tất cả</button>}</div>

            {loading && items.length === 0 && <div className="grid place-items-center py-12 text-[#9b7780]"><LoaderCircle className="size-7 animate-spin" /><p className="mt-2 text-sm">Đang tải thông báo...</p></div>}
            {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {!loading && !error && items.length === 0 && <div className="py-12 text-center"><Bell className="mx-auto size-9 text-[#d7a2aa]" /><p className="mt-3 font-bold">Chưa có thông báo</p><p className="mt-1 text-sm text-[#806e65]">Ảnh và tin nhắn mới từ người thương sẽ xuất hiện tại đây.</p></div>}

            <div className="mt-2 space-y-2">
              {items.map((item) => {
                const Icon = iconByKind[item.kind];
                const unread = !readIds.has(item.id);
                return <Link key={item.id} href={item.href} onClick={() => markRead(item.id)} className={`relative flex items-center gap-3 rounded-2xl p-3 transition ${unread ? "bg-blush/20" : "bg-white/45"}`}>
                  <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/80">{item.imageUrl ? <img className="size-full object-cover" src={item.imageUrl} alt="" /> : <Icon className="size-5 text-[#ce7787]" />}</span>
                  <span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><span className="line-clamp-1 text-sm font-bold">{item.title}</span><span className="shrink-0 text-[10px] text-[#98757c]">{formatTime(item.createdAt)}</span></span><span className="mt-0.5 block line-clamp-2 text-xs text-[#806e65]">{item.body}</span></span>
                  {unread && <span className="absolute right-2 top-2 size-2 rounded-full bg-[#e15e75]" aria-label="Chưa đọc" />}
                </Link>;
              })}
            </div>
          </div>
        </motion.section>
      </motion.div>}
    </AnimatePresence>
  );
}
