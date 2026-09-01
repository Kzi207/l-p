"use client";
/* eslint-disable @next/next/no-img-element */

import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { LoaderCircle, MessageCircleHeart, Send, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import type { LocketMessageDocument } from "@/types/firestore";
import type { UserDocument } from "@/types/firestore";

type Message = LocketMessageDocument & { id: string };

export function LocketChat({ user, coupleId, profile }: { user: User; coupleId: string; profile: UserDocument | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!db) return;
    const messagesQuery = query(collection(db, "couples", coupleId, "locketMessages"), orderBy("createdAt", "desc"), limit(200));
    return onSnapshot(messagesQuery, (snapshot) => {
      setMessages(snapshot.docs.map((message) => ({ id: message.id, ...message.data() }) as Message).reverse());
      setError("");
    }, (caught) => setError(`Không thể tải chat (${caught.code}).`));
  }, [coupleId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !text.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, "couples", coupleId, "locketMessages"), {
        text: text.trim(),
        createdAt: serverTimestamp(),
        senderId: user.uid,
        senderName: profile?.nickname || profile?.displayName || user.displayName || "Người thương",
        senderPhotoUrl: profile?.photoURL || user.photoURL || "",
      });
      setText("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chưa thể gửi tin nhắn.");
    } finally {
      setSending(false);
    }
  }

  async function recallMessage(message: Message) {
    if (!db || message.senderId !== user.uid) return;
    if (!window.confirm("Thu hồi tin nhắn này với cả hai người?")) return;
    setDeletingId(message.id);
    setError("");
    try {
      await deleteDoc(doc(db, "couples", coupleId, "locketMessages", message.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chưa thể thu hồi tin nhắn.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <section className="soft-card flex min-h-[65dvh] flex-col overflow-hidden">
      <header className="border-b border-[#eadbd0] px-5 py-4"><p className="flex items-center gap-2 font-display text-xl font-bold"><MessageCircleHeart className="size-5 text-[#cf7485]" />Chat của chúng mình</p><p className="mt-1 text-xs text-[#927d73]">Tin nhắn cập nhật ngay trên cả hai thiết bị</p></header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
        {messages.length === 0 && <div className="grid min-h-72 place-items-center text-center"><div><MessageCircleHeart className="mx-auto size-12 text-blush" /><p className="mt-3 font-handwritten text-xl text-[#a56f78]">Gửi lời nhắn đầu tiên nhé</p></div></div>}
        {messages.map((message) => {
          const mine = message.senderId === user.uid;
          return <div className={`group flex items-center gap-2 ${mine ? "flex-row-reverse" : ""}`} key={message.id}>{message.senderPhotoUrl ? <span className="size-9 shrink-0 overflow-hidden rounded-full">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={message.senderPhotoUrl} alt="" className="size-full object-cover" /></span> : <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blush/45 text-xs font-bold">{message.senderName.slice(0, 1)}</span>}<div className={`max-w-[78%] rounded-[1.2rem] px-4 py-2.5 text-sm leading-5 ${mine ? "rounded-tr-sm bg-blush/70" : "rounded-tl-sm bg-white shadow-sm"}`}><p>{message.text}</p><span className="mt-1 block text-[9px] text-[#8d756b]">{message.senderName}</span></div>{mine && <button className="grid size-8 shrink-0 place-items-center rounded-full text-[#a47c75] opacity-70 transition hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100" type="button" disabled={deletingId === message.id} onClick={() => recallMessage(message)} aria-label="Thu hồi tin nhắn" title="Thu hồi">{deletingId === message.id ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}</button>}</div>;
        })}
        <div ref={endRef} />
      </div>
      {error && <p className="mx-4 mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <form className="safe-bottom flex gap-2 border-t border-[#eadbd0] bg-[#fffaf5] p-3" onSubmit={sendMessage}><input className="soft-input min-w-0 py-2.5" maxLength={1000} value={text} onChange={(event) => setText(event.target.value)} placeholder="Nhắn gì đó cho người thương..." /><button className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blush shadow-soft disabled:opacity-50" type="submit" disabled={sending || !text.trim()} aria-label="Gửi tin nhắn">{sending ? <LoaderCircle className="size-5 animate-spin" /> : <Send className="size-5" />}</button></form>
    </section>
  );
}
