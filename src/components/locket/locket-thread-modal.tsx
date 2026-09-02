"use client";
/* eslint-disable @next/next/no-img-element */

import { AnimatePresence, motion } from "framer-motion";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { LoaderCircle, Send, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { LocketPostDocument, LocketReplyDocument, UserDocument } from "@/types/firestore";

type Post = LocketPostDocument & { id: string };
type Reply = LocketReplyDocument & { id: string };

export function LocketThreadModal({ post, user, coupleId, profile, onClose }: { post: Post | null; user: User; coupleId: string; profile: UserDocument | null; onClose: () => void }) {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [pendingRecall, setPendingRecall] = useState<Reply | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!db || !post) return;
    const repliesQuery = query(collection(db, "couples", coupleId, "locketPosts", post.id, "replies"), orderBy("createdAt", "asc"));
    return onSnapshot(repliesQuery, (snapshot) => {
      setReplies(snapshot.docs.map((reply) => ({ id: reply.id, ...reply.data() }) as Reply));
      setError("");
    }, (caught) => setError(`Không thể tải trả lời (${caught.code}).`));
  }, [coupleId, post]);

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!db || !post || !text.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, "couples", coupleId, "locketPosts", post.id, "replies"), {
        text: text.trim(),
        createdAt: serverTimestamp(),
        senderId: user.uid,
        senderName: profile?.nickname || profile?.displayName || user.displayName || "Người thương",
        senderPhotoUrl: profile?.photoURL || user.photoURL || "",
      });
      setText("");
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chưa thể gửi trả lời.");
    } finally {
      setSending(false);
    }
  }

  async function recallReply() {
    if (!db || !post || !pendingRecall || pendingRecall.senderId !== user.uid) return;
    setDeletingId(pendingRecall.id);
    setError("");
    try {
      await deleteDoc(doc(db, "couples", coupleId, "locketPosts", post.id, "replies", pendingRecall.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chưa thể thu hồi lời trả lời.");
    } finally {
      setDeletingId("");
      setPendingRecall(null);
    }
  }

  return (
    <AnimatePresence>
      {post && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-[#3f302a]/45 p-3 backdrop-blur-md sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="thread-title" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
          <motion.section className="safe-bottom flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] bg-[#fff8f0] shadow-2xl" initial={{ y: 70, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 70, opacity: 0 }}>
            <header className="flex items-center justify-between border-b border-[#eadbd0] p-4"><div><p className="text-xs font-semibold text-[#a16f78]">Trả lời Locket của {post.uploaderName}</p><h2 id="thread-title" className="font-display text-xl font-bold">Cuộc trò chuyện nhỏ</h2></div><button className="grid size-10 place-items-center rounded-full bg-white/70 shadow-soft" type="button" onClick={onClose} aria-label="Đóng"><X className="size-5" /></button></header>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mx-auto aspect-square max-w-64 overflow-hidden rounded-[1.8rem] bg-[#eadbd0] shadow-soft">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={post.imageUrl} alt={post.caption || "Ảnh Locket"} className="size-full object-cover" /></div>
              {post.caption && <p className="mx-auto mt-3 max-w-sm text-center font-handwritten text-xl text-[#6f554d]">“{post.caption}”</p>}
              <div className="mt-6 space-y-3">
                {replies.length === 0 && <p className="py-5 text-center text-sm text-[#9b857b]">Chưa có lời nhắn nào. Hãy là người đầu tiên trả lời.</p>}
                {replies.map((reply) => { const mine = reply.senderId === user.uid; return <div className={`group flex items-center gap-2 ${mine ? "flex-row-reverse" : ""}`} key={reply.id}>{reply.senderPhotoUrl ? <span className="size-8 shrink-0 overflow-hidden rounded-full">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={reply.senderPhotoUrl} alt="" className="size-full object-cover" /></span> : <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blush/45 text-xs font-bold">{reply.senderName.slice(0, 1)}</span>}<div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${mine ? "rounded-tr-sm bg-blush/65" : "rounded-tl-sm bg-white shadow-sm"}`}><p>{reply.text}</p><span className="mt-1 block text-[9px] text-[#8f7b72]">{reply.senderName}</span></div>{mine && <button className="grid size-8 shrink-0 place-items-center rounded-full text-[#a47c75] opacity-70 transition hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100" type="button" disabled={deletingId === reply.id} onClick={() => setPendingRecall(reply)} aria-label="Thu hồi lời trả lời" title="Thu hồi">{deletingId === reply.id ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}</button>}</div>; })}
              </div>
            </div>
            {error && <p className="mx-4 mb-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            <form className="flex gap-2 border-t border-[#eadbd0] bg-[#fffaf5] p-3" onSubmit={sendReply}><input className="soft-input min-w-0 py-2.5" maxLength={500} value={text} onChange={(event) => setText(event.target.value)} placeholder="Trả lời ảnh này..." /><button className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blush shadow-soft disabled:opacity-50" type="submit" disabled={sending || !text.trim()} aria-label="Gửi trả lời">{sending ? <LoaderCircle className="size-5 animate-spin" /> : <Send className="size-5" />}</button></form>
            <ConfirmDialog open={Boolean(pendingRecall)} title="Thu hồi lời trả lời?" description="Lời nhắn này sẽ biến mất với cả hai người và không thể khôi phục." confirmLabel="Thu hồi" busy={Boolean(deletingId)} onCancel={() => setPendingRecall(null)} onConfirm={recallReply} />
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
