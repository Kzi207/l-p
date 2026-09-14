"use client";

import { Download, Link2, LoaderCircle, Music2, Video } from "lucide-react";
import { FormEvent, useState } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";

interface TikTokResult { id: string; title: string; cover: string; videoUrl: string; musicUrl: string; author: string }

export function TikTokDownloader() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<TikTokResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setResult(null);
    if (!url.trim()) return setError("Hãy dán liên kết video TikTok.");
    setLoading(true);
    try {
      const response = await fetch("/api/tiktok", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.trim() }) });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) throw new Error("Máy chủ tải video đang phản hồi sai định dạng.");
      const data = await response.json() as TikTokResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "Chưa thể tải video.");
      setResult(data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Chưa thể tải video."); } finally { setLoading(false); }
  }

  return <main className="min-h-dvh px-4 pb-32 pt-7 sm:px-6"><section className="app-frame">
    <header className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-[#eadff2] shadow-soft"><Video className="size-6 text-[#bd6174]" /></span><div><p className="font-handwritten text-xl text-[#a56f78]">Tiện ích nhỏ gọn</p><h1 className="font-display text-3xl font-extrabold">Tải video TikTok</h1></div></header>
    <form onSubmit={submit} className="soft-card mt-6 p-4"><label className="text-sm font-bold text-[#806e65]">Liên kết TikTok</label><div className="relative mt-2"><Link2 className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#c58b96]" /><input className="input-field !pl-12" inputMode="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.tiktok.com/@.../video/..." /></div><button className="primary-button mt-3 w-full" disabled={loading}>{loading ? <LoaderCircle className="size-5 animate-spin" /> : <Download className="size-5" />}{loading ? "Đang lấy video..." : "Lấy video không logo"}</button>{error && <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}</form>
    {result && <article className="soft-card mt-5 overflow-hidden"><video className="aspect-[9/14] max-h-[62vh] w-full bg-black object-contain" poster={result.cover || undefined} src={result.videoUrl} controls playsInline preload="metadata" /><div className="p-4"><p className="text-xs font-bold text-[#b06e7a]">@{result.author}</p><h2 className="mt-1 line-clamp-2 font-bold">{result.title}</h2><div className="mt-4 grid gap-2"><a className="primary-button" href={result.videoUrl} target="_blank" rel="noopener noreferrer" download={`tiktok-${result.id}.mp4`}><Download className="size-5" />Tải video MP4</a>{result.musicUrl && <a className="secondary-button" href={result.musicUrl} target="_blank" rel="noopener noreferrer" download={`tiktok-${result.id}.mp3`}><Music2 className="size-5" />Tải âm thanh</a>}</div><p className="mt-3 text-center text-[11px] leading-4 text-[#9b887e]">Nếu video mở ở tab mới, hãy nhấn giữ video rồi chọn “Tải xuống” hoặc “Lưu vào Ảnh”. Chỉ tải nội dung bạn có quyền sử dụng.</p></div></article>}
  </section><BottomNav /></main>;
}
