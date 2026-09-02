"use client";
/* eslint-disable @next/next/no-img-element */

import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { LoaderCircle, MessageCircleHeart, Send, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { sendNotificationInBackground } from "@/lib/notification-client";
import type { LocketMessageDocument } from "@/types/firestore";
import type { UserDocument } from "@/types/firestore";

type Message = LocketMessageDocument & { id: string };

export function LocketChat({ user, coupleId, profile }: { user: User; coupleId: string; profile: UserDocument | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [pendingRecall, setPendingRecall] = useState<Message | null>(null);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLFormElement>(null);

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

  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;
    function syncVisibleViewport() {
      root.style.setProperty("--chat-viewport-height", `${viewport?.height || window.innerHeight}px`);
      root.style.setProperty("--chat-viewport-top", `${viewport?.offsetTop || 0}px`);
    }
    syncVisibleViewport();
    viewport?.addEventListener("resize", syncVisibleViewport);
    viewport?.addEventListener("scroll", syncVisibleViewport);
    window.addEventListener("orientationchange", syncVisibleViewport);
    return () => {
      document.body.classList.remove("locket-keyboard-open");
      root.style.removeProperty("--chat-viewport-height");
      root.style.removeProperty("--chat-viewport-top");
      viewport?.removeEventListener("resize", syncVisibleViewport);
      viewport?.removeEventListener("scroll", syncVisibleViewport);
      window.removeEventListener("orientationchange", syncVisibleViewport);
    };
  }, []);

  function openKeyboardLayout() {
    const mobileTouchDevice = window.matchMedia("(max-width: 1023px) and (pointer: coarse)").matches;
    if (!mobileTouchDevice) return;
    document.body.classList.add("locket-keyboard-open");
    window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 180);
  }

  function closeKeyboardLayout() {
    window.setTimeout(() => {
      if (!composerRef.current?.contains(document.activeElement)) {
        document.body.classList.remove("locket-keyboard-open");
      }
    }, 80);
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !text.trim()) return;
    inputRef.current?.focus();
    setSending(true);
    try {
      const messageText = text.trim();
      const message = await addDoc(collection(db, "couples", coupleId, "locketMessages"), {
        text: messageText,
        createdAt: serverTimestamp(),
        senderId: user.uid,
        senderName: profile?.nickname || profile?.displayName || user.displayName || "Người thương",
        senderPhotoUrl: profile?.photoURL || user.photoURL || "",
      });
      sendNotificationInBackground(user, "/api/notify/chat", {
        senderUid: user.uid,
        messageId: message.id,
        text: messageText,
      });
      setText("");
      window.requestAnimationFrame(() => inputRef.current?.focus());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chưa thể gửi tin nhắn.");
    } finally {
      setSending(false);
    }
  }

  async function recallMessage() {
    if (!db || !pendingRecall || pendingRecall.senderId !== user.uid) return;
    setDeletingId(pendingRecall.id);
    setError("");
    try {
      await deleteDoc(doc(db, "couples", coupleId, "locketMessages", pendingRecall.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chưa thể thu hồi tin nhắn.");
    } finally {
      setDeletingId("");
      setPendingRecall(null);
    }
  }

  return (
    <section className="locket-chat soft-card flex h-[calc(100dvh-14rem)] min-h-[28rem] max-h-[44rem] flex-col overflow-hidden sm:h-[65dvh]">
      <header className="locket-chat-header border-b border-[#eadbd0] px-5 py-4"><p className="flex items-center gap-2 font-display text-xl font-bold"><MessageCircleHeart className="size-5 text-[#cf7485]" />Chat của chúng mình</p><p className="mt-1 text-xs text-[#927d73]">Tin nhắn cập nhật ngay trên cả hai thiết bị</p></header>
      <div className="locket-chat-messages min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 sm:p-5">
        {messages.length === 0 && <div className="grid min-h-72 place-items-center text-center"><div><MessageCircleHeart className="mx-auto size-12 text-blush" /><p className="mt-3 font-handwritten text-xl text-[#a56f78]">Gửi lời nhắn đầu tiên nhé</p></div></div>}
        {messages.map((message) => {
          const mine = message.senderId === user.uid;
          return <div className={`group flex items-center gap-2 ${mine ? "flex-row-reverse" : ""}`} key={message.id}>{message.senderPhotoUrl ? <span className="size-9 shrink-0 overflow-hidden rounded-full">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={message.senderPhotoUrl} alt="" className="size-full object-cover" /></span> : <span className="grid size-9 shrink-0 place-items-center rounded-full bg-blush/45 text-xs font-bold">{message.senderName.slice(0, 1)}</span>}<div className={`max-w-[78%] rounded-[1.2rem] px-4 py-2.5 text-sm leading-5 ${mine ? "rounded-tr-sm bg-blush/70" : "rounded-tl-sm bg-white shadow-sm"}`}><p>{message.text}</p><span className="mt-1 block text-[9px] text-[#8d756b]">{message.senderName}</span></div>{mine && <button className="grid size-8 shrink-0 place-items-center rounded-full text-[#a47c75] opacity-70 transition hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100" type="button" disabled={deletingId === message.id} onClick={() => setPendingRecall(message)} aria-label="Thu hồi tin nhắn" title="Thu hồi">{deletingId === message.id ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}</button>}</div>;
        })}
        <div className="locket-chat-end" ref={endRef} />
      </div>
      {error && <p className="mx-4 mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      <form ref={composerRef} className="locket-chat-composer safe-bottom flex gap-2 border-t border-[#eadbd0] bg-[#fffaf5]/95 p-3 backdrop-blur-xl" onSubmit={sendMessage} onBlur={closeKeyboardLayout}><input ref={inputRef} className="soft-input min-w-0 py-2.5" maxLength={1000} value={text} onChange={(event) => setText(event.target.value)} onFocus={openKeyboardLayout} placeholder="Nhắn gì đó cho người thương..." enterKeyHint="send" autoComplete="off" /><button className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blush shadow-soft disabled:opacity-50" type="submit" disabled={sending || !text.trim()} aria-label="Gửi tin nhắn">{sending ? <LoaderCircle className="size-5 animate-spin" /> : <Send className="size-5" />}</button></form>
      <ConfirmDialog open={Boolean(pendingRecall)} title="Thu hồi tin nhắn?" description={pendingRecall ? `“${pendingRecall.text.slice(0, 90)}${pendingRecall.text.length > 90 ? "…" : ""}” sẽ biến mất với cả hai người và không thể khôi phục.` : ""} confirmLabel="Thu hồi" busy={Boolean(deletingId)} onCancel={() => setPendingRecall(null)} onConfirm={recallMessage} />
    </section>
  );
}
