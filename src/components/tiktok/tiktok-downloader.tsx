"use client";
/* eslint-disable @next/next/no-img-element */

import { Download, Images, Link2, LoaderCircle, Music2, Video } from "lucide-react";
import { FormEvent, useState } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";

interface TikTokResult { id: string; mediaType: "video" | "images"; title: string; cover: string; videoUrl: string; images: string[]; musicUrl: string; author: string }

export function TikTokDownloader() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<TikTokResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setResult(null);
    if (!url.trim()) return setError("Hãy dán liên kết bài đăng TikTok.");
    setLoading(true);
    try {
      const response = await fetch("/api/tiktok", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.trim() }) });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) throw new Error("Máy chủ tải TikTok đang phản hồi sai định dạng.");
      const data = await response.json() as TikTokResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "Chưa thể tải nội dung TikTok.");
      setResult(data);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Chưa thể tải nội dung TikTok."); } finally { setLoading(false); }
  }

  return <main className="min-h-dvh px-4 pb-32 pt-7 sm:px-6"><section className="app-frame">
    <header className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-[#eadff2] shadow-soft"><Video className="size-6 text-[#bd6174]" /></span><div><p className="font-handwritten text-xl text-[#a56f78]">Tiện ích nhỏ gọn</p><h1 className="font-display text-3xl font-extrabold">Tải TikTok</h1></div></header>
    <form onSubmit={submit} className="soft-card mt-6 p-4"><label className="text-sm font-bold text-[#806e65]">Liên kết video hoặc bài ảnh</label><div className="relative mt-2"><Link2 className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#c58b96]" /><input className="input-field !pl-12" inputMode="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Dán link TikTok vào đây..." /></div><button className="primary-button mt-3 w-full" disabled={loading}>{loading ? <LoaderCircle className="size-5 animate-spin" /> : <Download className="size-5" />}{loading ? "Đang nhận dạng..." : "Lấy ảnh hoặc video"}</button>{error && <p className="mt-3 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}</form>
    {result && <article className="soft-card mt-5 overflow-hidden">
      {result.mediaType === "video" ? <video className="aspect-[9/14] max-h-[62vh] w-full bg-black object-contain" poster={result.cover || undefined} src={result.videoUrl} controls playsInline preload="metadata" /> : <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto bg-[#f4e9e5] p-2">{result.images.map((image, index) => <div className="relative min-w-full snap-center" key={image}><img className="aspect-[9/14] max-h-[62vh] w-full rounded-2xl object-contain" src={image} alt={`Ảnh TikTok ${index + 1}`} /><span className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-xs font-bold text-white">{index + 1}/{result.images.length}</span></div>)}</div>}
      <div className="p-4"><p className="flex items-center gap-1 text-xs font-bold text-[#b06e7a]">{result.mediaType === "images" ? <Images className="size-4" /> : <Video className="size-4" />}{result.mediaType === "images" ? `${result.images.length} ảnh` : "Video"} · @{result.author}</p><h2 className="mt-1 line-clamp-2 font-bold">{result.title}</h2><div className="mt-4 grid gap-2">{result.mediaType === "video" ? <a className="primary-button" href={result.videoUrl} target="_blank" rel="noopener noreferrer" download={`tiktok-${result.id}.mp4`}><Download className="size-5" />Tải video MP4</a> : result.images.map((image, index) => <a className={index === 0 ? "primary-button" : "secondary-button"} href={image} target="_blank" rel="noopener noreferrer" download={`tiktok-${result.id}-${index + 1}.jpg`} key={image}><Download className="size-4" />Tải ảnh {index + 1}</a>)}{result.musicUrl && <a className="secondary-button" href={result.musicUrl} target="_blank" rel="noopener noreferrer" download={`tiktok-${result.id}.mp3`}><Music2 className="size-5" />Tải âm thanh</a>}</div><p className="mt-3 text-center text-[11px] leading-4 text-[#9b887e]">Nếu nội dung mở ở tab mới, hãy nhấn giữ rồi chọn “Tải xuống” hoặc “Lưu vào Ảnh”. Chỉ tải nội dung bạn có quyền sử dụng.</p></div>
    </article>}
  </section><BottomNav /></main>;
}
