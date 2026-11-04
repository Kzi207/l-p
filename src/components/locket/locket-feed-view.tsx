"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, Camera, Heart, LoaderCircle, Send, Trash2 } from "lucide-react";
import { getLocketFeed, getLocketFriends, interactLocketMoment } from "@/lib/locket/locket-client-api";
import { useVerticalGesture } from "@/lib/use-vertical-gesture";
import { AvatarImage } from "@/components/shared/avatar-image";
import { useCoupleSpace } from "@/components/providers/couple-provider";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element -- Locket media URLs are rendered directly and loaded lazily. */
const REACTIONS = ["💛", "🥰", "🔥", "😂", "🥺", "❤️"];
const idOf = (m: any) => m.moment_uid || m.canonical_uid || m.id;
function momentDate(m: any) {
  const value = m.date || m.created_at;
  const seconds = value?._seconds ?? value?.seconds;
  const date = new Date(seconds != null ? seconds * 1000 : /^\d+$/.test(String(value)) ? Number(value) * (Number(value) < 1e12 ? 1000 : 1) : value);
  return Number.isNaN(date.getTime()) ? "Gần đây" : date.toLocaleString("vi-VN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function LocketFeedView({ onOpenCamera, filter = "all", grid = false, onSelectMoment }: { onOpenCamera?: () => void; filter?: "all" | "my"; grid?: boolean; onSelectMoment?: () => void }) {
  const { profile } = useCoupleSpace();
  const feedType = filter;
  const [moments, setMoments] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const pending = useRef(false);

  useEffect(() => { let active = true; getLocketFriends().then(data => { if (active) setFriends(data); }).catch(() => {}); return () => { active = false; }; }, []);
  const load = useCallback(async (cursor: string | null = null) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    pending.current = true;
    setLoading(true); setError("");
    try {
      const page = await getLocketFeed(feedType, undefined, cursor, controller.signal);
      if (controller.signal.aborted) return;
      setMoments(previous => {
        const merged = cursor ? [...previous, ...page.moments] : page.moments;
        return Array.from(new Map(merged.filter((m: any) => idOf(m)).map((m: any) => [idOf(m), m])).values());
      });
      setNextPage(page.moments.length && page.nextPageToken !== cursor ? page.nextPageToken : null);
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Không thể tải khoảnh khắc.");
    } finally { if (!controller.signal.aborted) { pending.current = false; setLoading(false); } }
  }, [feedType]);
  useEffect(() => { setMoments([]); setActiveIndex(0); setNextPage(null);  setNotice(""); void load(); return () => request.current?.abort(); }, [load]);

  const selectedIndex = Math.min(activeIndex, Math.max(0, moments.length - 1));
  const move = (delta: number) => {
    setActiveIndex(Math.max(0, Math.min(moments.length - 1, selectedIndex + delta)));
    setText("");
  };
  useEffect(() => {
    if (!grid && moments.length && selectedIndex >= moments.length - 3 && nextPage && !loading && !error && !pending.current) void load(nextPage);
  }, [grid, moments.length, selectedIndex, nextPage, loading, error, load]);

  async function react(mid: string, emoji: string) {
    setBusy(mid); setError("");
    try { await interactLocketMoment("react", mid, { emoji }); setMoments(prev => prev.map(m => idOf(m) === mid ? { ...m, userReaction: emoji } : m)); }
    catch (err) { setError(err instanceof Error ? err.message : "Chưa gửi được cảm xúc."); }
    finally { setBusy(null); }
  }
  async function comment(mid: string, uid: string) {
    if (!text.trim() || !uid) return;
    setBusy(mid); setError("");
    try { await interactLocketMoment("comment", mid, { text: text.trim(), receiverUid: uid }); setText(""); setNotice("Đã gửi lời nhắn vào cuộc trò chuyện."); }
    catch (err) { setError(err instanceof Error ? err.message : "Chưa gửi được lời nhắn."); }
    finally { setBusy(null); }
  }
  async function remove(mid: string) {
    if (!confirm("Xóa khoảnh khắc này trên Locket?")) return;
    setBusy(mid);
    try { await interactLocketMoment("delete", mid); setMoments(prev => prev.filter(m => idOf(m) !== mid)); }
    catch (err) { setError(err instanceof Error ? err.message : "Chưa xóa được khoảnh khắc."); }
    finally { setBusy(null); }
  }

  const historyGesture = useVerticalGesture(direction => { if (direction === "down" && selectedIndex === 0) onOpenCamera?.(); else move(direction === "up" ? 1 : -1); }, !grid && moments.length > 0);
  const selected = moments[selectedIndex];
  const authorOf = (m: any) => {
    const uid = m.user_uid || (typeof m.user === "string" ? m.user : m.user?.uid);
    const own = uid === profile?.locketAccount?.uid || feedType === "my";
    const author = own ? profile?.locketAccount : friends.find(f => f.uid === uid) || (typeof m.user === "object" ? m.user : null);
    return { uid, own, name: author?.displayName || [author?.first_name, author?.last_name].filter(Boolean).join(" ") || author?.name || author?.username || (own ? "Mình" : "Bạn bè"), avatar: author?.avatarUrl || author?.profile_picture_url || "" };
  };
  return <div className={`locket-reference-feed ${grid ? "is-grid" : ""}`}>
    {error && <p role="alert" className="mx-4 rounded-xl bg-red-950/80 p-3 text-xs text-red-200">{error}<button type="button" onClick={() => void load(nextPage)} className="ml-2 underline">Thử lại</button></p>}
    {notice && <p role="status" className="mx-4 text-center text-xs locket-muted">{notice}</p>}
    {loading && !moments.length ? <div className="locket-reference-photo animate-pulse bg-white/5" aria-label="Đang tải lịch sử" /> : !moments.length && !error ? <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center locket-muted"><Heart className="size-8 text-[#ca7b90]" /><p className="text-sm">Chưa có khoảnh khắc nào ở đây</p><button type="button" onClick={onOpenCamera} className="locket-reference-pill"><Camera className="size-4" />Chụp ảnh đầu tiên</button></div> : grid ? <div className="grid grid-cols-3 gap-1 px-2">{moments.map((m, i) => <button key={idOf(m)} type="button" aria-label={`Xem khoảnh khắc ${i + 1}`} onClick={() => { setActiveIndex(i); onSelectMoment?.(); }} className="aspect-square overflow-hidden rounded-2xl bg-white/5">{m.thumbnail_url || m.image_url ? <img src={m.thumbnail_url || m.image_url} alt="" loading="lazy" className="size-full object-cover" /> : <Camera className="m-auto size-5 locket-muted" />}</button>)}</div> : selected && (() => {
      const m = selected;
      const mid = idOf(m);
      const author = authorOf(m);
      const overlay = (m.overlays?.[0] || m.overlay)?.data || {};
      const caption = overlay.text || m.caption;
      const colors = overlay.background?.colors || [];
      return <>
        <article key={mid} className="locket-reference-moment" tabIndex={0} aria-label="Vuốt lên xem tiếp, vuốt xuống quay lại" onKeyDown={e => { if (e.target !== e.currentTarget) return; if (e.key === "ArrowDown") { e.preventDefault(); move(1); } if (e.key === "ArrowUp") { e.preventDefault(); if (selectedIndex === 0) onOpenCamera?.(); else move(-1); } }}>
          <div {...historyGesture} className="locket-reference-photo" style={{ touchAction: "pan-x" }} onTouchStart={e => { if ((e.target as HTMLElement).closest("button,video")) { touchStart.current = null; return; } touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={e => { const start = touchStart.current; touchStart.current = null; if (!start) return; const dx = e.changedTouches[0].clientX - start.x; const dy = e.changedTouches[0].clientY - start.y; if (Math.abs(dy) > 55 && Math.abs(dy) > Math.abs(dx)) { if (dy > 0 && selectedIndex === 0) onOpenCamera?.(); else move(dy < 0 ? 1 : -1); } }}>
            {m.video_url ? <video src={m.video_url} poster={m.thumbnail_url || undefined} controls playsInline preload="none" className="size-full object-cover" /> : m.image_url || m.thumbnail_url ? <img src={m.image_url || m.thumbnail_url} alt={caption || `Khoảnh khắc của ${author.name}`} className="size-full object-cover" /> : <Camera className="m-auto size-8 text-white/20" />}
            {caption && <div className="pointer-events-none absolute inset-x-4 bottom-4 flex justify-center"><span style={{ background: colors.length > 1 ? `linear-gradient(135deg, ${colors.join(",")})` : colors[0] || "rgba(30,26,20,.65)", color: overlay.text_color || "#fff" }} className="max-w-full rounded-full px-4 py-2 text-center text-sm font-semibold backdrop-blur-md">{typeof overlay.icon?.data === "string" ? overlay.icon.data : ""} {caption}</span></div>}
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 text-xs"><span className="size-7 overflow-hidden rounded-full bg-white/10"><AvatarImage src={author.avatar} alt={author.name} /></span><span className="font-semibold locket-text">{author.name}</span><span className="locket-muted">{momentDate(m)}</span>{author.own && <button type="button" disabled={busy === mid} onClick={() => void remove(mid)} aria-label="Xóa khoảnh khắc" className="p-2 text-[#b68d86]"><Trash2 className="size-3.5" /></button>}</div>
        </article>
        <form onSubmit={e => { e.preventDefault(); void comment(mid, author.uid); }} className="locket-reference-composer">
          <input aria-label="Tin nhắn phản hồi" placeholder="Tin nhắn…" value={text} onChange={e => setText(e.target.value)} className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/45" />
          {text.trim() ? <button type="submit" disabled={busy === mid || !author.uid} aria-label="Gửi tin nhắn" className="grid size-8 place-items-center text-[#ca7b90] disabled:opacity-30">{busy === mid ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}</button> : REACTIONS.slice(2, 5).map(emoji => <button key={emoji} type="button" disabled={busy === mid} aria-label={`Gửi ${emoji}`} aria-pressed={m.userReaction === emoji} onClick={() => void react(mid, emoji)} className={`grid size-8 shrink-0 place-items-center rounded-full text-xl ${m.userReaction === emoji ? "bg-white/20" : ""}`}>{emoji}</button>)}
        </form>
      </>;
    })()}
    {nextPage && (grid || selectedIndex >= moments.length - 1) && <button type="button" disabled={loading} onClick={() => { if (!pending.current) void load(nextPage); }} className="locket-reference-load">{loading ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowDown className="size-4" />}Tải thêm lịch sử</button>}
  </div>;
}
