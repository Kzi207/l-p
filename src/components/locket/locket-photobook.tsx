"use client";
/* eslint-disable @next/next/no-img-element -- Locket media is displayed using its signed remote URLs. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookHeart, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { getLocketFeed } from "@/lib/locket/locket-client-api";
import { useVerticalGesture } from "@/lib/use-vertical-gesture";

interface BookMoment { moment_uid?: string; canonical_uid?: string; id?: string; image_url?: string; thumbnail_url?: string; video_url?: string; caption?: string; date?: string | { _seconds?: number; seconds?: number }; created_at?: string; }
const momentId = (moment: BookMoment) => moment.moment_uid || moment.canonical_uid || moment.id;
function monthOf(moment: BookMoment) {
  const raw = moment.date || moment.created_at;
  const seconds = typeof raw === "object" ? raw._seconds ?? raw.seconds : null;
  const date = new Date(seconds != null ? seconds * 1000 : typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) * (Number(raw) < 1e12 ? 1000 : 1) : typeof raw === "string" ? raw : NaN);
  if (!Number.isFinite(date.getTime())) return { key: "other", title: "Những ngày đáng nhớ" };
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" }).formatToParts(date);
  const year = parts.find(part => part.type === "year")?.value;
  const month = parts.find(part => part.type === "month")?.value;
  return { key: `${year}-${month}`, title: `Tháng ${Number(month)} · ${year}` };
}
export function LocketPhotobook({ filter }: { filter: "all" | "my" }) {
  const [moments, setMoments] = useState<BookMoment[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const request = useRef<AbortController | null>(null);
  const load = useCallback(async (cursor: string | null = null) => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setLoading(true); setError("");
    try {
      const data = await getLocketFeed(filter, undefined, cursor, controller.signal);
      if (controller.signal.aborted) return;
      setMoments(previous => Array.from(new Map<string, BookMoment>((cursor ? [...previous, ...data.moments] : data.moments).filter((moment: BookMoment) => momentId(moment)).map((moment: BookMoment) => [momentId(moment)!, moment])).values()));
      setNextPage(data.nextPageToken !== cursor ? data.nextPageToken : null);
    } catch (caught) { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Chưa tải được Photobook."); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [filter]);
  useEffect(() => { setMoments([]); setSelectedMonth(null); setPage(0); setNextPage(null); void load(); return () => request.current?.abort(); }, [load]);
  const albums = useMemo(() => {
    const groups = new Map<string, { key: string; title: string; moments: BookMoment[] }>();
    moments.forEach(moment => { const month = monthOf(moment); if (!groups.has(month.key)) groups.set(month.key, { ...month, moments: [] }); groups.get(month.key)!.moments.push(moment); });
    return Array.from(groups.values());
  }, [moments]);
  const album = albums.find(item => item.key === selectedMonth);
  const pageCount = Math.ceil((album?.moments.length || 0) / 2);
  const currentPage = Math.min(page, Math.max(0, pageCount - 1));
  const gesture = useVerticalGesture(direction => setPage(previous => Math.max(0, Math.min(pageCount - 1, previous + (direction === "up" ? 1 : -1)))), !!album);
  return <div className="locket-photobook">
    <header>{album && <button type="button" onClick={() => setSelectedMonth(null)} aria-label="Về danh sách Photobook"><ArrowLeft className="size-4" /></button>}<div><p>Mỗi tháng, một câu chuyện</p><h2>{album?.title || "Photobook"}</h2></div><BookHeart className="size-5" /></header>
    {error && <p role="alert" className="rounded-2xl bg-rose-50 p-3 text-xs text-rose-700">{error}<button type="button" onClick={() => void load(nextPage)} className="ml-2 underline">Thử lại</button></p>}
    {loading && !moments.length ? <div className="py-16 text-center"><LoaderCircle className="mx-auto size-6 animate-spin text-[#c58094]" /><p className="mt-3 text-xs">Đang gom những ngày đáng nhớ…</p></div> : !moments.length && !error ? <div className="py-16 text-center"><BookHeart className="mx-auto size-9" /><p className="mt-3 text-sm">Khoảnh khắc của bạn sẽ trở thành Photobook ở đây.</p></div> : album ? <>
      <div {...gesture} className="locket-book-spread" aria-label="Kéo lên xuống hoặc cuộn để lật trang">{album.moments.slice(currentPage * 2, currentPage * 2 + 2).map(moment => <figure key={momentId(moment)}>{moment.image_url || moment.thumbnail_url ? <img src={moment.image_url || moment.thumbnail_url} alt={moment.caption || "Khoảnh khắc trong Photobook"} loading="lazy" draggable={false} /> : <BookHeart className="mx-auto my-10 size-8" />}<figcaption>{moment.caption || "Một ngày thật đẹp"}</figcaption>{moment.video_url && <video src={moment.video_url} controls playsInline preload="none" className="mt-2 w-full rounded-xl" />}</figure>)}</div>
      <div className="locket-book-pagination"><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} aria-label="Trang trước"><ChevronLeft className="size-5" /></button><span>Trang {currentPage + 1} / {pageCount}</span><button type="button" disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)} aria-label="Trang tiếp"><ChevronRight className="size-5" /></button></div>
    </> : <div className="locket-book-covers">{albums.map(item => <button key={item.key} type="button" onClick={() => { setSelectedMonth(item.key); setPage(0); }} className="locket-book-cover"><div>{item.moments.slice(0, 4).map(moment => <span key={momentId(moment)}>{moment.thumbnail_url || moment.image_url ? <img src={moment.thumbnail_url || moment.image_url} alt="" loading="lazy" /> : <BookHeart className="m-auto size-5" />}</span>)}</div><h3>{item.title}</h3><p>{item.moments.length} khoảnh khắc đã tải</p></button>)}</div>}
    {nextPage && <button type="button" disabled={loading} onClick={() => void load(nextPage)} className="secondary-button mx-auto mt-6 flex text-xs">{loading && <LoaderCircle className="size-4 animate-spin" />}{loading ? "Đang tải…" : "Tải thêm khoảnh khắc cũ"}</button>}
  </div>;
}
